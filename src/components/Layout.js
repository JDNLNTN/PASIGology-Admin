import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/Layout.css';

const Layout = ({ children }) => {
    const { isLoggedIn, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role');
    const userName = localStorage.getItem('name');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="navbar">
                <div className="navbar-brand">
                    <Link to="/">Admin Panel</Link>
                </div>
                
                <div className="navbar-menu">
                    <Link to="/" className="nav-item">Dashboard</Link>
                    
                    {isSuperAdmin() && (
                        <>
                            <Link to="/admin/create" className="nav-item">Create Admin</Link>
                            <Link to="/logs" className="nav-item">Logs</Link>
                        </>
                    )}
                </div>

                <div className="navbar-end">
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        <span className="user-role">({userRole})</span>
                    </div>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {children}
            </main>

            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} Admin Panel. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Layout; 