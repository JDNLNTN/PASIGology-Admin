import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, InputGroup, Badge, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { FaSearch, FaEdit, FaTrash, FaArrowLeft, FaPlus, FaSave, FaTimes } from 'react-icons/fa';

function QuizManage() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ show: false, message: '', variant: '' });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    question: '',
    correct_answer: '',
    incorrect_1: '',
    incorrect_2: '',
    incorrect_3: ''
  });

  useEffect(() => {
    fetchQuestions();
  }, [tableName]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      showAlert('Error fetching questions: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        showAlert('Question updated successfully!');
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([formData]);
        if (error) throw error;
        showAlert('Question added successfully!');
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
          .from(tableName)
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
      incorrect_3: ''
    });
  };

  const filteredQuestions = questions.filter(question =>
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.correct_answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getQuizTitle = () => {
    const titles = {
      'quiz_cathedral': 'Emmaculate Conception Church Quiz',
      'quiz_plaza': 'Plaza Rizal Quiz',
      'quiz_dimasalang': 'Dimasalang Bakery Quiz',
      'quiz_tisa': 'Bahay na Tisa Quiz',
      'quiz_museum': 'PasigCity Museum Quiz',
      'quiz_revolving': 'Revolving Tower Quiz',
      'quiz_palengke': 'Pasig Palengke Quiz',
      'quiz_rainforest': 'Rainforest Park Quiz',
      'quiz_arcovia': 'Arcovia Quiz',
      'quiz_bitukang': 'Bitukang Manok Quiz'
    };
    return titles[tableName] || tableName.replace('quiz_', '').replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="quiz-manage p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="secondary" className="me-2" onClick={() => navigate('/quiz')}>
            <FaArrowLeft className="me-1" /> Back
          </Button>
          <h2 className="d-inline-block mb-0">
            Manage {getQuizTitle()}
          </h2>
        </div>
        <Button variant="success" onClick={() => setShowModal(true)}>
          <FaPlus className="me-1" /> Add Question
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Card className="shadow-sm">
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

          <Table striped bordered hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Question</th>
                <th>Correct Answer</th>
                <th>Incorrect Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center">Loading questions...</td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No questions found</td>
                </tr>
              ) : (
                filteredQuestions.map((question) => (
                  <tr key={question.id}>
                    <td>{question.question}</td>
                    <td className="text-success fw-bold">{question.correct_answer}</td>
                    <td>
                      <ol className="mb-0">
                        <li>{question.incorrect_1}</li>
                        <li>{question.incorrect_2}</li>
                        <li>{question.incorrect_3}</li>
                      </ol>
                    </td>
                    <td>
                      <Button
                        variant="warning"
                        className="me-2"
                        onClick={() => handleEdit(question)}
                      >
                        <FaEdit className="me-1" /> Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(question.id)}
                      >
                        <FaTrash className="me-1" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

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
              <Form.Label>Incorrect Option 1</Form.Label>
              <Form.Control
                type="text"
                value={formData.incorrect_1}
                onChange={(e) => setFormData({ ...formData, incorrect_1: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Incorrect Option 2</Form.Label>
              <Form.Control
                type="text"
                value={formData.incorrect_2}
                onChange={(e) => setFormData({ ...formData, incorrect_2: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Incorrect Option 3</Form.Label>
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
                <FaSave className="me-1" /> {editingQuestion ? 'Update' : 'Save'} Question
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default QuizManage; 