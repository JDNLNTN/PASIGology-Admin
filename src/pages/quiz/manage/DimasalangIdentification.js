import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert } from 'react-bootstrap';
import { supabase } from '../../../services/supabase';
import useAuth from '../../../hooks/useAuth';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch } from 'react-icons/fa';

function DimasalangIdentification() {
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const { role: authRole, isSuperAdmin, hasPermission } = useAuth();
  const [role, setRole] = useState(localRole || authRole);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    correct_answer: '',
    for_approval_question: '',
    for_approval_correct_answer: '',
    is_approved: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    if (authRole !== undefined && authRole !== null) {
      setRole(authRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userRole', authRole);
      }
      setRoleLoaded(true);
    } else if (localRole) {
      setRole(localRole);
      setRoleLoaded(true);
    }
  }, [authRole]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_dimasalang_identification')
      .select('id, question, correct_answer, for_approval_question, for_approval_correct_answer, is_approved')
      .order('id', { ascending: true });
    if (error) {
      setQuestions([]);
    } else {
      setQuestions(data);
    }
    setLoading(false);
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 3000);
  };

  const canEdit = (role === 'super_admin' || role === 'content_mod' || isSuperAdmin()) && roleLoaded;
  const isContentMod = role === 'content_mod' && roleLoaded;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { ...formData };
      if (isContentMod) {
        submitData = {
          question: '',
          correct_answer: '',
          for_approval_question: formData.question,
          for_approval_correct_answer: formData.correct_answer,
          is_approved: false
        };
      }
      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_dimasalang_identification')
          .update(submitData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        showAlert(isContentMod ? 'Edit submitted for approval!' : 'Question updated successfully!');
      } else {
        const { error } = await supabase
          .from('quiz_dimasalang_identification')
          .insert([submitData]);
        if (error) throw error;
        showAlert(isContentMod ? 'Question submitted for approval!' : 'Question added successfully!');
      }
      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      showAlert('Error saving question: ' + error.message, 'danger');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question || '',
      correct_answer: question.correct_answer || '',
      for_approval_question: question.for_approval_question || '',
      for_approval_correct_answer: question.for_approval_correct_answer || '',
      is_approved: question.is_approved || false
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const { error } = await supabase
          .from('quiz_dimasalang_identification')
          .delete()
          .eq('id', id);
        if (error) throw error;
        showAlert('Question deleted successfully!');
        fetchQuestions();
      } catch (error) {
        showAlert('Error deleting question: ' + error.message, 'danger');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      correct_answer: '',
      for_approval_question: '',
      for_approval_correct_answer: '',
      is_approved: false
    });
  };

  const filteredQuestions = questions.filter(q =>
    (q.question && q.question.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.correct_answer && q.correct_answer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_question && q.for_approval_question.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_correct_answer && q.for_approval_correct_answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="quiz-dimasalang-identification p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dimasalang Identification Quiz</h2>
        {roleLoaded ? (
          <>
            {canEdit && (
              <Button variant="success" onClick={() => setShowModal(true)}>
                <FaPlus className="me-1" /> Add Question
              </Button>
            )}
          </>
        ) : (
          <div style={{ minWidth: 120 }} />
        )}
      </div>
      {!roleLoaded ? (
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading role...</span>
          </div>
        </div>
      ) : (
        <React.Fragment>
          {alert.show && (
            <Alert variant={alert.variant} className="mb-4">
              {alert.message}
            </Alert>
          )}
          <Card className="shadow-sm mt-4">
            <Card.Body>
              <div className="mb-4">
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Correct Answer</th>
                    <th>Is Approved</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="text-center">Loading...</td></tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr><td colSpan="4" className="text-center">No questions found</td></tr>
                  ) : (
                    <>
                      {/* Banner for pending approval, aligned to table columns */}
                      {filteredQuestions.filter(q => q.for_approval_question && (role === 'super_admin' || role === 'content_mod')).map(q => (
                        <tr key={q.id + '-approval-banner'} style={{ background: '#fff8c6', border: '2px dashed orange', color: '#e67c00', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <td>{q.for_approval_question}</td>
                          <td>{q.for_approval_correct_answer}</td>
                          <td>{q.is_approved ? 'Yes' : 'No'}</td>
                          <td style={role !== 'super_admin' ? { textAlign: 'center' } : undefined}>
                            {q.is_approved ? null : (
                              role === 'content_mod' && (
                                <span style={{ background: '#ffe066', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>Pending Approval</span>
                              )
                            )}
                            {role === 'super_admin' && (
                              <div className="d-flex gap-2">
                                <Button variant="success" size="sm" onClick={async () => {
                                  // Approve: move for_approval fields to main fields, clear for_approval fields
                                  const { error } = await supabase
                                    .from('quiz_dimasalang_identification')
                                    .update({
                                      question: q.for_approval_question,
                                      correct_answer: q.for_approval_correct_answer,
                                      for_approval_question: null,
                                      for_approval_correct_answer: null,
                                      is_approved: true
                                    })
                                    .eq('id', q.id);
                                  if (!error) {
                                    showAlert('Approved!');
                                    fetchQuestions();
                                  } else {
                                    showAlert('Approval failed', 'danger');
                                  }
                                }}>Approve</Button>
                                <Button variant="danger" size="sm" onClick={async () => {
                                  // Disapprove: delete the row
                                  if (window.confirm('Are you sure you want to disapprove and delete this pending approval?')) {
                                    const { error } = await supabase
                                      .from('quiz_dimasalang_identification')
                                      .delete()
                                      .eq('id', q.id);
                                    if (!error) {
                                      showAlert('Disapproved and deleted!');
                                      fetchQuestions();
                                    } else {
                                      showAlert('Disapprove failed', 'danger');
                                    }
                                  }
                                }}>Disapprove</Button>
                                {/* Optionally, add Edit for pending approval if needed */}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Main questions (not pending approval) */}
                      {filteredQuestions.filter(q => !q.for_approval_question).map((q, idx) => (
                        <tr key={q.id || idx}>
                          <td>{q.question}</td>
                          <td>{q.correct_answer}</td>
                          <td>{q.is_approved ? 'Yes' : 'No'}</td>
                          <td>
                            {canEdit && (
                              <>
                                <Button variant="warning" className="me-2" onClick={() => handleEdit(q)}>
                                  <FaEdit className="me-1" /> Edit
                                </Button>
                                {role === 'super_admin' && (
                                  <Button variant="danger" onClick={() => handleDelete(q.id)}>
                                    <FaTrash className="me-1" /> Delete
                                  </Button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </React.Fragment>
      )}
      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        setEditingQuestion(null);
        resetForm();
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Question</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                required={!isContentMod}
                disabled={isContentMod}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control
                type="text"
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                required={!isContentMod}
                disabled={isContentMod}
              />
            </Form.Group>
            {/* For content_mod, show approval fields */}
            {isContentMod && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Question (For Approval)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.for_approval_question}
                    onChange={(e) => setFormData({ ...formData, for_approval_question: e.target.value })}
                    required={isContentMod}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Correct Answer (For Approval)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.for_approval_correct_answer}
                    onChange={(e) => setFormData({ ...formData, for_approval_correct_answer: e.target.value })}
                    required={isContentMod}
                  />
                </Form.Group>
              </>
            )}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => {
                setShowModal(false);
                setEditingQuestion(null);
                resetForm();
              }}>
                <FaTimes className="me-1" /> Cancel
              </Button>
              <Button variant="primary" type="submit">
                <FaSave className="me-1" /> {editingQuestion ? (isContentMod ? 'Submit for Approval' : 'Update') : (isContentMod ? 'Submit for Approval' : 'Save')} Question
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default DimasalangIdentification;
