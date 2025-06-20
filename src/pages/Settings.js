import React from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import './Settings.css';

function Settings() {
    return (
        <div className="settings">
            <h2 className="mb-4">Settings</h2>
            <Card>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Site Name</Form.Label>
                            <Form.Control type="text" placeholder="Enter site name" />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control type="email" placeholder="Enter email" />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Theme</Form.Label>
                            <Form.Select>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="blue">Blue</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Language</Form.Label>
                            <Form.Select>
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check 
                                type="switch"
                                id="notifications"
                                label="Enable Notifications"
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit">
                            Save Changes
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}

export default Settings; 