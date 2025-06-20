import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import '../styles/Logs.css';

const Logs = () => {
    const [logs, setLogs] = useState({
        loginLogs: [],
        activityLogs: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('login');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                
                const [loginLogs, activityLogs] = await Promise.all([
                    adminService.getLoginLogs(),
                    adminService.getAdminLogs()
                ]);

                setLogs({
                    loginLogs,
                    activityLogs
                });
            } catch (error) {
                console.error('Error fetching logs:', error);
                setError('Failed to load logs');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    if (loading) {
        return <div className="loading">Loading logs...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="logs-page">
            <h1>System Logs</h1>

            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'login' ? 'active' : ''}`}
                    onClick={() => setActiveTab('login')}
                >
                    Login Logs
                </button>
                <button 
                    className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Activity Logs
                </button>
            </div>

            <div className="logs-container">
                {activeTab === 'login' ? (
                    <div className="log-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Admin</th>
                                    <th>Action</th>
                                    <th>Status</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.loginLogs.map((log, index) => (
                                    <tr key={index}>
                                        <td>{log.administrators?.name}</td>
                                        <td>{log.action}</td>
                                        <td>
                                            <span className={`status ${log.status}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="log-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Admin</th>
                                    <th>Action</th>
                                    <th>Details</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.activityLogs.map((log, index) => (
                                    <tr key={index}>
                                        <td>{log.administrators?.name}</td>
                                        <td>{log.action}</td>
                                        <td>{log.details}</td>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs; 