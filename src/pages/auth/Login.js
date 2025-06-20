import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { supabase } from '../../services/supabase';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Login: Starting login process...');
            
            // Sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                console.error('Login: Auth error:', authError);
                throw authError;
            }

            // Check if user exists in administrators table
            const { data: adminData, error: adminError } = await supabase
                .from('administrators')
                .select('*')
                .eq('email', email)
                .single();

            if (adminError || !adminData) {
                console.error('Login: No admin profile found');
                await supabase.auth.signOut();
                throw new Error('No administrator profile found');
            }

            // Store admin data in localStorage
            localStorage.setItem('adminData', JSON.stringify(adminData));
            localStorage.setItem('adminInfo', JSON.stringify({
                id: adminData.id,
                email: adminData.email,
                name: adminData.name,
                role: adminData.role,
                status: adminData.status
            }));
            localStorage.setItem('role', adminData.role);
            localStorage.setItem('name', adminData.name);

            // Redirect based on role
            if (adminData.role === 'super_admin') {
                navigate('/dashboard');
            } else {
                navigate('/admin-dashboard');
            }
        } catch (err) {
            console.error('Login: Error during login:', err);
            setError(err.message || 'Invalid login credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <Card className="login-card">
                <Card.Body>
                    <h2 className="text-center mb-4">Admin Login</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            className="w-100"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}

export default Login; 