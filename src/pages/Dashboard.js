import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Button, Alert, Dropdown } from 'react-bootstrap';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { supabase, supabasePlayer } from '../services/supabase';
import ExcelJS from 'exceljs';
import { ENABLED_ATTEMPT_TABLES } from '../config/attemptTables';
import '../styles/Dashboard.css';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement
);

// ---------------------------------------------------------------------------
// Dashboard Overview
// - This file renders administrative dashboards for PASIGology.
// - It queries both the admin supabase client (`supabase`) and the
//   player-facing client (`supabasePlayer`) to produce demographics,
//   attempts-per-quiz and time-series reports.
// - Key data sources used:
//   - `profiles` (player-facing) for gender, age, created_at timeline
//   - `bakery_status`, `church_status`, `rizal_status`, `tisa_status`
//     (player-facing) for attempts per quiz
//   - `PASIGology` (legacy) and `administrators` (admin) for other stats
//
// Maintenance notes:
// - Keep heavy aggregations server-side where possible. The current
//   implementation performs lightweight client-side aggregation on
//   fetched rows to avoid adding new backend endpoints.
// - Use `supabasePlayer` when counting or reading player data to respect
//   RLS and the intended separation of keys.
// ---------------------------------------------------------------------------

// Chart options to reduce rendering load
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 0 // Disable animations for better performance
    },
    plugins: {
        legend: {
            display: false // Hide legend to reduce rendering
        }
    },
    scales: {
        x: {
            ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 10 // Limit number of ticks
            }
        },
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0 // Only show whole numbers
            }
        }
    }
};

// Add colors for each attempt table
const attemptTableColors = [
    '#FF6384', // Dimas Alang Bakery Identification
    '#36A2EB', // Dimas Alang Bakery Multiple
    '#FFCE56', // Plaza Rizal
    '#4BC0C0'  // Immaculate
];

