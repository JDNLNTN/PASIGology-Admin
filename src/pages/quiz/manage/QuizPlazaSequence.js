import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert } from 'react-bootstrap';
import { supabase } from '../../../services/supabase';
import useAuth from '../../../hooks/useAuth';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch } from 'react-icons/fa';

function QuizPlazaSequence() {
  // Try to get role from localStorage first
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const { role: authRole, isSuperAdmin, hasPermission } = useAuth();
  const [role, setRole] = useState(localRole || authRole);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false); // NEW
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    questions: '',
    for_approval_questions: '',
    sequence_1: '',
    for_approval_sequence1: '',
    sequence_2: '',
    for_approval_sequence2: '',
    sequence_3: '',
    for_approval_sequence3: '',
    correct_sequence: '',
    for_approval_correct_sequence: '',
    hint: '',
    for_approval_hint: ''
  });
  // For approvalFormData, keep only approval fields, but order them to match the main fields
  const [approvalFormData, setApprovalFormData] = useState({
    for_approval_questions: '',
    for_approval_sequence1: '',
    for_approval_sequence2: '',
    for_approval_sequence3: '',
    for_approval_correct_sequence: '',
    for_approval_hint: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  // Add a local loading state for role
  const [roleLoaded, setRoleLoaded] = useState(false);
  // State for editing pending approval (super_admin)
  const [editingApproval, setEditingApproval] = useState(null);
  const [editingApprovalData, setEditingApprovalData] = useState({
    for_approval_questions: '',
    for_approval_sequence1: '',
    for_approval_sequence2: '',
    for_approval_sequence3: '',
    for_approval_correct_sequence: '',
    for_approval_hint: ''
  });

  useEffect(() => {
    // If role from useAuth changes, update state and localStorage
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
      .from('quiz_plaza_sequence')
      .select('id, questions, sequence_1, sequence_2, sequence_3, correct_sequence, hint,  for_approval_questions, for_approval_sequence1, for_approval_sequence2, for_approval_sequence3, for_approval_correct_sequence, for_approval_hint','is_approved')
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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top for notification visibility
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 3000);
  };

  // Only super_admin and content_mod can add/edit/delete
  const canEdit = (role === 'super_admin' || role === 'content_mod' || isSuperAdmin()) && roleLoaded;
  const isContentMod = role === 'content_mod' && roleLoaded;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let submitData = { ...formData };
      if (isContentMod) {
        // Content mod: submit for approval, do not update main fields
        submitData = {
          for_approval_questions: formData.questions,
          for_approval_sequence1: formData.sequence_1,
          for_approval_sequence2: formData.sequence_2,
          for_approval_sequence3: formData.sequence_3,
          for_approval_correct_sequence: formData.correct_sequence,
          for_approval_hint: formData.hint
        };
      }
      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_plaza_sequence')
          .update(submitData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        showAlert(isContentMod ? 'Edit submitted for approval!' : 'Question updated successfully!');
      } else {
        const { error } = await supabase
          .from('quiz_plaza_sequence')
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

  // NEW: handle submit for approval modal
  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    try {
      // Insert with only for_approval_* fields, main fields empty
      const submitData = {
        questions: '',
        sequence_1: '',
        sequence_2: '',
        sequence_3: '',
        correct_sequence: '',
        hint: '',
        ...approvalFormData
      };
      const { error } = await supabase
        .from('quiz_plaza_sequence')
        .insert([submitData]);
      if (error) throw error;
      showAlert('Question submitted for approval!');
      setShowApprovalModal(false);
      setApprovalFormData({
        for_approval_questions: '',
        for_approval_sequence1: '',
        for_approval_sequence2: '',
        for_approval_sequence3: '',
        for_approval_correct_sequence: '',
        for_approval_hint: ''
      });
      fetchQuestions();
    } catch (error) {
      showAlert('Error saving question: ' + error.message, 'danger');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      questions: question.questions,
      sequence_1: question.sequence_1,
      sequence_2: question.sequence_2,
      sequence_3: question.sequence_3,
      correct_sequence: question.correct_sequence,
      hint: question.hint
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const { error } = await supabase
          .from('quiz_plaza_sequence')
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
      questions: '',
      for_approval_questions: '',
      sequence_1: '',
      for_approval_sequence1: '',
      sequence_2: '',
      for_approval_sequence2: '',
      sequence_3: '',
      for_approval_sequence3: '',
      correct_sequence: '',
      for_approval_correct_sequence: '',
      hint: '',
      for_approval_hint: ''
    });
  };

  const filteredQuestions = questions.filter(q =>
    (q.questions && q.questions.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.sequence_1 && q.sequence_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.sequence_2 && q.sequence_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.sequence_3 && q.sequence_3.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.correct_sequence && q.correct_sequence.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.hint && q.hint.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_questions && q.for_approval_questions.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_sequence1 && q.for_approval_sequence1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_sequence2 && q.for_approval_sequence2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_sequence3 && q.for_approval_sequence3.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_correct_sequence && q.for_approval_correct_sequence.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_hint && q.for_approval_hint.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="quiz-plaza-sequence p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Plaza Rizal Sequence Quiz</h2>
        {roleLoaded ? (
          <>
            {canEdit && !isContentMod && (
              <Button variant="success" onClick={() => setShowModal(true)}>
                <FaPlus className="me-1" /> Add Question
              </Button>
            )}
            {isContentMod && (
              <Button variant="info" onClick={() => setShowApprovalModal(true)}>
                <FaPlus className="me-1" /> Add Question (For Approval)
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
                    <th>Sequence 1</th>
                    <th>Sequence 2</th>
                    <th>Sequence 3</th>
                    <th>Correct Sequence</th>
                    <th>Hint</th>
                    <th>For Approval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="text-center">Loading...</td></tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr><td colSpan="8" className="text-center">No questions found</td></tr>
                  ) : (
                    <>
                      {/* Pending approval rows with actions for super_admin */}
                      {filteredQuestions.filter(q => q.for_approval_questions && (role === 'super_admin' || role === 'content_mod')).map(q => (
                        <tr key={q.id + '-approval-banner'} style={{ background: '#fff8c6', border: '2px dashed orange', color: '#e67c00', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <td><b>Pending Approval:</b> {q.for_approval_questions}</td>
                          <td>{q.for_approval_sequence1}</td>
                          <td>{q.for_approval_sequence2}</td>
                          <td>{q.for_approval_sequence3}</td>
                          <td>{q.for_approval_correct_sequence}</td>
                          <td>{q.for_approval_hint}</td>
                          <td><b>{q.is_approved ? 'Yes' : 'No'}</b></td>
                          <td style={role!=='super_admin' ? { textAlign: 'center' } : undefined}>
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
                                    .from('quiz_plaza_sequence')
                                    .update({
                                      questions: q.for_approval_questions,
                                      sequence_1: q.for_approval_sequence1,
                                      sequence_2: q.for_approval_sequence2,
                                      sequence_3: q.for_approval_sequence3,
                                      correct_sequence: q.for_approval_correct_sequence,
                                      hint: q.for_approval_hint,
                                      for_approval_questions: null,
                                      for_approval_sequence1: null,
                                      for_approval_sequence2: null,
                                      for_approval_sequence3: null,
                                      for_approval_correct_sequence: null,
                                      for_approval_hint: null
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
                                      .from('quiz_plaza_sequence')
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
                                  setEditingApproval(q);
                                  setEditingApprovalData({
                                    for_approval_questions: q.for_approval_questions || '',
                                    for_approval_sequence1: q.for_approval_sequence1 || '',
                                    for_approval_sequence2: q.for_approval_sequence2 || '',
                                    for_approval_sequence3: q.for_approval_sequence3 || '',
                                    for_approval_correct_sequence: q.for_approval_correct_sequence || '',
                                    for_approval_hint: q.for_approval_hint || ''
                                  });
                                }}>Edit</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Render main questions (excluding those with for_approval_questions) */}
                      {filteredQuestions.filter(q => !q.for_approval_questions).map((q, idx) => (
                        <tr key={q.id || idx}>
                          <td>{q.questions}</td>
                          <td>{q.sequence_1}</td>
                          <td>{q.sequence_2}</td>
                          <td>{q.sequence_3}</td>
                          <td>{q.correct_sequence}</td>
                          <td>{q.hint}</td>
                          <td>{q.is_approved ? 'No' : 'Yes'}</td>
                          <td>
                            {canEdit && role !== 'test_mod' && (
                              <React.Fragment>
                                <Button variant="warning" className="me-2" onClick={() => handleEdit(q)}>
                                  <FaEdit className="me-1" /> Edit
                                </Button>
                                {role == 'super_admin' && (
                                  <Button variant="danger" onClick={() => handleDelete(q.id)}>
                                    <FaTrash className="me-1" /> Delete
                                  </Button>
                                )}
                                {role === 'super_admin' && q.for_approval_questions && (
                                  <Button variant="success" className="ms-2" onClick={async () => {
                                    const { error } = await supabase
                                      .from('quiz_plaza_sequence')
                                      .update({
                                        questions: q.for_approval_questions,
                                        sequence_1: q.for_approval_sequence1,
                                        sequence_2: q.for_approval_sequence2,
                                        sequence_3: q.for_approval_sequence3,
                                        correct_sequence: q.for_approval_correct_sequence,
                                        hint: q.for_approval_hint,
                                        for_approval_questions: null,
                                        for_approval_sequence1: null,
                                        for_approval_sequence2: null,
                                        for_approval_sequence3: null,
                                        for_approval_correct_sequence: null,
                                        for_approval_hint: null
                                      })
                                      .eq('id', q.id);
                                    if (!error) {
                                      showAlert('Approved!');
                                      fetchQuestions();
                                    } else {
                                      showAlert('Approval failed', 'danger');
                                    }
                                  }}>
                                    Approve
                                  </Button>
                                )}
                              </React.Fragment>
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
                value={formData.questions}
                onChange={(e) => setFormData({ ...formData, questions: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 1</Form.Label>
              <Form.Control
                type="text"
                value={formData.sequence_1}
                onChange={(e) => setFormData({ ...formData, sequence_1: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 2</Form.Label>
              <Form.Control
                type="text"
                value={formData.sequence_2}
                onChange={(e) => setFormData({ ...formData, sequence_2: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 3</Form.Label>
              <Form.Control
                type="text"
                value={formData.sequence_3}
                onChange={(e) => setFormData({ ...formData, sequence_3: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Sequence</Form.Label>
              <Form.Control
                type="text"
                value={formData.correct_sequence}
                onChange={(e) => setFormData({ ...formData, correct_sequence: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Hint</Form.Label>
              <Form.Control
                type="text"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                required
              />
            </Form.Group>
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
      <Modal show={showApprovalModal} onHide={() => {
        setShowApprovalModal(false);
        setApprovalFormData({
          for_approval_questions: '',
          for_approval_sequence1: '',
          for_approval_sequence2: '',
          for_approval_sequence3: '',
          for_approval_correct_sequence: '',
          for_approval_hint: ''
        });
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Question (For Approval)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleApprovalSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Question</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={approvalFormData.for_approval_questions}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_questions: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 1</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_sequence1}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_sequence1: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 2</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_sequence2}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_sequence2: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 3</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_sequence3}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_sequence3: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Sequence</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_correct_sequence}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_correct_sequence: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Hint</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_hint}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_hint: e.target.value })}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => {
                setShowApprovalModal(false);
                setApprovalFormData({
                  for_approval_questions: '',
                  for_approval_sequence1: '',
                  for_approval_sequence2: '',
                  for_approval_sequence3: '',
                  for_approval_correct_sequence: '',
                  for_approval_hint: ''
                });
              }}>
                <FaTimes className="me-1" /> Cancel
              </Button>
              <Button variant="primary" type="submit">
                <FaSave className="me-1" /> Submit for Approval
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      {/* Modal for editing pending approval (super_admin) */}
      <Modal show={!!editingApproval} onHide={() => setEditingApproval(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Pending Approval (Super Admin)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase
              .from('quiz_plaza_sequence')
              .update(editingApprovalData)
              .eq('id', editingApproval.id);
            if (!error) {
              showAlert('Pending approval updated!');
              setEditingApproval(null);
              fetchQuestions();
            } else {
              showAlert('Update failed', 'danger');
            }
          }}>
            <Form.Group className="mb-3">
              <Form.Label>Question</Form.Label>
              <Form.Control as="textarea" rows={3} value={editingApprovalData.for_approval_questions} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_questions: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 1</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_sequence1} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_sequence1: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 2</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_sequence2} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_sequence2: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sequence 3</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_sequence3} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_sequence3: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Sequence</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_correct_sequence} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_correct_sequence: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Hint</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_hint} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_hint: e.target.value })} required />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setEditingApproval(null)}>
                <FaTimes className="me-1" /> Cancel
              </Button>
              <Button variant="primary" type="submit">
                <FaSave className="me-1" /> Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default QuizPlazaSequence;
