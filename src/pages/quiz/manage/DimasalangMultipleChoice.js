import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert } from 'react-bootstrap';
import { supabase } from '../../../services/supabase';
import useAuth from '../../../hooks/useAuth';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch } from 'react-icons/fa';

// Main component for managing Dimasalang Multiple Choice quiz questions
function DimasalangMultipleChoice() {
  // Get user role from localStorage or useAuth hook
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const { role: authRole, isSuperAdmin, hasPermission } = useAuth();
  // Use unique variable names to avoid redeclaration errors
  const [role, setRole] = useState(localRole || authRole);
  const [quizQuestions, setQuizQuestions] = useState([]); // All questions from Supabase
  const [loading, setLoading] = useState(true); // Loading state for table
  const [showModal, setShowModal] = useState(false); // Show/hide modal for add/edit
  const [editingQuestion, setEditingQuestion] = useState(null); // Currently editing question
  // Form state for both add and edit
  const [formData, setFormData] = useState({
    question: '',
    correct_answer: '',
    incorrect_1: '',
    incorrect_2: '',
    incorrect_3: '',
    is_approved: false,
    for_approval_question: '',
    for_approval_correct_answer: '',
    for_approval_incorrect_1: '',
    for_approval_incorrect_2: '',
    for_approval_incorrect_3: ''
  });
  const [searchTerm, setSearchTerm] = useState(''); // Search bar state
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' }); // Alert state
  const [roleLoaded, setRoleLoaded] = useState(false); // Track if role is loaded

  // On mount or when authRole changes, set role and mark as loaded
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

  // Fetch questions from Supabase on mount
  useEffect(() => {
    fetchQuestions();
  }, []);

  // Fetch all questions from the quiz_dimasalang_multiple_choice table
  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_dimasalang_multiple_choice')
      .select('id, question, correct_answer, incorrect_1, incorrect_2, incorrect_3, is_approved, for_approval_question, for_approval_correct_answer, for_approval_incorrect_1, for_approval_incorrect_2, for_approval_incorrect_3')
      .order('id', { ascending: true });
    if (error) {
      setQuizQuestions([]);
    } else {
      setQuizQuestions(data);
    }
    setLoading(false);
  };

  // Show alert message at the top
  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 3000);
  };

  // Permission checks
  const canEdit = (role === 'super_admin' || role === 'content_mod' || isSuperAdmin()) && roleLoaded;
  const isContentMod = role === 'content_mod' && roleLoaded;

  // Handle add/edit form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { ...formData };
      // If content_mod, only submit for approval fields
      if (isContentMod) {
        submitData = {
          question: '',
          correct_answer: '',
          incorrect_1: '',
          incorrect_2: '',
          incorrect_3: '',
          is_approved: false,
          for_approval_question: formData.for_approval_question,
          for_approval_correct_answer: formData.for_approval_correct_answer,
          for_approval_incorrect_1: formData.for_approval_incorrect_1,
          for_approval_incorrect_2: formData.for_approval_incorrect_2,
          for_approval_incorrect_3: formData.for_approval_incorrect_3
        };
      }
      // If editing, update; else, insert new
      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_dimasalang_multiple_choice')
          .update(submitData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        showAlert(isContentMod ? 'Edit submitted for approval!' : 'Question updated successfully!');
      } else {
        const { error } = await supabase
          .from('quiz_dimasalang_multiple_choice')
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

  // When clicking Edit, populate form with question data
  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question || '',
      correct_answer: question.correct_answer || '',
      incorrect_1: question.incorrect_1 || '',
      incorrect_2: question.incorrect_2 || '',
      incorrect_3: question.incorrect_3 || '',
      is_approved: question.is_approved || false,
      for_approval_question: question.for_approval_question || '',
      for_approval_correct_answer: question.for_approval_correct_answer || '',
      for_approval_incorrect_1: question.for_approval_incorrect_1 || '',
      for_approval_incorrect_2: question.for_approval_incorrect_2 || '',
      for_approval_incorrect_3: question.for_approval_incorrect_3 || ''
    });
    setShowModal(true);
  };

  // Delete a question by id
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const { error } = await supabase
          .from('quiz_dimasalang_multiple_choice')
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

  // Reset form to initial state
  // For content_mod, also clear the main fields so the approval fields are not overwritten by old values
  const resetForm = () => {
    setFormData({
      question: '',
      correct_answer: '',
      incorrect_1: '',
      incorrect_2: '',
      incorrect_3: '',
      is_approved: false,
      for_approval_question: '',
      for_approval_correct_answer: '',
      for_approval_incorrect_1: '',
      for_approval_incorrect_2: '',
      for_approval_incorrect_3: ''
    });
  };

  // Filter questions by search term (case-insensitive)
  const filteredQuestions = quizQuestions.filter(q =>
    (q.question && q.question.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.correct_answer && q.correct_answer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_1 && q.incorrect_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_2 && q.incorrect_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_3 && q.incorrect_3.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_question && q.for_approval_question.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_correct_answer && q.for_approval_correct_answer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_1 && q.for_approval_incorrect_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_2 && q.for_approval_incorrect_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_3 && q.for_approval_incorrect_3.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="quiz-dimasalang-multiple-choice p-4">
      {/* Header and Add button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dimasalang Multiple Choice Quiz</h2>
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
      {/* Loading spinner if role not loaded */}
      {!roleLoaded ? (
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading role...</span>
          </div>
        </div>
      ) : (
        <React.Fragment>
          {/* Alert for success/error messages */}
          {alert.show && (
            <Alert variant={alert.variant} className="mb-4">
              {alert.message}
            </Alert>
          )}
          <Card className="shadow-sm mt-4">
            <Card.Body>
              {/* Search bar */}
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
              {/* Main table for questions */}
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Correct Answer</th>
                    <th>Incorrect 1</th>
                    <th>Incorrect 2</th>
                    <th>Incorrect 3</th>
                    <th>Is Approved</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center">Loading...</td></tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr><td colSpan="7" className="text-center">No questions found</td></tr>
                  ) : (
                    <>
                      {/* Banner for pending approval, aligned to table columns */}
                      {filteredQuestions.filter(q => q.for_approval_question).map(q => (
                        <tr key={q.id + '-approval-banner'} style={{ background: '#fff8c6', border: '2px dashed orange', color: '#e67c00', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <td><b>Pending Approval: {q.for_approval_question}</b></td>
                          <td><b>{q.for_approval_correct_answer}</b></td>
                          <td><b>{q.for_approval_incorrect_1}</b></td>
                          <td><b>{q.for_approval_incorrect_2}</b></td>
                          <td><b>{q.for_approval_incorrect_3}</b></td>
                          <td><b>{q.is_approved ? 'Yes' : 'No'}</b></td>
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
                                    .from('quiz_dimasalang_multiple_choice')
                                    .update({
                                      question: q.for_approval_question,
                                      correct_answer: q.for_approval_correct_answer,
                                      incorrect_1: q.for_approval_incorrect_1,
                                      incorrect_2: q.for_approval_incorrect_2,
                                      incorrect_3: q.for_approval_incorrect_3,
                                      for_approval_question: null,
                                      for_approval_correct_answer: null,
                                      for_approval_incorrect_1: null,
                                      for_approval_incorrect_2: null,
                                      for_approval_incorrect_3: null,
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
                                      .from('quiz_dimasalang_multiple_choice')
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
                                <Button variant="warning" size="sm" onClick={() => {
                                  setEditingQuestion(q);
                                  setFormData({
                                    ...formData,
                                    for_approval_question: q.for_approval_question || '',
                                    for_approval_correct_answer: q.for_approval_correct_answer || '',
                                    for_approval_incorrect_1: q.for_approval_incorrect_1 || '',
                                    for_approval_incorrect_2: q.for_approval_incorrect_2 || '',
                                    for_approval_incorrect_3: q.for_approval_incorrect_3 || ''
                                  });
                                  setShowModal(true);
                                }}>Edit</Button>
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
                          <td>{q.incorrect_1}</td>
                          <td>{q.incorrect_2}</td>
                          <td>{q.incorrect_3}</td>
                          <td>{q.is_approved ? 'Yes' : 'No'}</td>
                          <td>
                            {canEdit && (
                              <>
                                {/* Edit button opens modal with question data */}
                                <Button variant="warning" className="me-2" onClick={() => handleEdit(q)}>
                                  <FaEdit className="me-1" /> Edit
                                </Button>
                                {/* Only super_admin can delete */}
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
      {/* Modal for add/edit question */}
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
            {/* Main fields for super_admin, content_mod sees only approval fields */}
            <Form.Group className="mb-3">
              <Form.Label>Question</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={isContentMod ? formData.for_approval_question : formData.question}
                onChange={(e) => setFormData(isContentMod
                  ? { ...formData, for_approval_question: e.target.value }
                  : { ...formData, question: e.target.value })}
                required
                disabled={false}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control
                type="text"
                value={isContentMod ? formData.for_approval_correct_answer : formData.correct_answer}
                onChange={(e) => setFormData(isContentMod
                  ? { ...formData, for_approval_correct_answer: e.target.value }
                  : { ...formData, correct_answer: e.target.value })}
                required
                disabled={false}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 1</Form.Label>
              <Form.Control
                type="text"
                value={isContentMod ? formData.for_approval_incorrect_1 : formData.incorrect_1}
                onChange={(e) => setFormData(isContentMod
                  ? { ...formData, for_approval_incorrect_1: e.target.value }
                  : { ...formData, incorrect_1: e.target.value })}
                required
                disabled={false}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 2</Form.Label>
              <Form.Control
                type="text"
                value={isContentMod ? formData.for_approval_incorrect_2 : formData.incorrect_2}
                onChange={(e) => setFormData(isContentMod
                  ? { ...formData, for_approval_incorrect_2: e.target.value }
                  : { ...formData, incorrect_2: e.target.value })}
                required
                disabled={false}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 3</Form.Label>
              <Form.Control
                type="text"
                value={isContentMod ? formData.for_approval_incorrect_3 : formData.incorrect_3}
                onChange={(e) => setFormData(isContentMod
                  ? { ...formData, for_approval_incorrect_3: e.target.value }
                  : { ...formData, incorrect_3: e.target.value })}
                required
                disabled={false}
              />
            </Form.Group>
            {/* Modal action buttons */}
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

export default DimasalangMultipleChoice;
