import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
import { supabase } from '../../services/supabase';

// HistoricalManage (refactored)
// Responsibilities:
// - List, create, edit, approve/disapprove, ban/delete introduction dialogue rows
// - Use Supabase client for CRUD operations and respect RLS via anon key
// - Provide clear separation between helpers (DB/role resolution) and UI handlers

function HistoricalManage() {
  const tableName = 'intro';
  const navigate = useNavigate();

  // UI state
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state for add/edit
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFact, setCurrentFact] = useState({ id: null, dialogue: '', sequence: ' ' });

  // Auth/role state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // --------------------
  // Role helpers
  // --------------------
  const _normalizeRole = (role) => (role ? String(role).toLowerCase().trim().replace(/[-\s]/g, '_') : '');

  const isSuperAdmin = (role) => {
    const r = _normalizeRole(role);
    return r === 'super_admin' || r === 'superadmin';
  };

  const isContentModerator = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase().trim();
    return /^(content(?:[_-]?mod(?:erator)?)?|contentmoderator|contentmod)$/.test(r);
  };

  // --------------------
  // Supabase helpers
  // --------------------
  const resolveCurrentUser = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.debug('supabase.auth.getUser error:', error);
        return { id: null, role: null };
      }
      const user = data?.user || null;
      let role = user?.user_metadata?.role || null;

      // fallback to localStorage (login flow may have stored role/adminData)
      if (!role && typeof window !== 'undefined') {
        role = localStorage.getItem('role') || (() => {
          try {
            const adminDataStr = localStorage.getItem('adminData');
            const adminData = adminDataStr ? JSON.parse(adminDataStr) : null;
            return (adminData && adminData.role) ? adminData.role : null;
          } catch (e) {
            return null;
          }
        })();
      }

      let userId = user?.id || null;
      if (!userId && typeof window !== 'undefined') {
        userId = localStorage.getItem('admin_id') || null;
      }

      return { id: userId, role };
    } catch (err) {
      console.error('resolveCurrentUser failed:', err);
      return { id: null, role: null };
    }
  }, []);

  const fetchFacts = useCallback(async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from(tableName).select('*').order('id', { ascending: true });
      if (error) throw error;
      setFacts(data || []);
    } catch (err) {
      console.error('fetchFacts error:', err);
      setError(err.message || 'Failed to load facts');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  // Generic update helper which returns { data, error }
  const runUpdate = async (payload, id = null) => {
    try {
      if (id) {
        return await supabase.from(tableName).update(payload).eq('id', id).select();
      }
      return await supabase.from(tableName).insert([payload]).select();
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const runDelete = async (id) => {
    try {
      return await supabase.from(tableName).delete().eq('id', id).select();
    } catch (err) {
      return { data: null, error: err };
    }
  };

  // --------------------
  // Lifecycle
  // --------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!tableName) {
        setError('No table specified');
        setLoading(false);
        return;
      }
      const user = await resolveCurrentUser();
      if (!mounted) return;
      setCurrentUserId(user.id);
      setCurrentUserRole(user.role);
      await fetchFacts();
    })();
    return () => { mounted = false; };
  }, [fetchFacts, resolveCurrentUser, tableName]);

  // --------------------
  // Handlers
  // --------------------
  const openAddModal = () => {
    setCurrentFact({ id: null, dialogue: '', sequence: ' ' });
    setIsEditing(false);
    setShowModal(true);
    setError(null);
  };

  const openEditModal = (fact) => {
    setCurrentFact(fact || { id: null, dialogue: '', sequence: ' ' });
    setIsEditing(true);
    setShowModal(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!tableName) return setError('No table specified');
    if (!currentFact.dialogue || !currentFact.dialogue.trim()) return setError('Dialogue cannot be empty');
    setError(null);
    try {
      const { id, dialogue } = currentFact;
      const user = await resolveCurrentUser();
      let payload = { dialogue: dialogue.trim() };
      const normalizedRole = _normalizeRole(user.role || currentUserRole);
      if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') payload.is_approved = true;

      const res = await runUpdate(payload, id);
      if (res.error) {
        console.error('handleSave update error:', res.error);
        setError(res.error.message || 'Failed to save');
        return;
      }
      setShowModal(false);
      await fetchFacts();
    } catch (err) {
      console.error('handleSave error:', err);
      setError(err.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
  if (!tableName) {
    setError('No table specified');
    return;
  }

  try {
    // Confirm delete unless user is super admin
    const proceed = isSuperAdmin(currentUserRole) || window.confirm('Are you sure you want to delete this fact?');
    if (!proceed) return;

    // Fetch row before delete (helps with ownership/type issues)
    const { data: existingRow, error: fetchErr } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching row before delete:', fetchErr);
      setError('Failed to fetch row before delete');
      return;
    }

    if (!existingRow) {
      setError('No row found with the provided id. It may already be deleted or the id type mismatched.');
      return;
    }

    console.debug('Row before delete:', existingRow);

    // Attempt delete (subject to RLS)
    const { data: deletedRows, error: deleteErr } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .select();

    if (deleteErr) {
      console.error('Delete error:', deleteErr);
      const msg = deleteErr.message || '';
      if (/permission|policy|not authorized|forbidden/i.test(msg)) {
        setError('Delete failed due to Row Level Security. You may not be the owner of this row.');
      } else {
        setError(msg || 'Failed to delete');
      }
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      // No rows deleted — likely RLS blocked it
      const owner = existingRow.created_by;
      const actingId = (await resolveCurrentUser())?.id || null;
      console.debug('Row owner vs acting user:', { owner, actingId, currentUserRole });

      if (String(owner) !== String(actingId)) {
        setError('Delete blocked: you are not the owner of this row.');
      } else {
        setError('Delete did not remove the row. Check console for details.');
      }
      return;
    }

    console.log('Deleted rows:', deletedRows);
    await fetchFacts();
  } catch (err) {
    console.error('Unexpected delete error:', err);
    setError(err.message || 'Delete failed');
  }
};

  const handleApprove = async (id) => {
    if (!tableName) return setError('No table specified');
    try {
      // try set both is_approved and status, fallback to is_approved only
      const attempt = await supabase.from(tableName).update({ is_approved: true, status: 'approved' }).eq('id', id).select();
      if (attempt.error) {
        const retry = await supabase.from(tableName).update({ is_approved: true }).eq('id', id).select();
        if (retry.error) {
          console.error('handleApprove failed:', retry.error);
          setError(retry.error.message || 'Approve failed');
          return;
        }
      }
      setFacts((prev) => prev.map((f) => (String(f.id) === String(id) ? { ...f, is_approved: true } : f)));
      await fetchFacts();
    } catch (err) {
      console.error('handleApprove unexpected error:', err);
      setError(err.message || 'Approve failed');
    }
  };

  const handleDisapprove = async (id) => {
    if (!tableName) return setError('No table specified');
    try {
      const attempt = await supabase.from(tableName).update({ is_approved: false, status: 'pending' }).eq('id', id).select();
      if (attempt.error) {
        const retry = await supabase.from(tableName).update({ is_approved: false }).eq('id', id).select();
        if (retry.error) {
          console.error('handleDisapprove failed:', retry.error);
          setError(retry.error.message || 'Disapprove failed');
          return;
        }
      }
      setFacts((prev) => prev.map((f) => (String(f.id) === String(id) ? { ...f, is_approved: false } : f)));
      await fetchFacts();
    } catch (err) {
      console.error('handleDisapprove unexpected error:', err);
      setError(err.message || 'Disapprove failed');
    }
  };

  const handleBan = async (id) => {
    if (!tableName) return setError('No table specified');
    try {
      const res = await supabase.from(tableName).update({ status: 'banned' }).eq('id', id);
      if (res.error) {
        console.warn('handleBan update failed; attempting delete:', res.error);
        await handleDelete(id);
        return;
      }
      await fetchFacts();
    } catch (err) {
      console.error('handleBan error:', err);
      setError(err.message || 'Ban failed');
    }
  };

  // --------------------
  // Render
  // --------------------
  if (loading) return (
    <div className="text-center p-5">
      <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
    </div>
  );

  return (
    <div className="historical-manage">
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Manage Introduction Dialogue</h2>
            {((currentUserId && (isSuperAdmin(currentUserRole) || isContentModerator(currentUserRole))) || (!currentUserId && isContentModerator(currentUserRole))) && (
              <Button variant="primary" onClick={openAddModal}>Add New Dialogue</Button>
            )}
          </div>

          {error && <div className="alert alert-danger" role="alert">{error}</div>}

         <Table striped bordered hover responsive>
  <thead>
    <tr>
      <th>Sequence</th>
      <th>Dialogue</th>
      <th>Status</th>
      <th>Actions</th>
      <th>created_at</th>
    </tr>
  </thead>
  <tbody>
    {facts.length === 0 ? (
      <tr>
        <td colSpan="5" className="text-center">No historical facts found.</td>
      </tr>
    ) : facts.map((fact) => (
      <tr key={fact.id}>
        {/* Show sequence number here */}
        <td>{fact.sequence}</td>

        {/* Dialogue text */}
        <td>{fact.dialogue}</td>

        {/* Status */}
        <td>
          {fact.status
            ? (String(fact.status).charAt(0).toUpperCase() + String(fact.status).slice(1))
            : (fact.is_approved ? 'Approved' : 'Pending Approval')}
        </td>

        {/* Actions */}
        <td>
          {isSuperAdmin(currentUserRole) ? (
            fact.is_approved ? (
              <div className="d-flex align-items-center">
                <Button variant="outline-warning" size="sm" className="me-2" onClick={() => handleDisapprove(fact.id)}>Unapprove</Button>
              </div>
            ) : (
              <div className="d-flex align-items-center">
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(fact)}>Edit</Button>
                <Button variant="outline-success" size="sm" className="me-2" onClick={() => handleApprove(fact.id)}>Approve</Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(fact.id)}>Delete</Button>
              </div>
            )
          ) : isContentModerator(currentUserRole) ? (
            (currentUserId && fact?.created_by && String(currentUserId) === String(fact.created_by)) ? (
              <div className="d-flex align-items-center">
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(fact)}>Edit</Button>
              </div>
            ) : <span className="text-muted small">No actions</span>
          ) : <span className="text-muted small">No actions</span>}
        </td>

        {/* Created at */}
        <td>{fact?.created_at ? new Date(fact.created_at).toLocaleString() : ''}</td>
      </tr>
    ))}
  </tbody>
