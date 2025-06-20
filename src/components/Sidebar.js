import React, { useState } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Sidebar.css';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error.message);
        }
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/administrators', label: 'Administrators', icon: '👥' },
        { path: '/dialogue', label: 'Dialogue', icon: '💬' },
        { path: '/historical', label: 'Historical', icon: '📜' },
        { path: '/quiz', label: 'Quiz', icon: '❓' },
        { path: '/userprogress', label: 'User Progress', icon: '📈' },
        { path: '/users', label: 'Users', icon: '👤' },
        { path: '/settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <i className="fas fa-shield-alt"></i>
                    {!collapsed && <span>Admin Panel</span>}
                </div>
                <button 
                    className="toggle-btn"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
                </button>
            </div>
            <Nav className="flex-column">
                {navItems.map((item) => (
                    <Nav.Item key={item.path}>
                        <Nav.Link 
                            as={Link} 
                            to={item.path}
                            className={location.pathname === item.path ? 'active' : ''}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                        </Nav.Link>
                    </Nav.Item>
                ))}
                <Nav.Item>
                    <Nav.Link onClick={handleLogout} className="logout-link">
                        <span className="nav-icon">👋</span>
                        {!collapsed && <span>Logout</span>}
                    </Nav.Link>
                </Nav.Item>
            </Nav>
        </div>
    );
};

export default Sidebar; 