function Dashboard() {
    // Component state overview:
    // - `stats`: legacy top-level counters and aggregated values used
    //   across several legacy cards. New player-derived metrics are
    //   stored in dedicated state (playerGenderCounts, playerAgeGroups, ...)
    // - Loading / error state fields control display of placeholders
    //   while async queries run.
    const [stats, setStats] = useState({
        totalAdmins: 0,
        activeAdmins: 0,
        systemStatus: 'Operational',
        femaleCount: 0,
        maleCount: 0,
        age1_5: 0,
        age6_12: 0,
        age13_18: 0,
        age19_25: 0,
        age25_59: 0,
        age59Plus: 0,
        quizCScore: 0,
        quizBScore: 0,
        totalPasigologyUsers: 0
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminInfo, setAdminInfo] = useState(null);
    const [attemptChartData, setAttemptChartData] = useState(null);
    const [attemptChartLoading, setAttemptChartLoading] = useState(true);
    const [attemptChartError, setAttemptChartError] = useState(null);
    // State for PASIGology time-series line chart
    const [lineRange, setLineRange] = useState('7d'); // '7d', '30d', '6m', '1y'
    const [lineChartData, setLineChartData] = useState(null);
    const [lineChartLoading, setLineChartLoading] = useState(true);
    const [lineChartError, setLineChartError] = useState(null);
    // --- Grouped Attempts Chart State and Handlers ---
    const [attemptRawData, setAttemptRawData] = useState(null);
    // Player-side reports (profiles + quiz status tables)
    const [playerGenderCounts, setPlayerGenderCounts] = useState({});
    const [playerGenderPercent, setPlayerGenderPercent] = useState({});
    const [playerAgeGroups, setPlayerAgeGroups] = useState({});
    const [playerAttemptsSummary, setPlayerAttemptsSummary] = useState(null);
    const [playerEntriesTimeline, setPlayerEntriesTimeline] = useState(null);
    const attemptChartRef = React.useRef(null);
    // --- Gender Demographics Chart Ref ---
    const genderChartRef = React.useRef(null);

    // Memoize the gender chart data
    // Data source selection:
    // - Prefer `playerGenderCounts` (derived from `profiles` via `supabasePlayer`) because
    //   it reflects the player dataset and respects RLS.
    // - Fall back to legacy `stats` values when player data is not yet available.
    const genderChartData = useMemo(() => {
        const female = playerGenderCounts.female ?? stats.femaleCount ?? 0;
        const male = playerGenderCounts.male ?? stats.maleCount ?? 0;
        return ({
            labels: ['Female', 'Male'],
            datasets: [{
                data: [female, male],
                backgroundColor: ['#FF69B4', '#4169E1']
            }]
        });
    }, [playerGenderCounts, stats.femaleCount, stats.maleCount]);

    // Memoize the age chart data
    // Age chart uses grouped age buckets derived from `profiles` when available.
    // Notes:
    // - When `playerAgeGroups` is present we dynamically use its keys as labels
    //   (eg. '18-25', '26-35'). This keeps the UI consistent with the data.
    // - Otherwise we fall back to the legacy fixed buckets stored in `stats`.
    const ageChartData = useMemo(() => {
        // If playerAgeGroups exists use its keys/values so labels reflect ranges like '18-25'
        if (playerAgeGroups && Object.keys(playerAgeGroups).length) {
            const labels = Object.keys(playerAgeGroups);
            const data = labels.map(k => playerAgeGroups[k] || 0);
            return ({
                labels,
                datasets: [{ label: 'Users', data, backgroundColor: labels.map((_,i)=>['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'][i%6]) }]
            });
        }
        const groups = {
            '1-5': stats.age1_5,
            '6-12': stats.age6_12,
            '13-18': stats.age13_18,
            '19-25': stats.age19_25,
            '26-59': stats.age25_59,
            '60+': stats.age59Plus
        };
        return ({
            labels: Object.keys(groups),
            datasets: [{
                label: 'Users',
                data: Object.values(groups),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
            }]
        });
    }, [playerAgeGroups, stats.age1_5, stats.age6_12, stats.age13_18, stats.age19_25, stats.age25_59, stats.age59Plus]);

    // Memoize the quiz chart data
    const quizChartData = useMemo(() => ({
        labels: ['Cathedral Quiz', 'Dimas Alang Bakery Quiz'],
        datasets: [{
            label: 'Total Score',
            data: [stats.quizCScore, stats.quizBScore],
            backgroundColor: ['#FFD700', '#32CD32'] // Example colors
        }]
    }), [stats.quizCScore, stats.quizBScore]);

    // Optimize data fetching with useCallback
    // fetchData performs the initial page-level queries. Implementation notes:
    // - Uses both admin `supabase` and player `supabasePlayer` for counts/data.
    // - Runs multiple queries in parallel with Promise.all to reduce latency.
    // - Aggregation is intentionally lightweight and done client-side here.
    //   For large datasets consider pushing aggregation to Postgres or a server
    //   endpoint to reduce network transfer and memory usage in the browser.
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [admins, demographics, ageData, quizData, profilesCountRes] = await Promise.all([
                supabase.from('administrators').select('*'),
                supabase.from('PASIGology').select('gender'),
                supabase.from('PASIGology').select('age'),
                supabase.from('PASIGology').select('scorecquiz,scorebquiz'),
                // Count total players from the player client `profiles` table
                supabasePlayer.from('profiles').select('id', { count: 'exact', head: true })
            ]);

            // Debug profiles count response
            console.log('profilesCountRes:', profilesCountRes);

            // Process data in a single state update
            setStats(prevStats => ({
                ...prevStats,
                totalAdmins: admins.data?.length || 0,
                activeAdmins: admins.data?.filter(admin => admin.status === 'active').length || 0,
                femaleCount: demographics.data?.filter(item => item.gender === 'iha').length || 0,
                maleCount: demographics.data?.filter(item => item.gender === 'iho').length || 0,
                ...processAgeData(ageData.data || []),
                ...processQuizData(quizData.data || []),
                totalPasigologyUsers: (profilesCountRes && profilesCountRes.count) ? profilesCountRes.count : 0
            }));

        } catch (err) {
            console.error('Dashboard initialization failed:', err);
            setError('Failed to load dashboard data. Please try refreshing the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Helper: processAgeData
    // - Input: array of objects with an `age` property (string or number)
    // - Output: counts bucketed into the UI age groups used by the charts
    // This function tolerates invalid/missing ages and skips them.
    const processAgeData = (data) => {
        const ageCounts = {
            age1_5: 0,
            age6_12: 0,
            age13_18: 0,
            age19_25: 0,
            age25_59: 0,
            age59Plus: 0
            
        };

        data.forEach(item => {
            const age = parseInt(item.age, 10);
            if (isNaN(age)) return;

            if (age <= 5) ageCounts.age1_5++;
            else if (age <= 12) ageCounts.age6_12++;
            else if (age <= 18) ageCounts.age13_18++;
            else if (age <= 25) ageCounts.age19_25++;
            else if (age <= 59) ageCounts.age25_59++;
            else ageCounts.age59Plus++;
        });

        return ageCounts;
    };

    // Helper: processQuizData
    // - Aggregates legacy PASIGology quiz scores into totals used by the
    //   small legacy quiz charts. This is intentionally simple (sum of scores).
    // - If you need averages or more advanced metrics, compute them here
    //   (or better yet, in a server-side query for large datasets).
    const processQuizData = (data) => {
        let quizCScore = 0;
        let quizBScore = 0;

        data.forEach(item => {
            quizCScore += item.scorecquiz || 0;
            quizBScore += item.scorebquiz || 0;
        });

        return { quizCScore, quizBScore };
    };

    // Utility: downloadCSV
    // - Simple client-side CSV download helper used by multiple report buttons.
    // - Accepts a data URI (`data:text/csv;...`) and a filename.
    // - For large exports prefer generating files server-side or using streams.
    function downloadCSV(csvContent, filename) {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Download helpers for specific reports
    // These prefer player-derived aggregates (`playerGenderCounts`, `playerAgeGroups`)
    // when available so the exported files match what the charts display.
    const downloadGenderReport = () => {
        const counts = (playerGenderCounts && Object.keys(playerGenderCounts).length) ? playerGenderCounts : { female: stats.femaleCount, male: stats.maleCount };
        const csvContent = "data:text/csv;charset=utf-8," + "Gender,Count,Percent\n";
        const total = Object.values(counts).reduce((a,b) => a + (b || 0), 0) || 1;
        let body = '';
        Object.keys(counts).forEach(k => {
            const c = counts[k] || 0;
            const p = Math.round((c/total)*10000)/100;
            body += `${k},${c},${p}%\n`;
        });
        downloadCSV(csvContent + body, 'gender_demographics.csv');
    };

    const downloadAgeReport = () => {
        const groups = (playerAgeGroups && Object.keys(playerAgeGroups).length) ? playerAgeGroups : {
            '1-5': stats.age1_5,
            '6-12': stats.age6_12,
            '13-18': stats.age13_18,
            '19-25': stats.age19_25,
            '26-59': stats.age25_59,
            '60+': stats.age59Plus
        };
        const csvHeader = 'data:text/csv;charset=utf-8,Age Group,Count\n';
        let body = '';
        Object.keys(groups).forEach(k => { body += `${k},${groups[k] || 0}\n`; });
        downloadCSV(csvHeader + body, 'age_demographics.csv');
    };

    // Download PASIGology Entries Over Time report
    const downloadPasigologyTimeSeriesReport = () => {
        if (!lineChartData) return;
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Date,Entries per Day\n';
        lineChartData.labels.forEach((label, idx) => {
            csvContent += `${label},${lineChartData.datasets[0].data[idx]}\n`;
        });
        downloadCSV(csvContent, 'pasigology_entries_over_time.csv');
    };

    // Download Grouped Attempts by Table report
    const downloadGroupedAttemptsReport = () => {
        if (!attemptChartData) return;
        let csvContent = 'data:text/csv;charset=utf-8,';
        // Header
        csvContent += 'Attempt';
        attemptChartData.datasets.forEach(ds => {
            csvContent += `,${ds.label} (Avg Score)`;
        });
        csvContent += '\n';
        // Rows
        attemptChartData.labels.forEach((label, idx) => {
            csvContent += label;
            attemptChartData.datasets.forEach(ds => {
                csvContent += `,${ds.data[idx]}`;
            });
            csvContent += '\n';
        });
        downloadCSV(csvContent, 'grouped_attempts_by_table.csv');
    };

    // Download raw attempt scores as CSV (all user scores per attempt per table)
    const downloadGroupedAttemptsRawCSV = () => {
        if (!attemptRawData) return;
        let csvContent = 'data:text/csv;charset=utf-8,';
        // Header
        csvContent += 'Table,User Name,Attempt 1,Attempt 2,Attempt 3,Attempt 4,Attempt 5+\n';
        attemptRawData.forEach(table => {
            table.rows.forEach(row => {
                csvContent += `${table.label},${row.user_name || ''},${row.attempt1_score ?? ''},${row.attempt2_score ?? ''},${row.attempt3_score ?? ''},${row.attempt4_score ?? ''},${row.attempt5_score ?? ''}\n`;
            });
        });
        downloadCSV(csvContent, 'grouped_attempts_raw_scores.csv');
    };

    // Download chart as PNG
    const downloadAttemptChartPNG = () => {
        if (!attemptChartRef.current) return;
        const chart = attemptChartRef.current;
        // Chart.js v4: chart is a ChartJS instance, get canvas
        const canvas = chart.canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = 'grouped_attempts_chart.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download Gender Demographics as PNG
    const downloadGenderChartPNG = () => {
        if (!genderChartRef.current) return;
        const chart = genderChartRef.current;
        const canvas = chart.canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = 'gender_demographics_chart.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download Age Demographics as PNG
    const ageChartRef = React.useRef(null);
    const downloadAgeChartPNG = () => {
        if (!ageChartRef.current) return;
        const chart = ageChartRef.current;
        const canvas = chart.canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = 'age_demographics_chart.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Download all reports (gender, age, profiles time-series, grouped attempts)
    // - Builds an Excel workbook client-side with multiple sheets.
    // - Uses `profiles` (player) for raw rows and summaries when available.
    // - Excel generation happens in-browser via ExcelJS; for very large
    //   exports prefer server-side generation to avoid memory/timeout issues.
    const downloadAllReports = () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        // Build an Excel workbook in the browser using ExcelJS
        const buildAndDownloadExcel = async () => {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'PASIGology Admin (Dashboard)';
            workbook.created = new Date();

            // Gender sheet
            const genderSheet = workbook.addWorksheet('Gender Demographics');
            genderSheet.addRow(['Gender', 'Count']);
            genderSheet.addRow(['Female', stats.femaleCount]);
            genderSheet.addRow(['Male', stats.maleCount]);
            genderSheet.addRow([]);
            genderSheet.addRow(['Total', stats.femaleCount + stats.maleCount]);

            // Age sheet
            const ageSheet = workbook.addWorksheet('Age Demographics');
            ageSheet.addRow(['Age Group', 'Count']);
            ageSheet.addRow(['1-5', stats.age1_5]);
            ageSheet.addRow(['6-12', stats.age6_12]);
            ageSheet.addRow(['13-18', stats.age13_18]);
            ageSheet.addRow(['19-25', stats.age19_25]);
            ageSheet.addRow(['26-59', stats.age25_59]);
            ageSheet.addRow(['60+', stats.age59Plus]);

            // Attempts averages sheet
            if (attemptChartData) {
                const attemptsSheet = workbook.addWorksheet('Attempts Per Quiz');
                attemptsSheet.addRow(['Attempt'].concat(attemptChartData.datasets.map(ds => ds.label)));
                attemptChartData.labels.forEach((label, idx) => {
                    const row = [label];
                    attemptChartData.datasets.forEach(ds => row.push(ds.data[idx]));
                    attemptsSheet.addRow(row);
                });
            }

            // Attempts raw sheet
            if (attemptRawData) {
                const rawAttempts = workbook.addWorksheet('Attempts (Raw)');
                rawAttempts.addRow(['Table', 'User Name', 'Attempt 1', 'Attempt 2', 'Attempt 3', 'Attempt 4', 'Attempt 5+']);
                attemptRawData.forEach(table => {
                    table.rows.forEach(row => {
                        rawAttempts.addRow([table.label, row.user_name || '', row.attempt1_score ?? '', row.attempt2_score ?? '', row.attempt3_score ?? '', row.attempt4_score ?? '', row.attempt5_score ?? '']);
                    });
                });
            }

            // Entries over time
            if (lineChartData) {
                const timeSheet = workbook.addWorksheet('Entries Over Time');
                timeSheet.addRow(['Date', 'Count']);
                lineChartData.labels.forEach((label, idx) => {
                    timeSheet.addRow([label, lineChartData.datasets[0].data[idx]]);
                });
            }

            // Optionally fetch and include raw PASIGology rows (small paginated fetch)
            try {
                const profilesRes = await supabasePlayer.from('profiles').select('id,email,gender,age,created_at').limit(10000);
                if (profilesRes.data) {
                    const rawSheet = workbook.addWorksheet('Profiles (Raw)');
                    rawSheet.addRow(['id', 'email', 'gender', 'age', 'created_at']);
                    profilesRes.data.forEach(p => rawSheet.addRow([p.id, p.email || '', p.gender || '', p.age || '', p.created_at || '']));
                }
            } catch (err) {
                // ignore — workbook will still download without raw profiles
                console.warn('Failed to include profiles raw rows in report:', err);
            }

            // Generate and trigger download (browser)
            const buf = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pasigology_report_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        };

        buildAndDownloadExcel().catch(err => console.error('Excel export failed:', err));
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const loadAdminInfo = () => {
            try {
                const storedInfo = localStorage.getItem('adminInfo');
                if (storedInfo) {
                    setAdminInfo(JSON.parse(storedInfo));
                }
            } catch (error) {
                console.error('Error loading admin info:', error);
            }
        };

        loadAdminInfo();
    }, []);

    // Fetch grouped attempt data for grouped bar chart
    // Implementation notes:
    // - Queries player-side status tables (bakery_status, church_status, rizal_status, tisa_status)
    //   using `supabasePlayer` so RLS and player anon keys are used.
    // - For each table we compute total attempts and average attempts per user.
    // - We intentionally do lightweight summarization in the client; if tables grow
    //   very large, consider server-side aggregation or a paginated approach.
    useEffect(() => {
        const fetchAttemptData = async () => {
            setAttemptChartLoading(true);
            setAttemptChartError(null);
            try {
                // Query the player-side status tables specified in the request
                const quizTables = [
                    { name: 'bakery_status', label: 'Bakery Quiz' },
                    { name: 'church_status', label: 'Church Quiz' },
                    { name: 'rizal_status', label: 'Rizal Quiz' },
                    { name: 'tisa_status', label: 'Tisa Quiz' }
                ];

                // Fetch all tables in parallel using the player client
                const results = await Promise.all(
                    quizTables.map(t => supabasePlayer.from(t.name).select('attempt_1,attempt_2,attempt_3,attempt_4,attempt_5'))
                );

                // Keep only valid tables (skip 404s)
                const valid = results.map((res, idx) => ({ table: quizTables[idx], res }))
                    .filter(({ res }) => !(res && res.error && res.status === 404));

                if (valid.length === 0) {
                    setAttemptRawData(null);
                    setAttemptChartData(null);
                    setAttemptChartLoading(false);
                    return;
                }

                // Summarize attempts per table
                const totalAttemptsPerTable = [];
                const avgAttemptsPerUser = [];
                const rawData = [];

                valid.forEach(({ table, res }, idx) => {
                    const rows = res.data || [];
                    // For each attempt column count truthy / numeric sum
                    const attemptCols = ['attempt_1','attempt_2','attempt_3','attempt_4','attempt_5'];
                    const colCounts = attemptCols.map(col => {
                        // If numeric values present, sum them; otherwise count truthy entries
                        const numericVals = rows.map(r => {
                            const v = r[col];
                            return (v === null || v === undefined || v === '') ? null : (typeof v === 'number' ? v : (isNaN(Number(v)) ? null : Number(v)));
                        }).filter(v => v !== null);
                        if (numericVals.length > 0) return numericVals.reduce((a,b) => a+b, 0);
                        // fallback to counting truthy/non-empty values
                        return rows.filter(r => r[col] !== null && r[col] !== undefined && r[col] !== '').length;
                    });
                    const totalAttempts = colCounts.reduce((a,b) => a + b, 0);
                    const avgPerUser = rows.length ? Math.round((totalAttempts / rows.length) * 100) / 100 : 0;

                    totalAttemptsPerTable.push(totalAttempts);
                    avgAttemptsPerUser.push(avgPerUser);
                    rawData.push({ label: table.label, rows });
                });

                setAttemptRawData(rawData);
                setAttemptChartData({
                    labels: valid.map(v => v.table.label),
                    datasets: [
                        { label: 'Total Attempts', data: totalAttemptsPerTable, backgroundColor: '#36A2EB' },
                        { label: 'Avg Attempts per User', data: avgAttemptsPerUser, backgroundColor: '#FF6384' }
                    ]
                });
                setPlayerAttemptsSummary({ tables: valid.map((v, i) => ({ label: v.table.label, total: totalAttemptsPerTable[i], avgPerUser: avgAttemptsPerUser[i] })) });
            } catch (err) {
                setAttemptChartError('Failed to load attempt chart data.');
            } finally {
                setAttemptChartLoading(false);
            }
        };
        fetchAttemptData();
    }, []);

    // Fetch player profiles to compute gender/age distributions
    // Notes:
    // - We normalize several possible gender encodings (e.g. 'iha','iho', 'f','m')
    //   to 'female' / 'male' to make the UI consistent.
    // - Age values are parsed to integers; invalid values are bucketed as 'unknown'.
    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const { data, error } = await supabasePlayer.from('profiles').select('gender,age');
                if (error) {
                    console.warn('profiles fetch error:', error);
                    return;
                }
                const rows = data || [];
                // Gender counts
                const genderCounts = rows.reduce((acc, r) => {
                    const g = (r.gender || 'unknown').toString().toLowerCase();
                    if (g === 'female' || g === 'f' || g === 'iha') acc.female = (acc.female || 0) + 1;
                    else if (g === 'male' || g === 'm' || g === 'iho') acc.male = (acc.male || 0) + 1;
                    else acc.unknown = (acc.unknown || 0) + 1;
                    return acc;
                }, {});
                const total = rows.length || 1;
                const perc = {
                    female: Math.round(((genderCounts.female || 0) / total) * 10000) / 100,
                    male: Math.round(((genderCounts.male || 0) / total) * 10000) / 100,
                    unknown: Math.round(((genderCounts.unknown || 0) / total) * 10000) / 100
                };
                setPlayerGenderCounts({ female: genderCounts.female || 0, male: genderCounts.male || 0, unknown: genderCounts.unknown || 0 });
                setPlayerGenderPercent(perc);

                // Age grouping: use typical adult buckets (you can adapt later)
                const ageGroups = rows.reduce((acc, r) => {
                    const age = parseInt(r.age, 10);
                    if (isNaN(age)) { acc.unknown = (acc.unknown || 0) + 1; return acc; }
                    if (age < 18) acc['<18'] = (acc['<18'] || 0) + 1;
                    else if (age <= 25) acc['18-25'] = (acc['18-25'] || 0) + 1;
                    else if (age <= 35) acc['26-35'] = (acc['26-35'] || 0) + 1;
                    else if (age <= 45) acc['36-45'] = (acc['36-45'] || 0) + 1;
                    else if (age <= 59) acc['46-59'] = (acc['46-59'] || 0) + 1;
                    else acc['60+'] = (acc['60+'] || 0) + 1;
                    return acc;
                }, {});
                setPlayerAgeGroups(ageGroups);
            } catch (err) {
                console.error('Failed to fetch profiles for demographics:', err);
            }
        };
        fetchProfiles();
    }, []);

    // Helper: getRangeStartDate
    // - Returns a Date object representing the earliest date to include
    //   based on a short identifier (7d, 30d, 6m, 1y). Used for time-series queries.
    // - Note: this mutates a copy of `now` to compute the start date.
    const getRangeStartDate = (range) => {
        const now = new Date();
        switch (range) {
            case '7d':
                return new Date(now.setDate(now.getDate() - 6)); // last 7 days including today
            case '30d':
                return new Date(now.setDate(now.getDate() - 29));
            case '6m':
                return new Date(now.setMonth(now.getMonth() - 5));
            case '1y':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(now.setDate(now.getDate() - 6));
        }
    };

    // Fetch profiles time-series data when filter changes (use player profiles)
    useEffect(() => {
        const fetchLineChartData = async () => {
            setLineChartLoading(true);
            setLineChartError(null);
            try {
                const startDate = getRangeStartDate(lineRange);
                // Format date as YYYY-MM-DD for Supabase
                const isoStart = startDate.toISOString().split('T')[0];
                // Fetch created_at values from profiles using player client
                const { data, error } = await supabasePlayer
                    .from('profiles')
                    .select('created_at')
                    .gte('created_at', isoStart);
                if (error) throw error;
                // Count entries per day
                const counts = {};
                (data || []).forEach(row => {
                    if (!row || !row.created_at) return;
                    const day = row.created_at.split('T')[0];
                    counts[day] = (counts[day] || 0) + 1;
                });
                // Fill missing days with 0
                const days = [];
                const now = new Date();
                let d = new Date(startDate);
                while (d <= now) {
                    const dayStr = d.toISOString().split('T')[0];
                    days.push(dayStr);
                    d.setDate(d.getDate() + 1);
                }
                const chartData = {
                    labels: days,
                    datasets: [{
                        label: 'Entries per Day',
                        data: days.map(day => counts[day] || 0),
                        fill: false,
                        borderColor: '#36A2EB',
                        backgroundColor: '#36A2EB',
                        tension: 0.3, // smooth line
                        pointRadius: 3
                    }]
                };
                setLineChartData(chartData);
                setPlayerEntriesTimeline(chartData);
            } catch (err) {
                setLineChartError('Failed to load profiles time-series data.');
            } finally {
                setLineChartLoading(false);
            }
        };
        fetchLineChartData();
    }, [lineRange]);

    if (loading) {
        return (
            <div className="dashboard-container">
                <Alert variant="info">Loading dashboard data...</Alert>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <Alert variant="danger">{error}</Alert>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Dashboard</h1>
                    {adminInfo && (
                        <div className="admin-name">
                            Welcome, {adminInfo.name || adminInfo.email.split('@')[0]}
                        </div>
                    )}
                </div>

            </div>


            <Row>
                <Col md={3}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5>Total Administrators</h5>
                            <h2>{stats.totalAdmins}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5>Total Players</h5>
                            <h2>{stats.totalPasigologyUsers}</h2>
                        </Card.Body>
                    </Card>
                </Col>

           <Col>                
            <div className="d-flex justify-content-end">
                    <button className="action-button" onClick={() => window.print()}>
                        Download Report PDF
                    </button>
                </div></Col>

                <Col>

                    <div className="d-flex justify-content-end">
                        <Dropdown>
                            <Dropdown.Toggle variant="primary" id="download-all">
                                Download All Reports
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={downloadAllReports}>
                                    Download All Reports
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={downloadGenderReport}>
                                    Gender Demographics
                                </Dropdown.Item>
                                <Dropdown.Item onClick={downloadAgeReport}>
                                    Age Demographics
                                </Dropdown.Item>
                                <Dropdown.Item onClick={downloadPasigologyTimeSeriesReport}>
                                    PASIGology Entries Over Time
                                </Dropdown.Item>
                                <Dropdown.Item onClick={downloadGroupedAttemptsReport}>
                                    Grouped Attempts by Table
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>


                    </div>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5>Gender Demographics</h5>
                                <div>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        className="me-2"
                                        onClick={downloadGenderReport}
                                    >
                                        Download CSV
                                    </Button>
                                    <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        onClick={downloadGenderChartPNG}
                                    >
                                        Download PNG
                                    </Button>
                                </div>
                            </div>
                            <div style={{ height: '300px' }}>
                                <Pie ref={genderChartRef} data={genderChartData} options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        legend: { display: true, position: 'bottom' }, // Show legend
                                        title: { display: true, text: 'Gender Demographics' } // Add chart title
                                    }
                                }} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="mb-4">
                        
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Age Demographics</h5>
                                <div>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        className="me-2"
                                        onClick={downloadAgeReport}
                                    >
                                        Download CSV
                                    </Button>
                                    <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        onClick={downloadAgeChartPNG}
                                    >
                                        Download PNG
                                    </Button>
                                </div>
                            </div>
                            <div style={{ height: '300px' }}>
                                <Bar
                                    ref={ageChartRef}
                                    data={ageChartData}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            legend: { display: true, position: 'bottom' },
                                            title: { display: true, text: 'Age Demographics' }
                                        },
                                        scales: {
                                            ...chartOptions.scales,
                                            x: {
                                                ...chartOptions.scales.x,
                                                title: { display: true, text: 'Age Group' }
                                            },
                                            y: {
                                                ...chartOptions.scales.y,
                                                title: { display: true, text: 'Users' }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col md={12}>
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Attempts per Quiz (Average Score per Attempt)</h5>
                                <div>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        className="me-2"
                                        onClick={downloadGroupedAttemptsReport}
                                    >
                                        Download CSV (Averages)
                                    </Button>
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm"
                                        className="me-2"
                                        onClick={downloadGroupedAttemptsRawCSV}
                                    >
                                        Download CSV (Raw Scores)
                                    </Button>
                                    <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        onClick={downloadAttemptChartPNG}
                                    >
                                        Download Chart as PNG
                                    </Button>
                                </div>
                            </div>
                            <div style={{ height: '350px' }}>
                                {attemptChartLoading ? (
                                    <Alert variant="info">Loading attempt chart...</Alert>
                                ) : attemptChartError ? (
                                    <Alert variant="danger">{attemptChartError}</Alert>
                                ) : attemptChartData ? (
                                    <Bar
                                        ref={attemptChartRef}
                                        data={attemptChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: true, position: 'top' },
                                                title: { display: true, text: 'Average Score per Attempt (by Table)' }
                                            },
                                            scales: {
                                                x: {
                                                    title: { display: true, text: 'Attempts' },
                                                    stacked: false
                                                },
                                                y: {
                                                    title: { display: true, text: 'Average Score' },
                                                    beginAtZero: true,
                                                    precision: 0
                                                }
                                            },
                                            categoryPercentage: 0.6,
                                            barPercentage: 0.8
                                        }}
                                    />
                                ) : null}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* PASIGology Time-Series Line Chart */}
            <Row>
                <Col md={12}>
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>PASIGology Entries Over Time</h5>
                                {/* Filter controls for time range */}
                                <div>
                                    <Button
                                        variant={lineRange === '7d' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        className="me-1"
                                        onClick={() => setLineRange('7d')}
                                    >
                                        Last 7 Days
                                    </Button>
                                    <Button
                                        variant={lineRange === '30d' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        className="me-1"
                                        onClick={() => setLineRange('30d')}
                                    >
                                        Last 30 Days
                                    </Button>
                                    <Button
                                        variant={lineRange === '6m' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        className="me-1"
                                        onClick={() => setLineRange('6m')}
                                    >
                                        Last 6 Months
                                    </Button>
                                    <Button
                                        variant={lineRange === '1y' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setLineRange('1y')}
                                    >
                                        Last 1 Year
                                    </Button>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="ms-2"
                                        onClick={downloadPasigologyTimeSeriesReport}
                                    >
                                        Download Report
                                    </Button>
                                </div>
                            </div>
                            <div style={{ height: '350px' }}>
                                {lineChartLoading ? (
                                    <Alert variant="info">Loading PASIGology time-series data...</Alert>
                                ) : lineChartError ? (
                                    <Alert variant="danger">{lineChartError}</Alert>
                                ) : lineChartData ? (
                                    <Line
                                        data={lineChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            animation: { duration: 800, easing: 'easeInOutQuart' },
                                            plugins: {
                                                legend: { display: true, position: 'top' },
                                                tooltip: { enabled: true },
                                                title: { display: true, text: 'PASIGology Entries per Day' }
                                            },
                                            scales: {
                                                x: {
                                                    title: { display: true, text: 'Date' },
                                                    type: 'category',
                                                    ticks: { autoSkip: true, maxTicksLimit: 14 }
                                                },
                                                y: {
                                                    title: { display: true, text: 'Number of Entries' },
                                                    beginAtZero: true,
                                                    precision: 0
                                                }
                                            }
                                        }}
                                    />
                                ) : null}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default Dashboard;
