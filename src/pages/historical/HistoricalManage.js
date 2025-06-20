import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
import { supabase } from '../../services/supabase';

function HistoricalManage() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [facts, setFacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentFact, setCurrentFact] = useState({ id: null, fact: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  useEffect(() => {
    fetchFacts();
    fetchCurrentUserRole();
  }, [tableName]);

  const fetchFacts = async () => {
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

  const fetchCurrentUserRole = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setCurrentUserRole(data.user.user_metadata.role);
    } catch (error) {
      console.error('Error fetching current user role:', error);
      setError('Error fetching current user role');
    }
  };

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

  const handleDelete = async (id) => {
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

  const handleSave = async () => {
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

  const handleApprove = async (id) => {
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