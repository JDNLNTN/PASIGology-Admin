import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Button, Alert, Dropdown } from 'react-bootstrap';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { supabase } from '../services/supabase';
import '../styles/Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
            backgroundColor: '#4169E1'
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

    const downloadQuizReport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Report: Quiz Taken\n"
            + "Quiz,Score\n"
            + `Quiz C,${stats.quizCScore}\n`
            + `Quiz B,${stats.quizBScore}\n`;

        downloadCSV(csvContent, 'quiz_taken_report.csv');
    };

    const downloadAllReports = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Report: Gender Demographics\n"
            + "Gender,Count\n"
            + `Female,${stats.femaleCount}\n`
            + `Male,${stats.maleCount}\n\n`
            + "Report: Age Demographics\n"
            + "Age Group,Count\n"
            + `1-5,${stats.age1_5}\n`
            + `6-12,${stats.age6_12}\n`
            + `13-18,${stats.age13_18}\n`
            + `19-25,${stats.age19_25}\n`
            + `26-59,${stats.age25_59}\n`
            + `60+,${stats.age59Plus}\n\n`
            + "Report: Quiz Taken\n"
            + "Quiz,Score\n"
            + `Quiz C,${stats.quizCScore}\n`
            + `Quiz B,${stats.quizBScore}\n`;

        downloadCSV(csvContent, 'all_demographics_report.csv');
    };

    const downloadCSV = (content, filename) => {
        const encodedUri = encodeURI(content);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                <div className="header-actions">
                    <button className="action-button" onClick={() => window.print()}>
                        Download Report
                    </button>
                </div>
            </div>
            
            <div className="dashboard-content">
                <div className="dashboard-card">
                    <h3>Quick Stats</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <h4>Total Users</h4>
                            <p>{stats.totalPasigologyUsers}</p>
                        </div>
                        <div className="stat-item">
                            <h4>Active Sessions</h4>
                            <p>{stats.activeAdmins}</p>
                        </div>
                        <div className="stat-item">
                            <h4>Total Quizzes</h4>
                            <p>0</p>
                        </div>
                        <div className="stat-item">
                            <h4>Total Dialogues</h4>
                            <p>0</p>
                        </div>
                    </div>
                </div>
            </div>

            <Row className="mb-3">
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
                                <Dropdown.Item onClick={downloadQuizReport}>
                                    Quiz Taken Report
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </Col>
            </Row>

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
                            <h5>Active Administrators</h5>
                            <h2>{stats.activeAdmins}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="mb-4">
                        <Card.Body>
                            <h5>System Status</h5>
                            <h2>{stats.systemStatus}</h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Gender Demographics</h5>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={downloadGenderReport}
                                >
                                    Download Report
                                </Button>
                            </div>
                            <div style={{ height: '300px' }}>
                                <Pie data={genderChartData} options={chartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="mb-4">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Age Demographics</h5>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={downloadAgeReport}
                                >
                                    Download Report
                                </Button>
                            </div>
                            <div style={{ height: '300px' }}>
                                <Bar data={ageChartData} options={chartOptions} />
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
                                <h5>Quiz Taken</h5>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={downloadQuizReport}
                                >
                                    Download Report
                                </Button>
                            </div>
                            <div style={{ height: '400px' }}>
                                <Bar data={quizChartData} options={chartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default Dashboard; 