import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaChartBar } from 'react-icons/fa';
import { supabase } from '../../services/supabase';

function Quiz() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const quizData = [
        { name: 'Plaza Rizal Quiz', table: 'quiz_plaza', status: 'active' },
        { name: 'Dimasalang Bakery Quiz', table: 'quiz_dimasalang', status: 'active' },
        { name: 'Bahay na Tisa Quiz', table: 'quiz_tisa', status: 'active' },
        { name: 'Emmaculate Conception Church Quiz', table: 'quiz_cathedral', status: 'active' },
        { name: 'PasigCity Museum Quiz', table: 'quiz_museum', status: 'active' },
        { name: 'Revolving Tower Quiz', table: 'quiz_revolving', status: 'active' },
        { name: 'Pasig Palengke Quiz', table: 'quiz_palengke', status: 'active' },
        { name: 'Rainforest Park Quiz', table: 'quiz_rainforest', status: 'active' },
        { name: 'Arcovia Quiz', table: 'quiz_arcovia', status: 'active' },
        { name: 'Bitukang Manok Quiz', table: 'quiz_bitukang', status: 'active' }
      ];

      // Fetch question counts for each quiz
      const quizzesWithCounts = await Promise.all(
        quizData.map(async (quiz) => {
          const { count, error } = await supabase
            .from(quiz.table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.error(`Error fetching count for ${quiz.table}:`, error);
            return { ...quiz, questionCount: 0 };
          }

          return { ...quiz, questionCount: count || 0 };
        })
      );

      setQuizzes(quizzesWithCounts);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManage = (tableName) => {
    navigate(`/quiz/manage/${tableName}`);
  };

  const handleCreate = () => {
    navigate('/quiz/create');
  };

  const handleStats = (tableName) => {
    navigate(`/quiz/stats/${tableName}`);
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="quiz p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Quiz Management</h2>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="mb-4">
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          <Table striped bordered hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Quiz Name</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center">Loading quizzes...</td>
                </tr>
              ) : filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No quizzes found</td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz, index) => (
                  <tr key={index}>
                    <td>{quiz.name}</td>
                    <td>
                      <Badge bg={quiz.status === 'active' ? 'success' : 'secondary'}>
                        {quiz.status}
                      </Badge>
                    </td>
                    <td>{quiz.questionCount} questions</td>
                    <td>
                      <Button 
                        variant="primary" 
                        className="me-2"
                        onClick={() => handleManage(quiz.table)}
                      >
                        <FaEdit className="me-1" /> Manage
                      </Button>
                      <Button 
                        variant="info" 
                        className="me-2"
                        onClick={() => handleStats(quiz.table)}
                      >
                        <FaChartBar className="me-1" /> Stats
                      </Button>
                      <Button 
                        variant="danger"
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
    </div>
  );
}

export default Quiz; 