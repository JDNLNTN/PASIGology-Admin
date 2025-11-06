import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Form, Dropdown, ButtonGroup } from 'react-bootstrap';
import { supabase } from '../../services/supabase';

// HistoricalManage
// This component provides a small admin UI to manage historical facts for a
// specific table. The table name is pulled from the URL params (example:
// /historical/manage/schema.table_name). The component supports:
// - listing facts (select *)
// - adding new facts (insert)
// - editing existing facts (update)
// - deleting facts (delete)
// - approving facts (update is_approved)
// Notes:
// - The component uses the client-side Supabase anon key. Ensure RLS and
//   policies allow the current role to perform the operations in development.
// - The code assumes each record has `id`, `fact`, and `is_approved` fields.

function HistoricalManage() {
  const tableName = "intro";
  const navigate = useNavigate();
  // UI + data state
  const [facts, setFacts] = useState([]); // list of fact rows from the DB
  const [showModal, setShowModal] = useState(false); // modal visibility
  const [currentFact, setCurrentFact] = useState({ id: null, dialogue: '' }); // editing/adding target
  const [isEditing, setIsEditing] = useState(false); // whether modal is edit mode
  const [error, setError] = useState(null); // user-visible errors
  const [loading, setLoading] = useState(true); // initial loading spinner
  const [currentUserRole, setCurrentUserRole] = useState(null); // used to gate actions
  const [currentUserId, setCurrentUserId] = useState(null); // store auth.uid() for RLS
  const [fetchDebug, setFetchDebug] = useState({ count: 0, sample: null, error: null });

  // Helper to recognize multiple possible role strings for content moderators
  // Accepts values like 'content_moderator', 'content-mod', 'content_mod', 'content_modERATOR', 'content_mod'
  const isContentModerator = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase().trim();
    // Match content_mod, content-moderator, contentmoderator, content_modERATOR, content_mod, contentmod
    return /^(content(?:[_-]?mod(?:erator)?)?|contentmoderator|contentmod)$/.test(r);
  };

  // Helper to recognize super admin role in multiple common formats
  const isSuperAdmin = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase().trim().replace(/[-\s]/g, '_');
    return r === 'super_admin' || r === 'superadmin';
  };

  

  useEffect(() => {
    if (!tableName) {
      setError('No table name specified in the URL.');
      setLoading(false);
      return;
    }
  // Load facts for the current table and determine the current user's role
  // (role is used to show/hide admin actions like Edit/Approve/Delete).
  fetchFacts();
  fetchCurrentUserRole();
  }, [tableName]);

  const fetchFacts = async () => {
    if (!tableName) {
      setError('No table name specified.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching from table:', tableName);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching facts:', error);
        setError(`Error fetching facts: ${error.message}`);
        throw error;
      }

      console.log('Fetched data:', data);
      setFacts(data || []);
      try {
        setFetchDebug({ count: (data || []).length, sample: JSON.stringify((data || []).slice(0, 5), null, 2), error: null });
      } catch (e) {
        setFetchDebug({ count: (data || []).length, sample: null, error: null });
      }
    } catch (err) {
      console.error('Error fetching facts:', err.message);
      setError(`Error fetching facts: ${err.message}`);
      setFetchDebug({ count: 0, sample: null, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // fetchFacts explanation:
  // - Reads all rows using `select('*')` from the table name provided in the
  //   route. The route must include a fully-qualified identifier (schema.table)
  //   if your DB requires it. If the fetch fails, the error is displayed above
  //   the table and logged to the console for debugging.

  const fetchCurrentUserRole = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      // data.user may be null if not signed in
      const user = data?.user || null;

      // Prefer role stored in Supabase user_metadata, but fall back to
      // values saved to localStorage during login (the app stores admin
      // info there). This covers the standard login flow used in this app
      // where `adminData.role` and `role` are persisted locally.
      let role = user?.user_metadata?.role || null;
      let localRole = null;
      let adminDataStr = null;
      if (!role && typeof window !== 'undefined') {
        // localStorage keys used in the app: 'role', 'adminData'
        localRole = localStorage.getItem('role');
        if (localRole) role = localRole;
        else {
          try {
            adminDataStr = localStorage.getItem('adminData');
            const adminData = adminDataStr ? JSON.parse(adminDataStr) : null;
            if (adminData && adminData.role) role = adminData.role;
          } catch (e) {
            // ignore JSON parse errors
          }
        }
      }

      // Determine current user id: prefer supabase user id, fall back to
      // localStorage 'admin_id' (set by the Login flow).
      let userId = user?.id || null;
      if (!userId && typeof window !== 'undefined') {
        const localAdminId = localStorage.getItem('admin_id');
        if (localAdminId) userId = localAdminId;
      }

  // Debug logging removed in production - resolved role and ids are no longer logged here

      setCurrentUserId(userId || null);
      setCurrentUserRole(role || null);
    } catch (error) {
      console.error('Error fetching current user role:', error);
      setError('Error fetching current user role');
    }
  };

  // fetchCurrentUserRole explanation:
  // - Uses the Supabase auth client to retrieve the current user's metadata.
  // - This assumes the `user_metadata` contains a `role` property. If your
  //   authentication flow stores role information elsewhere, update this.

  const handleAdd = () => {
  setCurrentFact({ id: null, dialogue: '' });
    setIsEditing(false);
    setShowModal(true);
    setError(null);
  };

  // handleAdd explanation:
  // - Prepares the modal for inserting a new fact by clearing `currentFact`.

  const handleEdit = (fact) => {
    setCurrentFact(fact);
    setIsEditing(true);
    setShowModal(true);
    setError(null);
  };

  // handleEdit explanation:
  // - Puts the selected fact into edit-mode and opens the modal so the user
  //   can update the text. The `currentFact` object is bound to the textarea.

  const handleDelete = async (id) => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this fact?')) {
      try {
        setError(null);
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting fact:', error);
          setError(`Error deleting fact: ${error.message}`);
          throw error;
        }
        await fetchFacts();
      } catch (error) {
        console.error('Error in handleDelete:', error);
        setError(`Error deleting fact: ${error.message}`);
      }
    }
  };

  // handleDelete explanation:
  // - Confirms with the user, then issues a DELETE where id = provided id.
  // - On success it refreshes the list. Permission/RLS failures will be
  //   surfaced as errors that you can inspect in the console or the alert.

  const handleSave = async () => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    try {
      setError(null);
      console.log('Attempting to save to table:', tableName);
      console.log('Current fact data:', currentFact);

      // ensure non-empty
      if (!currentFact.dialogue || !currentFact.dialogue.trim()) {
        setError('Dialogue cannot be empty');
        return;
      }

  // refresh current user to ensure auth.uid() is available at save time
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) console.debug('supabase.auth.getUser error:', userError);
  const savingUserId = userData?.user?.id || null;
  console.debug('Saving as user id:', savingUserId);

      if (!savingUserId) {
        setError('You must be signed in to save a dialogue.');
        return;
      }

      // Let the database set `created_by` via a trigger (safer). Only send
      // the data the user is allowed to provide from the client.
      // If the current user is a super_admin, auto-mark the row as approved.
      // Resolve role from state first, then fall back to auth metadata and
      // localStorage (mirrors fetchCurrentUserRole logic).
      let roleForSave = currentUserRole;
      if (!roleForSave) {
        roleForSave = userData?.user?.user_metadata?.role || null;
        if (!roleForSave && typeof window !== 'undefined') {
          const localRole = localStorage.getItem('role');
          if (localRole) roleForSave = localRole;
          else {
            try {
              const adminDataStr = localStorage.getItem('adminData');
              const adminData = adminDataStr ? JSON.parse(adminDataStr) : null;
              if (adminData && adminData.role) roleForSave = adminData.role;
            } catch (e) {
              // ignore
            }
          }
        }
      }

      const factData = {
        dialogue: currentFact.dialogue.trim()
      };

      const normalizedRole = String(roleForSave || '').toLowerCase().replace(/[-\s]/g, '_');
      if (normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
        factData.is_approved = true;
      }

      if (isEditing) {
        console.log('Updating existing fact with ID:', currentFact.id);
        const { data, error } = await supabase
          .from(tableName)
          .update(factData)
          .eq('id', currentFact.id)
          .select();

        if (error) {
          console.error('Error updating fact:', error, { factData });
          setError(`Error updating fact: ${error.message}`);
          throw error;
        }
        console.log('Update successful, response:', data);
      } else {
        console.log('Inserting new fact', { factData });
        const { data, error } = await supabase
          .from(tableName)
          .insert([factData])
          .select();

        if (error) {
          // Log full error object to help RLS debugging
          console.error('Error inserting fact:', error, { factData });
          setError(`Error inserting fact: ${error.message}`);
          throw error;
        }
        console.log('Insert successful, response:', data);
      }

      setShowModal(false);
      await fetchFacts();
    } catch (error) {
      console.error('Error in handleSave:', error);
      setError(`Error saving fact: ${error.message}`);
    }
  };

  // handleSave explanation:
  // - Validates input, constructs a minimal payload (currently only `dialogue`)
  // - For edits it runs an update where id = currentFact.id, and for new
  //   facts it inserts a single row. Both paths call `.select()` so the
  //   server returns the new/updated rows (useful for debugging).

  const handleApprove = async (id) => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    try {
      // Detailed debug: show which id and user are attempting the approve,
      // and the local copy of the fact (helps detect id/type mismatches).
      const existingFact = facts.find((f) => String(f.id) === String(id));
      console.log('handleApprove start:', { id, currentUserId, currentUserRole, existingFact });
      setError(null);
      // First try to set both is_approved and status (if status column exists)
      let data, error;
      ({ data, error } = await supabase
        .from(tableName)
        .update({ is_approved: true, status: 'approved' })
        .eq('id', id)
        .select());

      console.log('handleApprove response (attempt with status):', { data, error });

      // If status column doesn't exist or update failed, retry with only is_approved
      if (error) {
        console.warn('handleApprove: retrying without status due to error', error);
        const retry = await supabase
          .from(tableName)
          .update({ is_approved: true })
          .eq('id', id)
          .select();
        data = retry.data;
        error = retry.error;
        console.log('handleApprove response (retry):', retry);
      }

      if (error) {
        console.error('Error approving fact after retries:', error);
        setError(`Error approving fact: ${error.message}`);
        return;
      }

      // Update local state immediately so UI reflects the change
      setFacts((prev) => prev.map((f) => (String(f.id) === String(id) ? { ...f, is_approved: true, status: (data && data[0] && data[0].status) || 'approved' } : f)));

      // If we didn't get rows returned, still refresh to be safe
      if (!data || data.length === 0) await fetchFacts();
    } catch (error) {
      console.error('Error in handleApprove:', error);
      setError(`Error approving fact: ${error.message}`);
    }
  };

  const handleDisapprove = async (id) => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    try {
      const existingFact = facts.find((f) => String(f.id) === String(id));
      console.log('handleDisapprove start:', { id, currentUserId, currentUserRole, existingFact });
      setError(null);
      // Try to set both is_approved and status to pending
      let data, error;
      ({ data, error } = await supabase
        .from(tableName)
        .update({ is_approved: false, status: 'pending' })
        .eq('id', id)
        .select());

      console.log('handleDisapprove response (attempt with status):', { data, error });

      if (error) {
        console.warn('handleDisapprove: retrying without status due to error', error);
        const retry = await supabase
          .from(tableName)
          .update({ is_approved: false })
          .eq('id', id)
          .select();
        data = retry.data;
        error = retry.error;
        console.log('handleDisapprove response (retry):', retry);
      }

      if (error) {
        console.error('Error disapproving fact after retries:', error);
        setError(`Error disapproving fact: ${error.message}`);
        return;
      }

      setFacts((prev) => prev.map((f) => (String(f.id) === String(id) ? { ...f, is_approved: false, status: (data && data[0] && data[0].status) || 'pending' } : f)));

      if (!data || data.length === 0) await fetchFacts();
    } catch (error) {
      console.error('Error in handleDisapprove:', error);
      setError(`Error disapproving fact: ${error.message}`);
    }
  };

  const handleBan = async (id) => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    // Try to set a `status` column to 'banned' if it exists. If the update
    // fails (no such column or permission error), fall back to delete.
    try {
      setError(null);
      const { error } = await supabase
        .from(tableName)
        .update({ status: 'banned' })
        .eq('id', id);

      if (error) {
        // If update fails, attempt delete as a fallback
        console.warn('handleBan update failed, attempting delete:', error);
        await handleDelete(id);
        return;
      }
      await fetchFacts();
    } catch (error) {
      console.error('Error in handleBan:', error);
      setError(`Error banning fact: ${error.message}`);
    }
  };

  // handleApprove explanation:
  // - Marks the `is_approved` column true for the given id. UI shows the
  //   Approve button only for users with `super_admin` role and when the fact
  //   is currently not approved.

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="historical-manage">
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Manage Introduction Dialogue</h2>
            {/* Only allow adding when signed-in and role is super_admin or content_moderator.
                This prevents anonymous users or lower roles from opening the add modal.
                We rely on the DB trigger to set `created_by` on insert; `created_by` is
                used below to let content moderators edit their own rows. */}
            {((currentUserId && (isSuperAdmin(currentUserRole) || isContentModerator(currentUserRole))) || (!currentUserId && isContentModerator(currentUserRole))) && (
              <Button variant="primary" onClick={handleAdd}>
                Add New Dialogue
              </Button>
            )}
          </div>

          {/* Debug banner removed to avoid showing sensitive info in the UI. */}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Dialogue</th>
                <th>Status</th>
                <th>Actions</th>
                <th>created_at</th>
              </tr>
            </thead>
            <tbody>
              {facts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No historical facts found.</td>
                </tr>
              ) : (
                facts.map((fact) => (
                  <tr key={fact.id}>
                    <td>{fact.dialogue}</td>
                    <td>{fact.status ? (String(fact.status).charAt(0).toUpperCase() + String(fact.status).slice(1)) : (fact.is_approved ? 'Approved' : 'Pending Approval')}</td>
                    <td>
                      {isSuperAdmin(currentUserRole) ? (
                        // For super_admin: if already approved, show only Unapprove;
                        // otherwise show Edit / Approve / Delete.
                        fact.is_approved ? (
                          <div className="d-flex align-items-center">
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={async () => await handleDisapprove(fact.id)}
                            >
                              Unapprove
                            </Button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEdit(fact)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={async () => await handleApprove(fact.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(fact.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )
                      ) : isContentModerator(currentUserRole) ? (
                        // content_moderator may view all rows but can only edit their own entries
                        // We assume the table includes a `created_by` column set by the DB trigger.
                        (currentUserId && fact?.created_by && String(currentUserId) === String(fact.created_by)) ? (
                          <div className="d-flex align-items-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEdit(fact)}
                            >
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted small">No actions</span>
                        )
                      ) : (
                        <span className="text-muted small">No actions</span>
                      )}
                    </td>
                    <td>
                      {fact?.created_at ? new Date(fact.created_at).toLocaleString() : ''}
                    </td>
                  </tr>
                ))
              )}
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
            <Form.Group>
              <Form.Label>Dialogue</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={currentFact.dialogue}
                onChange={(e) => setCurrentFact({ ...currentFact, dialogue: e.target.value })}
              />
            </Form.Group>
            {error && <div className="text-danger mt-2">{error}</div>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <div className="me-auto text-muted small">{!currentUserId && 'You must be signed in to save.'}</div>
            <Button variant="primary" onClick={handleSave} disabled={!currentUserId}>
              Save
            </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default HistoricalManage;