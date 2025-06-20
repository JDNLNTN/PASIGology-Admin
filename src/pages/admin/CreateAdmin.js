import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import './CreateAdmin.css';
import { Modal, Button } from 'react-bootstrap';

const CreateAdmin = () => {
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [superAdminExists, setSuperAdminExists] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        age: '',
        role: 'super_admin'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingCredentials, setPendingCredentials] = useState(null);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    const checkSuperAdmin = async () => {
        try {
            // Check if any super admin exists in public.administrators
            const { data, error } = await supabase
                .from('administrators')
                .select('*')
                .eq('role', 'super_admin')
                .limit(1);

            if (error) {
                console.error('Error checking super admin:', error);
                throw error;
            }

            setSuperAdminExists(data && data.length > 0);
            
            if (!data || data.length === 0) {
                setMessage('No super admin found. Please create one.');
            }
        } catch (error) {
            console.error('Error checking super admin:', error);
            setMessage('System configuration error. Please contact support.');
        }
    };

    const validatePassword = (password) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        return Object.values(requirements).every(req => req === true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!validatePassword(formData.password)) {
            setMessage('Please meet all password requirements');
            return;
        }
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: formData.role
                    }
                }
            });
            if (authError) {
                throw authError;
            }
            setMessage('Admin account creation initiated. Please wait...');
            // Show confirmation modal before signing in
            setPendingCredentials({ email: formData.email, password: formData.password });
            setShowConfirmation(true);
        } catch (error) {
            let displayMessage = 'An unexpected error occurred.';
            if (error && typeof error === 'object') {
                if (error.message) {
                    displayMessage = error.message;
                } else if (error.error_description) {
                    displayMessage = error.error_description;
                } else {
                    displayMessage = JSON.stringify(error);
                }
            } else if (typeof error === 'string') {
                displayMessage = error;
            }
            if (displayMessage && displayMessage.includes('rate limit')) {
                displayMessage = 'Too many signup attempts. Please wait a few minutes before trying again.';
            } else if (displayMessage && displayMessage.includes('already registered')) {
                displayMessage = 'This email is already registered. Please use a different email.';
            }
            setMessage(displayMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSignIn = async () => {
        setShowConfirmation(false);
        setLoading(true);
        setMessage('Signing in...');
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: pendingCredentials.email,
                password: pendingCredentials.password,
            });
            if (signInError) {
                throw signInError;
            }
            setMessage('Admin created successfully and signed in!');
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.href = '/admin';
        } catch (error) {
            let displayMessage = 'An unexpected error occurred during sign in.';
            if (error && typeof error === 'object') {
                if (error.message) {
                    displayMessage = error.message;
                } else if (error.error_description) {
                    displayMessage = error.error_description;
                } else {
                    displayMessage = JSON.stringify(error);
                }
            } else if (typeof error === 'string') {
                displayMessage = error;
            }
            setMessage(displayMessage);
        } finally {
            setLoading(false);
            setPendingCredentials(null);
        }
    };

    const handleCancelSignIn = () => {
        setShowConfirmation(false);
        setPendingCredentials(null);
        setMessage('Sign in cancelled. You can sign in later from the login page.');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="row justify-content-center">
            <div className="col-lg-8">
                <div className="card">
                    <div className="card-header">
                        <h4>
                            <i className="fas fa-user-shield me-2"></i>
                            {!superAdminExists ? 'First-Time Super Admin Setup' : 'Create New Admin'}
                        </h4>
                        {superAdminExists && (
                            <button 
                                onClick={() => navigate('/admin')} 
                                className="btn btn-danger"
                            >
                                <i className="fas fa-arrow-left me-2"></i>
                                Back
                            </button>
                        )}
                    </div>
                    <div className="card-body">
    

                        {!superAdminExists && (
                            <div className="alert alert-info" role="alert">
                                <h5 className="alert-heading">
                                    <i className="fas fa-info-circle me-2"></i>
                                    Welcome to First-Time Setup!
                                </h5>
                                <p>No super administrator account was found in the system. This usually happens in two cases:</p>
                                <ul>
                                    <li>This is a fresh installation</li>
                                    <li>The super admin account was accidentally deleted or corrupted</li>
                                </ul>
                                <p>You need to create a super administrator account to proceed. This account will have full system access.</p>
                                <hr />
                                <p className="mb-0">Please fill out the form below to create your super admin account.</p>
                            </div>
                        )}

                        {message && (
                            <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                                <i className={`fas fa-${message.includes('successfully') ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                                {message}
                                <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                            <div className="mb-4">
                                <label className="form-label">
                                    <i className="fas fa-user me-2"></i>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label">
                                    <i className="fas fa-envelope me-2"></i>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label">
                                    <i className="fas fa-lock me-2"></i>
                                    Password
                                </label>
                                <div className="input-group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                    </button>
                                </div>
                            </div>
                            {/* Role selection: only show dropdown if a super admin already exists */}
                            {superAdminExists ? (
                                <div className="mb-4">
                                    <label className="form-label">
                                        <i className="fas fa-user-tag me-2"></i>
                                        Role
                                    </label>
                                    <select
                                        className="form-select"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="super_admin">Super Admin</option>
                                        <option value="content_mod">Content Moderator</option>
                                    </select>
                                </div>
                            ) : (
                                <input type="hidden" name="role" value="super_admin" />
                            )}
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Admin'}
                            </button>
                        </form>
                        {/* Confirmation Modal */}
                        <Modal show={showConfirmation} onHide={handleCancelSignIn} centered>
                            <Modal.Header closeButton>
                                <Modal.Title>Confirm Sign In</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <p>Are you sure you want to sign in as the new super admin now?</p>
                                <p>This will log you in immediately after account creation.</p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleCancelSignIn} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={handleConfirmSignIn} disabled={loading}>
                                    {loading ? 'Signing in...' : 'Confirm'}
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PasswordStrengthMeter = ({ password }) => {
    const [strength, setStrength] = useState(0);
    const [requirements, setRequirements] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    });

    useEffect(() => {
        const newRequirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),

        };

        setRequirements(newRequirements);
        const strengthValue = Object.values(newRequirements).filter(Boolean).length;
        setStrength((strengthValue / Object.keys(newRequirements).length) * 100);
    }, [password]);

    const getStrengthText = () => {
        if (strength === 0) return 'None';
        if (strength < 50) return 'Weak';
        if (strength < 75) return 'Medium';
        if (strength < 100) return 'Strong';
        return 'Very Strong';
    };

    const getStrengthClass = () => {
        if (strength === 0) return 'none';
        if (strength < 50) return 'weak';
        if (strength < 75) return 'medium';
        if (strength < 100) return 'strong';
        return 'very-strong';
    };

    return (
        <>
            <div className="password-strength-container mb-2">
                <div className="password-strength-meter">
                    <div
                        className="strength-meter-fill"
                        style={{ width: `${strength}%` }}
                    ></div>
                </div>
                <small className="text-muted d-block mt-1">
                    Password Strength: <span className={`fw-bold ${getStrengthClass()}`}>{getStrengthText()}</span>
                </small>
            </div>
            <div className="password-requirements">
                <div className="requirements-grid">
                    {Object.entries(requirements).map(([key, value]) => (
                        <div key={key} className={`requirement ${value ? 'valid' : 'invalid'}`}>
                            <i className={`fas fa-${value ? 'check' : 'times'}-circle`}></i>
                            <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default CreateAdmin; 