</Table> 
        </Card.Body>
      </Card>

<Modal show={showModal} onHide={() => setShowModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>{isEditing ? 'Edit Dialogue' : 'Add New Dialogue'}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      {/* Sequence field */}
      <Form.Group className="mb-3">
        <Form.Label>Sequence</Form.Label>
        <Form.Control
          type="number"
          value={currentFact.sequence ?? ''}
          onChange={(e) =>
            setCurrentFact({
              ...currentFact,
              sequence: e.target.value
            })
          }
        />
        <Form.Text className="text-muted">
          Enter the sequence number to control ordering
        </Form.Text>
      </Form.Group>

      {/* Dialogue field */}
      <Form.Group>
        <Form.Label>Dialogue</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          value={currentFact.dialogue}
          onChange={(e) =>
            setCurrentFact({ ...currentFact, dialogue: e.target.value })
          }
        />
      </Form.Group>

      {error && <div className="text-danger mt-2">{error}</div>}
    </Form>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowModal(false)}>
      Cancel
    </Button>
    <div className="me-auto text-muted small">
      {!currentUserId && 'You must be signed in to save.'}
    </div>
    <Button
      variant="primary"
      onClick={handleSave}
      disabled={!currentUserId}
    >
      Save
    </Button>
  </Modal.Footer>
</Modal>
    </div>
  );
}

export default HistoricalManage;