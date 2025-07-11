import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Button, Alert, Dropdown } from 'react-bootstrap';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { supabase } from '../services/supabase';
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
    const attemptChartRef = React.useRef(null);
    // --- Gender Demographics Chart Ref ---
    const genderChartRef = React.useRef(null);

    // Memoize the gender chart data
    const genderChartData = useMemo(() => ({
        labels: ['Female', 'Male'],
        datasets: [{
            data: [stats.femaleCount, stats.maleCount],
            backgroundColor: ['#FF69B4', '#4169E1']
        }]
    }), [stats.femaleCount, stats.maleCount]);

    // Memoize the age chart data
    const ageChartData = useMemo(() => ({
        labels: ['1-5', '6-12', '13-18', '19-25', '26-59', '60+'],
        datasets: [{
            label: 'Users',
            data: [
                stats.age1_5,
                stats.age6_12,
                stats.age13_18,
                stats.age19_25,
                stats.age25_59,
                stats.age59Plus
            ],
            backgroundColor: [
                '#FF6384', // 1-5
                '#36A2EB', // 6-12
                '#FFCE56', // 13-18
                '#4BC0C0', // 19-25
                '#9966FF', // 26-59
                '#FF9F40'  // 60+
            ]
        }]
    }), [stats.age1_5, stats.age6_12, stats.age13_18, stats.age19_25, stats.age25_59, stats.age59Plus]);

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
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [admins, demographics, ageData, quizData, pasigologyUsers] = await Promise.all([
                supabase.from('administrators').select('*'),
                supabase.from('PASIGology').select('gender'),
                supabase.from('PASIGology').select('age'),
                supabase.from('PASIGology').select('scorecquiz,scorebquiz'),
                supabase.from('PASIGology').select('count', { count: 'exact', head: true })
            ]);

            // Debug pasigologyUsers
            console.log('pasigologyUsers:', pasigologyUsers);

            // Process data in a single state update
            setStats(prevStats => ({
                ...prevStats,
                totalAdmins: admins.data?.length || 0,
                activeAdmins: admins.data?.filter(admin => admin.status === 'active').length || 0,
                femaleCount: demographics.data?.filter(item => item.gender === 'iha').length || 0,
                maleCount: demographics.data?.filter(item => item.gender === 'iho').length || 0,
                ...processAgeData(ageData.data || []),
                ...processQuizData(quizData.data || []),
                totalPasigologyUsers: pasigologyUsers.count || 0
            }));

        } catch (err) {
            console.error('Dashboard initialization failed:', err);
            setError('Failed to load dashboard data. Please try refreshing the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Helper function to process age data
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

    // New helper function to process quiz data
    const processQuizData = (data) => {
        let quizCScore = 0;
        let quizBScore = 0;

        data.forEach(item => {
            quizCScore += item.scorecquiz || 0;
            quizBScore += item.scorebquiz || 0;
        });

        return { quizCScore, quizBScore };
    };

    // Helper to trigger CSV download
    function downloadCSV(csvContent, filename) {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add download functions
    const downloadGenderReport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Gender,Count\n"
            + `Female,${stats.femaleCount}\n`
            + `Male,${stats.maleCount}\n`;

        downloadCSV(csvContent, 'gender_demographics.csv');
    };

    const downloadAgeReport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Age Group,Count\n"
            + `1-5,${stats.age1_5}\n`
            + `6-12,${stats.age6_12}\n`
            + `13-18,${stats.age13_18}\n`
            + `19-25,${stats.age19_25}\n`
            + `26-59,${stats.age25_59}\n`
            + `60+,${stats.age59Plus}\n`;

        downloadCSV(csvContent, 'age_demographics.csv');
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

    // Download all reports (gender, age, PASIGology time-series, grouped attempts)
    const downloadAllReports = () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        // Gender
        csvContent += 'Report: Gender Demographics\nGender,Count\n';
        csvContent += `Female,${stats.femaleCount}\n`;
        csvContent += `Male,${stats.maleCount}\n\n`;
        // Age
        csvContent += 'Report: Age Demographics\nAge Group,Count\n';
        csvContent += `1-5,${stats.age1_5}\n`;
        csvContent += `6-12,${stats.age6_12}\n`;
        csvContent += `13-18,${stats.age13_18}\n`;
        csvContent += `19-25,${stats.age19_25}\n`;
        csvContent += `26-59,${stats.age25_59}\n`;
        csvContent += `60+,${stats.age59Plus}\n\n`;
        // PASIGology Entries Over Time
        if (lineChartData) {
            csvContent += 'Report: PASIGology Entries Over Time\nDate,Entries per Day\n';
            lineChartData.labels.forEach((label, idx) => {
                csvContent += `${label},${lineChartData.datasets[0].data[idx]}\n`;
            });
            csvContent += '\n';
        }
        // Grouped Attempts by Table (Averages)
        if (attemptChartData) {
            csvContent += 'Report: Grouped Attempts by Table (Averages)\nAttempt';
            attemptChartData.datasets.forEach(ds => {
                csvContent += `,${ds.label} (Avg Score)`;
            });
            csvContent += '\n';
            attemptChartData.labels.forEach((label, idx) => {
                csvContent += label;
                attemptChartData.datasets.forEach(ds => {
                    csvContent += `,${ds.data[idx]}`;
                });
                csvContent += '\n';
            });
            csvContent += '\n';
        }
        // Grouped Attempts by Table (Raw Scores)
        if (attemptRawData) {
            csvContent += 'Report: Grouped Attempts by Table (Raw Scores)\nTable,User Name,Attempt 1,Attempt 2,Attempt 3,Attempt 4,Attempt 5+\n';
            attemptRawData.forEach(table => {
                table.rows.forEach(row => {
                    csvContent += `${table.label},${row.user_name || ''},${row.attempt1_score ?? ''},${row.attempt2_score ?? ''},${row.attempt3_score ?? ''},${row.attempt4_score ?? ''},${row.attempt5_score ?? ''}\n`;
                });
            });
            csvContent += '\n';
        }
        downloadCSV(csvContent, 'all_demographics_report.csv');
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
    useEffect(() => {
        const fetchAttemptData = async () => {
            setAttemptChartLoading(true);
            setAttemptChartError(null);
            try {
                // Table names and labels
                const tables = [
                    { name: 'attempt_dimas_alangbakery_identification_scores', label: 'Dimas Alang Bakery Identification' },
                    { name: 'attempt_dimas_alangbakery_multiple_scores', label: 'Dimas Alang Bakery Multiple' },
                    { name: 'attempt_plazarizal_scores', label: 'Plaza Rizal' },
                    { name: 'attempt_immaculate_scores', label: 'Immaculate' }
                ];
                // Fetch all tables in parallel
                const results = await Promise.all(
                    tables.map(t =>
                        supabase.from(t.name).select('user_name, attempt1_score, attempt2_score, attempt3_score, attempt4_score, attempt5_score')
                    )
                );
                // For each table, collect scores per attempt (array of arrays)
                const datasets = results.map((res, idx) => {
                    // For each attempt, collect all scores (not just count)
                    const data = [1,2,3,4,5].map(attemptNum => {
                        // Get all scores for this attempt (filter out null/undefined)
                        const scores = res.data ? res.data.map(row => row[`attempt${attemptNum}_score`]).filter(s => s !== null && s !== undefined) : [];
                        // For chart, show average score (or 0 if none)
                        if (scores.length === 0) return 0;
                        const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
                        return Math.round(avg * 100) / 100; // round to 2 decimals
                    });
                    return {
                        label: tables[idx].label,
                        data,
                        backgroundColor: attemptTableColors[idx],
                    };
                });
                // For CSV export, keep the raw scores
                const rawData = results.map((res, idx) => ({
                    label: tables[idx].label,
                    rows: res.data || []
                }));
                setAttemptRawData(rawData);
                setAttemptChartData({
                    labels: ['Attempt 1', 'Attempt 2', 'Attempt 3', 'Attempt 4', 'Attempt 5+'],
                    datasets
                });
            } catch (err) {
                setAttemptChartError('Failed to load attempt chart data.');
            } finally {
                setAttemptChartLoading(false);
            }
        };
        fetchAttemptData();
    }, []);

    // Helper to get date range for Supabase query
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

    // Fetch PASIGology time-series data when filter changes
    useEffect(() => {
        const fetchLineChartData = async () => {
            setLineChartLoading(true);
            setLineChartError(null);
            try {
                const startDate = getRangeStartDate(lineRange);
                // Format date as YYYY-MM-DD for Supabase
                const isoStart = startDate.toISOString().split('T')[0];
                // Fetch all entries after start date
                const { data, error } = await supabase
                    .from('PASIGology')
                    .select('created_at')
                    .gte('created_at', isoStart);
                if (error) throw error;
                // Count entries per day
                const counts = {};
                data.forEach(row => {
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
            } catch (err) {
                setLineChartError('Failed to load PASIGology time-series data.');
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
