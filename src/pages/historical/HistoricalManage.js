import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
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
  const { tableName } = useParams();
  const navigate = useNavigate();
  // UI + data state
  const [facts, setFacts] = useState([]); // list of fact rows from the DB
  const [showModal, setShowModal] = useState(false); // modal visibility
  const [currentFact, setCurrentFact] = useState({ id: null, fact: '' }); // editing/adding target
  const [isEditing, setIsEditing] = useState(false); // whether modal is edit mode
  const [error, setError] = useState(null); // user-visible errors
  const [loading, setLoading] = useState(true); // initial loading spinner
  const [currentUserRole, setCurrentUserRole] = useState(null); // used to gate actions

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
    } catch (err) {
      console.error('Error fetching facts:', err.message);
      setError(`Error fetching facts: ${err.message}`);
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
      setCurrentUserRole(data.user.user_metadata.role);
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
    setCurrentFact({ id: null, fact: '' });
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

      if (!currentFact.fact.trim()) {
        setError('Fact cannot be empty');
        return;
      }

      const factData = {
        fact: currentFact.fact.trim()
      };

      if (isEditing) {
        console.log('Updating existing fact with ID:', currentFact.id);
        const { data, error } = await supabase
          .from(tableName)
          .update(factData)
          .eq('id', currentFact.id)
          .select();

        if (error) {
          console.error('Error updating fact:', error);
          setError(`Error updating fact: ${error.message}`);
          throw error;
        }
        console.log('Update successful, response:', data);
      } else {
        console.log('Inserting new fact');
        const { data, error } = await supabase
          .from(tableName)
          .insert([factData])
          .select();

        if (error) {
          console.error('Error inserting fact:', error);
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
  // - Validates input, constructs a minimal payload (currently only `fact`)
  // - For edits it runs an update where id = currentFact.id, and for new
  //   facts it inserts a single row. Both paths call `.select()` so the
  //   server returns the new/updated rows (useful for debugging).

  const handleApprove = async (id) => {
    if (!tableName) {
      setError('No table name specified.');
      return;
    }
    try {
      setError(null);
      const { error } = await supabase
        .from(tableName)
        .update({ is_approved: true })
        .eq('id', id);

      if (error) {
        console.error('Error approving fact:', error);
        setError(`Error approving fact: ${error.message}`);
        throw error;
      }
      await fetchFacts();
    } catch (error) {
      console.error('Error in handleApprove:', error);
      setError(`Error approving fact: ${error.message}`);
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
            <h2>Manage {tableName.split('.')[1]}</h2>
            <Button variant="primary" onClick={handleAdd}>
              Add New Fact
            </Button>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Historical Fact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center">No historical facts found.</td>
                </tr>
              ) : (
                facts.map((fact) => (
                  <tr key={fact.id}>
                    <td>{fact.fact}</td>
                    <td>{fact.is_approved ? 'Approved' : 'Pending Approval'}</td>
                    <td>
                      {(currentUserRole === 'super_admin') && (
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(fact)}
                        >
                          Edit
                        </Button>
                      )}
                      {currentUserRole === 'super_admin' && !fact.is_approved && (
                        <Button
                          variant="success"
                          size="sm"
                          className="me-2"
                          onClick={() => handleApprove(fact.id)}
                        >
                          Approve
                        </Button>
                      )}
                      {currentUserRole === 'super_admin' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(fact.id)}
                        >
                          Delete
                        </Button>
                      )}
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
          <Modal.Title>{isEditing ? 'Edit Fact' : 'Add New Fact'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Fact</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={currentFact.fact}
                onChange={(e) => setCurrentFact({ ...currentFact, fact: e.target.value })}
              />
            </Form.Group>
            {error && <div className="text-danger mt-2">{error}</div>}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default HistoricalManage;