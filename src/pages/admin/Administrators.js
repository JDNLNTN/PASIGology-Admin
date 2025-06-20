import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, InputGroup, Pagination, Dropdown, Toast, ToastContainer } from 'react-bootstrap';
import { supabase } from '../../services/supabase';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaEdit, FaBan, FaTrash, FaDownload, FaCheck, FaTimes } from 'react-icons/fa';
import './Administrators.css';
import { adminService } from '../../services/adminService';
import { useNavigate } from 'react-router-dom';
import { useEmailConfirmedStatus } from '../../hooks/useEmailConfirmedStatus';

function Administrators() {
    const [administrators, setAdministrators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserLoading, setCurrentUserLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [selectedAdmins, setSelectedAdmins] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        role: 'content_mod'
    });
    const navigate = useNavigate();
    const { emailConfirmedMap, loading: emailStatusLoading } = useEmailConfirmedStatus(administrators, 'http://localhost:4000/api/email-confirmed');

    useEffect(() => {
        fetchCurrentUser();
        fetchAdministrators();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: adminData, error } = await supabase
                    .from('administrators')
                    .select('id, name, email, role, status')
                    .eq('email', user.email)
                    .single();

                if (error) throw error;
                setCurrentUser(adminData);
            }
        } catch (err) {
            console.error('Error fetching current user:', err);
        } finally {
            setCurrentUserLoading(false);
        }
    };

    const fetchAdministrators = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('administrators')
                .select('id, name, email, role, status, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching administrators:', error);
                throw new Error('Failed to load administrators');
            }

            if (!data) {
                throw new Error('No data received from the server');
            }

            setAdministrators(data);
            setError(null);
            showToastNotification('Administrators loaded successfully', 'success');
        } catch (err) {
            console.error('Error in fetchAdministrators:', err);
            setError(err.message || 'Failed to load administrators');
            showToastNotification(err.message || 'Failed to load administrators', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort />;
        return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
    };

    const sortedAndFilteredAdmins = administrators
        .filter(admin =>
            admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortConfig.key === 'created_at') {
                return sortConfig.direction === 'asc'
                    ? new Date(a.created_at) - new Date(b.created_at)
                    : new Date(b.created_at) - new Date(a.created_at);
            }
            return sortConfig.direction === 'asc'
                ? a[sortConfig.key].localeCompare(b[sortConfig.key])
                : b[sortConfig.key].localeCompare(a[sortConfig.key]);
        });

    const canManageAdmin = (admin) => {
        if (!currentUser) return false;
        
        // Super admin can manage content moderators
        if (currentUser.role === 'super_admin') {
            // Super admin can manage both content_mod and other super_admin accounts
            // unless it's their own account (to prevent self-deletion/banning)
            return admin.id !== currentUser.id;
        }
        
        // Content mod can only manage themselves
        if (currentUser.role === 'content_mod') {
            return admin.id === currentUser.id;
        }
        
        return false;
    };

    const handleEdit = (admin) => {
        if (!canManageAdmin(admin)) {
            setError('You do not have permission to edit this administrator');
            showToastNotification('You do not have permission to edit this administrator', 'danger');
            return;
        }
        setSelectedAdmin(admin);
        setFormData({
            name: admin.name,
            email: admin.email,
            password: '',
            role: admin.role,
            status: admin.status
        });
        setShowEditModal(true);
    };

    const handleDelete = (admin) => {
        if (!canManageAdmin(admin)) {
            setError('You do not have permission to delete this administrator');
            showToastNotification('You do not have permission to delete this administrator', 'danger');
            return;
        }
        setSelectedAdmin(admin);
        setShowDeleteModal(true);
    };

    const handleBanToggle = async (admin) => {
        if (!canManageAdmin(admin)) {
            setError('You do not have permission to ban/unban this administrator');
            showToastNotification('You do not have permission to ban/unban this administrator', 'danger');
            return;
        }

        if (admin.role === 'super_admin') {
            setError('Cannot ban super administrators');
            showToastNotification('Cannot ban super administrators', 'danger');
            return;
        }

        try {
            const newStatus = admin.status === 'active' ? 'banned' : 'active';
            const { error } = await supabase
                .from('administrators')
                .update({ status: newStatus })
                .eq('id', admin.id);

            if (error) throw error;

            setSuccessMessage(`Administrator ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`);
            showToastNotification(`Administrator ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`, 'success');
            fetchAdministrators();
        } catch (err) {
            console.error('Error in handleBanToggle:', err);
            setError(err.message || 'Failed to update administrator status');
            showToastNotification(err.message || 'Failed to update administrator status', 'danger');
        }
    };

    const handleCreateAdministrator = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Only super admin can create new administrators
        if (currentUser?.role !== 'super_admin') {
            setError('Only super administrators can create new administrators');
            showToastNotification('Only super administrators can create new administrators', 'danger');
            return;
        }

        try {
            await adminService.create({
                email: formData.email,
                name: formData.name,
                password: formData.password,
                role: formData.role,
                status: 'active'
            });
            setSuccessMessage('Administrator created successfully and an email has been sent.');
            showToastNotification('Administrator created successfully and an email has been sent.', 'success');
            setFormData({
                email: '',
                name: '',
                password: '',
                role: 'content_mod'
            });
            fetchAdministrators();
            setShowEditModal(false);
        } catch (error) {
            setError(error.message);
            showToastNotification(error.message, 'danger');
        }
    };

    const handleUpdateAdministrator = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!selectedAdmin) return;

        // Super admin cannot change their own role or ban themselves via edit
        if (currentUser?.role === 'super_admin' && selectedAdmin.id === currentUser.id) {
            if (formData.role !== selectedAdmin.role) {
                setError('Super admin cannot change their own role.');
                showToastNotification('Super admin cannot change their own role.', 'danger');
                return;
            }
        }

        try {
            const updateData = {
                name: formData.name,
                email: formData.email,
                ...(currentUser?.role === 'super_admin' && selectedAdmin.id !== currentUser.id && 
                    { role: formData.role })
            };

            // Only allow password update if a new password is provided
            if (formData.password) {
                updateData.password = formData.password;
            }

            await adminService.update(selectedAdmin.id, updateData);
            setSuccessMessage('Administrator updated successfully');
            showToastNotification('Administrator updated successfully', 'success');
            setShowEditModal(false);
            fetchAdministrators();
        } catch (error) {
            setError(error.message);
            showToastNotification(error.message, 'danger');
        }
    };

    const handleDeleteAdministrator = async () => {
        if (!selectedAdmin) return;

        try {
            await adminService.delete(selectedAdmin.id);
            setSuccessMessage('Administrator deleted successfully');
            showToastNotification('Administrator deleted successfully', 'success');
            setShowDeleteModal(false);
            fetchAdministrators();
        } catch (error) {
            setError(error.message);
            showToastNotification(error.message, 'danger');
        }
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAndFilteredAdmins.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedAndFilteredAdmins.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        setSelectedAdmins([]);
    };

    const showToastNotification = (message, variant) => {
        setToastMessage(message);
        setToastVariant(variant);
        setShowToast(true);
    };

    if (currentUserLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading current user...</span>
                </div>
                <span className="ms-2">Loading current user...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Administrators</h2>
                {currentUser?.role === 'super_admin' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/admin/create')}
                    >
                        <i className="fas fa-user-plus me-2"></i>
                        Add Administrator
                    </button>
                )}
            </div>

            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg={toastVariant}>
                    <Toast.Header>
                        <strong className="me-auto">Notification</strong>
                    </Toast.Header>
                    <Toast.Body>{toastMessage}</Toast.Body>
                </Toast>
            </ToastContainer>

            <div className="administrators-filters">
                <InputGroup className="mb-3">
                    <InputGroup.Text>
                        <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search administrators..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </InputGroup>
            </div>

            <div className="table-responsive">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')}>
                                Name {getSortIcon('name')}
                            </th>
                            <th onClick={() => handleSort('email')}>
                                Email {getSortIcon('email')}
                            </th>
                            <th onClick={() => handleSort('role')}>
                                Role {getSortIcon('role')}
                            </th>
                            <th onClick={() => handleSort('status')}>
                                Status {getSortIcon('status')}
                            </th>
                            <th>Email Confirmed</th>
                            <th>Email Sent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((admin) => (
                            <tr key={admin.id}>
                                <td>{admin.name}</td>
                                <td>{admin.email}</td>
                                <td>
                                    <Badge bg={admin.role === 'super_admin' ? 'primary' : 'info'}>
                                        {admin.role}
                                    </Badge>
                                </td>
                                <td>
                                    <Badge bg={
                                        admin.status === 'active' ? 'success' : 
                                        admin.status === 'banned' ? 'danger' : 
                                        'secondary'
                                    }>
                                        {admin.status}
                                    </Badge>
                                </td>
                                <td>
                                    {emailStatusLoading
                                        ? <span>...</span>
                                        : emailConfirmedMap[admin.id] === undefined
                                            ? <span>?</span>
                                            : emailConfirmedMap[admin.id]
                                                ? <FaCheck style={{ color: 'green' }} title="Confirmed" />
                                                : <FaTimes style={{ color: 'red' }} title="Not Confirmed" />
                                    }
                                </td>
                                <td>
                                    <FaCheck style={{ color: 'green' }} />
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {canManageAdmin(admin) && (
                                            <>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleEdit(admin)}
                                                    className="me-2"
                                                >
                                                    <FaEdit /> Edit
                                                </Button>
                                                {currentUser?.role === 'super_admin' && admin.role !== 'super_admin' && (
                                                    <>
                                                        <Button
                                                            variant="outline-warning"
                                                            size="sm"
                                                            onClick={() => handleBanToggle(admin)}
                                                            className="me-2"
                                                        >
                                                            <FaBan /> {admin.status === 'active' ? 'Ban' : 'Unban'}
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(admin)}
                                                        >
                                                            <FaTrash /> Delete
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <Pagination className="justify-content-center">
                <Pagination.Prev
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                />
                {[...Array(totalPages)].map((_, index) => (
                    <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => handlePageChange(index + 1)}
                    >
                        {index + 1}
                    </Pagination.Item>
                ))}
                <Pagination.Next
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                />
            </Pagination>

            {/* Edit/Create Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {selectedAdmin ? 'Edit Administrator' : 'Create Administrator'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                {selectedAdmin ? 'New Password (leave blank to keep current)' : 'Password'}
                            </Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!selectedAdmin}
                            />
                        </Form.Group>
                        {/* Role selection for new administrators or when editing another admin by super_admin */}
                        {(!selectedAdmin || (selectedAdmin && currentUser?.role === 'super_admin' && selectedAdmin.id !== currentUser.id)) && (
                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select
                                    name="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                    disabled={selectedAdmin && selectedAdmin.id === currentUser.id && currentUser.role === 'super_admin'}
                                >
                                    <option value="content_mod">Content Moderator</option>
                                    <option value="super_admin">Super Administrator</option>
                                </Form.Select>
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={selectedAdmin ? handleUpdateAdministrator : handleCreateAdministrator}
                    >
                        {selectedAdmin ? 'Update' : 'Create'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete this administrator? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteAdministrator}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Administrators; 