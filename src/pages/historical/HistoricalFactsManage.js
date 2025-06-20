import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
import { supabase } from '../../services/supabase';

function HistoricalFactsManage() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [facts, setFacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentFact, setCurrentFact] = useState({ id: null, fact: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null); // To store the current user's role

  console.log("Current User Role:", currentUserRole); // Added for debugging

  const fetchCurrentUserRole = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      console.log('User from auth.getUser():', user); // Debugging line

      if (user) {
        const { data: adminData, error: adminError } = await supabase
          .from('administrators')
          .select('role')
          .eq('id', user.id)
          .limit(1);

        if (adminError) throw adminError;
        console.log('Admin data from administrators table:', adminData); // Debugging line
        setCurrentUserRole(adminData && adminData.length > 0 ? adminData[0].role : null);
      } else {
        setCurrentUserRole(null); // No logged-in user or user not found in administrators
      }
    } catch (err) {
      console.error('Error fetching current user role:', err.message);
      setError(err.message);
      setCurrentUserRole(null);
    }
  }, []);

  const fetchFacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*, is_approved') // Assuming 'is_approved' column exists
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setFacts(data || []);
    } catch (err) {
      console.error('Error fetching facts:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    fetchCurrentUserRole();
    fetchFacts();
  }, [fetchCurrentUserRole, fetchFacts]);

  const handleAdd = () => {
    setCurrentFact({ id: null, fact: '' });
    setIsEditing(false);
    setShowModal(true);
    setError(null);
  };

  const handleEdit = (fact) => {
    setCurrentFact(fact);
    setIsEditing(true);
    setShowModal(true);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      console.log('Attempting to save fact.');
      if (!currentFact.fact.trim()) {
        setError('Historical fact cannot be empty.');
        return;
      }

      const factData = { fact: currentFact.fact.trim() };
      if (currentUserRole === 'super_admin') {
        factData.is_approved = true; // Super admin adds approved facts directly
      } else {
        factData.is_approved = false; // Content mod adds facts that need approval
      }

      if (isEditing) {
        console.log('Saving existing fact (isEditing: true).');
        // Super admin can edit and approve, content mod can only edit own unapproved facts
        if (currentUserRole === 'super_admin' || (!currentFact.is_approved && currentUserRole === 'content_mod')) {
          console.log('Performing update on table:', tableName, 'with data:', factData, 'for id:', currentFact.id);
          const { error: updateError } = await supabase
            .from(tableName)
            .update(factData)
            .eq('id', currentFact.id);

          if (updateError) {
            console.error('Supabase update error:', updateError);
            throw updateError;
          }
          console.log('Update successful.');
        } else {
          setError('You do not have permission to edit this fact.');
          return;
        }
      } else {
        console.log('Inserting new fact.');
        console.log('Performing insert on table:', tableName, 'with data:', factData);
        const { error: insertError } = await supabase
          .from(tableName)
          .insert([factData]);

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw insertError;
        }
        console.log('Insert successful.');
      }

      setShowModal(false);
      console.log('Fact saved, re-fetching all facts...');
      await fetchFacts();
      console.log('Re-fetch complete.');
    } catch (err) {
      console.error('Error saving fact (caught):', err.message);
      setError(err.message);
    }
  };

  const handleApprove = async (id) => {
    console.log('Attempting to approve fact with id:', id);
    if (currentUserRole !== 'super_admin') {
      setError('You do not have permission to approve facts.');
      return;
    }
    try {
      setError(null);
      console.log('Performing approval update on table:', tableName, 'for id:', id);
      const { error: approveError } = await supabase
        .from(tableName)
        .update({ is_approved: true })
        .eq('id', id);

      if (approveError) {
        console.error('Supabase approval error:', approveError);
        throw approveError;
      }
      console.log('Approval successful, re-fetching all facts...');
      await fetchFacts();
      console.log('Re-fetch complete.');
    } catch (err) {
      console.error('Error approving fact (caught):', err.message);
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (currentUserRole !== 'super_admin') {
      setError('You do not have permission to delete facts.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this historical fact?')) {
      try {
        setError(null);
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        await fetchFacts();
      } catch (err) {
        console.error('Error deleting fact:', err.message);
        setError(err.message);
      }
    }
  };

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
    <div className="historical-facts-manage">
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Manage Historical Facts for {tableName.replace('historical_', '').replace(/\b\w/g, char => char.toUpperCase()).replace(/\-/g, ' ')}</h2>
            {(currentUserRole === 'super_admin' || currentUserRole === 'content_mod') && (
              <Button variant="primary" onClick={handleAdd}>
                Add New Fact
              </Button>
            )}
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
                      <>
                        {(currentUserRole === 'super_admin' || (!fact.is_approved && currentUserRole === 'content_mod')) && (
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
                      </>
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
          <Modal.Title>{isEditing ? 'Edit Historical Fact' : 'Add New Historical Fact'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Historical Fact</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={currentFact.fact}
              onChange={(e) => setCurrentFact({ ...currentFact, fact: e.target.value })}
              placeholder="Enter historical fact"
            />
          </Form.Group>
          {error && <p className="text-danger">{error}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default HistoricalFactsManage; 