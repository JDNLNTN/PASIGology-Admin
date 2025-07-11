import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Alert } from 'react-bootstrap';
import { supabase } from '../../../services/supabase';
import { FaSearch, FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import useAuth from '../../../hooks/useAuth';

function CathedralQuizManage() {
  // Try to get role from localStorage first
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const { role: authRole, isSuperAdmin, hasPermission } = useAuth();
  const [role, setRole] = useState(localRole || authRole);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    correct_answer: '',
    incorrect_1: '',
    incorrect_2: '',
    incorrect_3: '',
    for_approval_questions: '',
    for_approval_correct_answer: '',
    for_approval_incorrect_1: '',
    for_approval_incorrect_2: '',
    for_approval_incorrect_3: ''
  });
  const [approvalFormData, setApprovalFormData] = useState({
    for_approval_questions: '',
    for_approval_correct_answer: '',
    for_approval_incorrect_1: '',
    for_approval_incorrect_2: '',
    for_approval_incorrect_3: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [editingApproval, setEditingApproval] = useState(null);
  const [editingApprovalData, setEditingApprovalData] = useState({
    for_approval_questions: '',
    for_approval_correct_answer: '',
    for_approval_incorrect_1: '',
    for_approval_incorrect_2: '',
    for_approval_incorrect_3: ''
  });

  useEffect(() => {
    if (role !== undefined && role !== null) {
      setRoleLoaded(true);
    }
  }, [role]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_cathedral')
      .select('id, question, correct_answer, incorrect_1, incorrect_2, incorrect_3, is_approved, for_approval_questions, for_approval_question, for_approval_correct_answer, for_approval_incorrect_1, for_approval_incorrect_2, for_approval_incorrect_3')
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
          for_approval_questions: formData.question,
          for_approval_correct_answer: formData.correct_answer,
          for_approval_incorrect_1: formData.incorrect_1,
          for_approval_incorrect_2: formData.incorrect_2,
          for_approval_incorrect_3: formData.incorrect_3
        };
      }
      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_cathedral')
          .update(submitData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        showAlert(isContentMod ? 'Edit submitted for approval!' : 'Question updated successfully!');
      } else {
        const { error } = await supabase
          .from('quiz_cathedral')
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

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        question: '',
        correct_answer: '',
        incorrect_1: '',
        incorrect_2: '',
        incorrect_3: '',
        ...approvalFormData
      };
      const { error } = await supabase
        .from('quiz_cathedral')
        .insert([submitData]);
      if (error) throw error;
      showAlert('Question submitted for approval!');
      setShowApprovalModal(false);
      setApprovalFormData({
        for_approval_questions: '',
        for_approval_correct_answer: '',
        for_approval_incorrect_1: '',
        for_approval_incorrect_2: '',
        for_approval_incorrect_3: ''
      });
      fetchQuestions();
    } catch (error) {
      showAlert('Error saving question: ' + error.message, 'danger');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      correct_answer: question.correct_answer,
      incorrect_1: question.incorrect_1,
      incorrect_2: question.incorrect_2,
      incorrect_3: question.incorrect_3
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        const { error } = await supabase
          .from('quiz_cathedral')
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
      incorrect_1: '',
      incorrect_2: '',
      incorrect_3: '',
      for_approval_questions: '',
      for_approval_correct_answer: '',
      for_approval_incorrect_1: '',
      for_approval_incorrect_2: '',
      for_approval_incorrect_3: ''
    });
  };

  const filteredQuestions = questions.filter(q =>
    (q.question && q.question.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.correct_answer && q.correct_answer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_1 && q.incorrect_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_2 && q.incorrect_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.incorrect_3 && q.incorrect_3.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_questions && q.for_approval_questions.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_correct_answer && q.for_approval_correct_answer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_1 && q.for_approval_incorrect_1.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_2 && q.for_approval_incorrect_2.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (q.for_approval_incorrect_3 && q.for_approval_incorrect_3.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="quiz-cathedral-manage p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Cathedral Quiz</h2>
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
                      {filteredQuestions.filter(q => (q.for_approval_questions || q.for_approval_question) && (role === 'super_admin' || role === 'content_mod')).map(q => (
                        <tr key={q.id + '-approval-banner'} style={{ background: '#fff8c6', border: '2px dashed orange', color: '#e67c00', fontWeight: 'bold', fontSize: '1.1em' }}>
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                            <div><b>Pending Approval:</b> {q.for_approval_questions || q.for_approval_question}</div>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                            <div><b>Correct Answer:</b> {q.for_approval_correct_answer}</div>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                            <div><b>Incorrect 1:</b> {q.for_approval_incorrect_1}</div>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                            <div><b>Incorrect 2:</b> {q.for_approval_incorrect_2}</div>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px' }}>
                            <div><b>Incorrect 3:</b> {q.for_approval_incorrect_3}</div>
                          </td>
                          {/* Is Approved column */}
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px', textAlign: 'center' }}>
                            <span style={{ color: '#e67c00', fontWeight: 'bold' }}>Pending</span>
                          </td>
                          {/* Actions column */}
                          <td style={{ verticalAlign: 'middle', padding: '12px 8px', textAlign: 'center' }}>
                            {role === 'content_mod' ? (
                              <span style={{ background: '#ffe066', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>Pending Approval</span>
                            ) : role === 'super_admin' && (
                              <div className="d-flex gap-2 mt-2">
                                <Button variant="success" size="sm" onClick={async () => {
                                  const { error } = await supabase
                                    .from('quiz_cathedral')
                                    .update({
                                      question: q.for_approval_questions || q.for_approval_question,
                                      correct_answer: q.for_approval_correct_answer,
                                      incorrect_1: q.for_approval_incorrect_1,
                                      incorrect_2: q.for_approval_incorrect_2,
                                      incorrect_3: q.for_approval_incorrect_3,
                                      for_approval_questions: null,
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
                                  if (window.confirm('Are you sure you want to disapprove and delete this pending approval?')) {
                                    const { error } = await supabase
                                      .from('quiz_cathedral')
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
                                    for_approval_question: q.for_approval_question || '',
                                    for_approval_correct_answer: q.for_approval_correct_answer || '',
                                    for_approval_incorrect_1: q.for_approval_incorrect_1 || '',
                                    for_approval_incorrect_2: q.for_approval_incorrect_2 || '',
                                    for_approval_incorrect_3: q.for_approval_incorrect_3 || ''
                                  });
                                }}>Edit</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredQuestions.filter(q => !q.for_approval_questions && !q.for_approval_question).map((q, idx) => (
                        <tr key={q.id || idx}>
                          <td>{q.question}</td>
                          <td>{q.correct_answer}</td>
                          <td>{q.incorrect_1}</td>
                          <td>{q.incorrect_2}</td>
                          <td>{q.incorrect_3}</td>
                          <td>{q.is_approved ? 'Yes' : 'No'}</td>
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
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control
                type="text"
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 1</Form.Label>
              <Form.Control
                type="text"
                value={formData.incorrect_1}
                onChange={(e) => setFormData({ ...formData, incorrect_1: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 2</Form.Label>
              <Form.Control
                type="text"
                value={formData.incorrect_2}
                onChange={(e) => setFormData({ ...formData, incorrect_2: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 3</Form.Label>
              <Form.Control
                type="text"
                value={formData.incorrect_3}
                onChange={(e) => setFormData({ ...formData, incorrect_3: e.target.value })}
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
          for_approval_correct_answer: '',
          for_approval_incorrect_1: '',
          for_approval_incorrect_2: '',
          for_approval_incorrect_3: ''
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
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_correct_answer}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_correct_answer: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 1</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_incorrect_1}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_incorrect_1: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 2</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_incorrect_2}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_incorrect_2: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 3</Form.Label>
              <Form.Control
                type="text"
                value={approvalFormData.for_approval_incorrect_3}
                onChange={(e) => setApprovalFormData({ ...approvalFormData, for_approval_incorrect_3: e.target.value })}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => {
                setShowApprovalModal(false);
                setApprovalFormData({
                  for_approval_questions: '',
                  for_approval_correct_answer: '',
                  for_approval_incorrect_1: '',
                  for_approval_incorrect_2: '',
                  for_approval_incorrect_3: ''
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
      <Modal show={!!editingApproval} onHide={() => setEditingApproval(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Pending Approval (Super Admin)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase
              .from('quiz_cathedral')
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
              <Form.Label>Correct Answer</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_correct_answer} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_correct_answer: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 1</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_incorrect_1} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_incorrect_1: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 2</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_incorrect_2} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_incorrect_2: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Incorrect 3</Form.Label>
              <Form.Control type="text" value={editingApprovalData.for_approval_incorrect_3} onChange={e => setEditingApprovalData({ ...editingApprovalData, for_approval_incorrect_3: e.target.value })} required />
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

export default CathedralQuizManage;
