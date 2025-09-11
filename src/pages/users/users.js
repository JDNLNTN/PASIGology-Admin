import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { supabase, fetchProfiles } from '../../services/supabasePlayer';
import './users.css';

// Users page (admin view)
// - loads a list of player profiles from Supabase using the anon client
// - normalizes returned rows to a consistent shape so the UI can render
// - supports searching, banning/unbanning, and deleting users

function Users() {
    // Data + UI state
    const [users, setUsers] = useState([]); // normalized user rows
    const [loading, setLoading] = useState(true); // true while fetching
    const [error, setError] = useState(null); // holds fetch/operation errors for UI
    const [successMessage, setSuccessMessage] = useState(''); // operation success alerts
    const [searchTerm, setSearchTerm] = useState(''); // text search input
    // modal visibility state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showUnbanModal, setShowUnbanModal] = useState(false);
    // the user currently targeted for ban/delete/unban actions
    const [selectedUser, setSelectedUser] = useState(null);

    // Load users on first render
    useEffect(() => {
        fetchUsers();
    }, []);

    // fetchUsers: retrieves profile rows from Supabase, normalizes them and
    // updates component state. Notes:
    // - We request '*' to avoid 400s when column names differ between projects.
    // - Normalization maps common column name variants to a single shape the UI expects.
    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Confirm there's a session (this uses the anon client). This is
            // mostly a sanity check — Supabase will still respond to anon requests.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                throw new Error('Authentication error');
            }

            // Use fetchProfiles helper which tries likely table names and
            // returns per-table diagnostics if nothing is found.
            const result = await fetchProfiles({ table: 'profiles', select: '*' });
            const { data, error, tableUsed } = result || {};

            if (tableUsed) console.log('fetchProfiles used table:', tableUsed);

            if (error) {
                // propagate a readable message to the UI
                throw new Error(`Failed to load users: ${error.message || error}`);
            }

            if (!data) {
                throw new Error('No data received from the server');
            }

            // Log the raw payload to help debug differing schemas
            console.log('Raw users payload:', data);

            // Normalize rows so the UI can rely on consistent keys.
            const processedData = data.map(user => ({
                // normalize id/user_id
                user_id: user.user_id || user.id || user.uid || null,
                // normalize display name
                char_name: user.char_name || user.username || user.name || '',
                email: user.email || user.user_email || '',
                age: user.age || null,
                // map local gender codes to human-friendly values
                gender: user.gender === 'iha' ? 'female' : user.gender === 'iho' ? 'male' : user.gender,
                created_at: user.created_at || user.createdAt || null,
                is_banned: !!(user.is_banned || user.banned || user.isBanned),
                // keep raw row for debugging when things don't match
                _raw: user
            }));

            console.log('Successfully received data:', processedData);
            setUsers(processedData);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    // UI handlers open confirmation modals and set the targeted user
    const handleBan = (user) => {
        setSelectedUser(user);
        setShowBanModal(true);
    };

    const handleDelete = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleUnban = (user) => {
        setSelectedUser(user);
        setShowUnbanModal(true);
    };

    // Action handlers: perform the backend update/delete and refresh the list.
    // NOTE: these call the 'PASIGology' table — adjust if your table name differs.
    const handleBanConfirm = async () => {
        try {
            const { error } = await supabase
                .from('PASIGology')
                .update({ is_banned: true })
                .eq('user_id', selectedUser.user_id);

            if (error) {
                throw new Error('Failed to ban user');
            }

            setSuccessMessage('User banned successfully');
            setShowBanModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to ban user');
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            const { error } = await supabase
                .from('PASIGology')
                .delete()
                .eq('user_id', selectedUser.user_id);

            if (error) {
                throw new Error('Failed to delete user');
            }

            setSuccessMessage('User deleted successfully');
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to delete user');
        }
    };

    const handleUnbanConfirm = async () => {
        try {
            const { error } = await supabase
                .from('PASIGology')
                .update({ is_banned: false })
                .eq('user_id', selectedUser.user_id);

            if (error) {
                throw new Error('Failed to unban user');
            }

            setSuccessMessage('User unbanned successfully');
            setShowUnbanModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to unban user');
        }
    };

    // Apply search filter and ensure is_banned is a boolean for UI checks
    const filteredUsers = users.filter(user =>
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.char_name && user.char_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).map(user => ({...user, is_banned: !!user.is_banned}));

    return (
        <div className="users">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Player list</h2>
            </div>

            {error && (
                <Alert variant="danger" className="mb-4">
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert variant="success" className="mb-4" onClose={() => setSuccessMessage('')} dismissible>
                    {successMessage}
                </Alert>
            )}

            <div className="mb-4">
                <Form.Control
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    {console.log('Loading state:', loading, 'Filtered users count:', filteredUsers.length)}
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>created_at</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => {
                                console.log('User for rendering:', user.user_id, 'Type of is_banned:', typeof user.is_banned, 'Value of is_banned:', user.is_banned);
                                return (
                                <tr key={user.user_id}>
                                    <td>{user.email}</td>
                                    <td>{user.char_name}</td>
                                    <td>{user.age}</td>
                                    <td>{user.gender}</td>
                                    <td>{user.is_banned ? 'Banned' : 'Active'}</td>
                                    <td>
                                        {user.is_banned ? (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleUnban(user)}
                                            >
                                                Unban
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="warning"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleBan(user)}
                                            >
                                                Ban
                                            </Button>
                                        )}
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDelete(user)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            );})}
                        </tbody>
                    </Table>
                </>
            )}

            {/* Ban Confirmation Modal */}
            <Modal show={showBanModal} onHide={() => setShowBanModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Ban</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to ban this user?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBanModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="warning" onClick={handleBanConfirm}>
                        Ban User
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete this user?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Unban Confirmation Modal */}
            <Modal show={showUnbanModal} onHide={() => setShowUnbanModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Unban</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to unban this user?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUnbanModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleUnbanConfirm}>
                        Unban User
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Users; 