import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaChartBar } from 'react-icons/fa';
import { supabase } from '../../services/supabase';
import useUserRole from '../../hooks/useUserRole';

function Quiz() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { role: currentUserRole } = useUserRole();
  const normalizedRole = (currentUserRole || '').trim().toLowerCase();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const quizData = [
        { name: 'Plaza Rizal Sequence Quiz', path: '/quiz/manage/QuizPlazaSequence', status: 'active' },
        { name: 'Plaza Rizal Scrambled Letter Quiz', path: '/quiz/plaza-scramble', status: 'coming soon' },
        { name: 'Dimasalang Bakery Identification Quiz', path: '/quiz/manage/DimasalangIdentification', status: 'active' },
        { name: 'Dimasalang Bakery Multiple Answer Quiz', path: '/quiz/manage/DimasalangMultipleChoice', status: 'active' },
        { name: 'Bahay na Tisa Quiz', path: '/quiz/tisa', status: 'coming soon' },
        { name: 'Immaculate Conception Church Quiz', path: '/quiz/manage/cathedral', status: 'active' },
        { name: 'PasigCity Museum Quiz', path: '/quiz/museum', status: 'coming soon' },
        { name: 'Revolving Tower Quiz', path: '/quiz/revolving', status: 'coming soon' },
        { name: 'Pasig Palengke Quiz', path: '/quiz/palengke', status: 'coming soon' },
        { name: 'Rainforest Park Quiz', path: '/quiz/rainforest', status: 'coming soon' },
        { name: 'Arcovia Quiz', path: '/quiz/arcovia', status: 'coming soon' },
        { name: 'Bitukang Manok Quiz', path: '/quiz/bitukang', status: 'coming soon' },
        { name: 'City Hall', path: '/quiz/city-hall', status: 'coming soon' },
      ];
      setQuizzes(quizData);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map quiz path to tableName param for stats
  const quizStatsPathMap = {
    '/quiz/manage/QuizPlazaSequence': 'quiz_plaza',
    '/quiz/manage/DimasalangIdentification': 'quiz_dimasalang_identification',
    '/quiz/manage/DimasalangMultipleChoice': 'quiz_dimasalang_multiple_choice',
    '/quiz/manage/cathedral': 'quiz_cathedral',
    '/quiz/tisa': 'quiz_tisa',
    '/quiz/museum': 'quiz_museum',
    '/quiz/revolving': 'quiz_revolving',
    '/quiz/palengke': 'quiz_palengke',
    '/quiz/rainforest': 'quiz_rainforest',
    '/quiz/arcovia': 'quiz_arcovia',
    '/quiz/bitukang': 'quiz_bitukang',
    '/quiz/plaza-scramble': 'quiz_plaza', // adjust if needed
    '/quiz/city-hall': 'quiz_museum', // adjust if needed
    // Add more if needed
  };

  const handleManage = (path) => {
    navigate(path);
  };

  const handleStats = (path) => {
    const tableName = quizStatsPathMap[path];
    if (tableName) {
      navigate(`/quiz/stats/${tableName}`);
    } else {
      // fallback: try to use path as tableName
      navigate(`/quiz/stats/${path.replace('/quiz/manage/', '').replace('/quiz/', '').replace(/\//g, '_')}`);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="quiz p-4">


      <Card className="shadow-sm">
        <Card.Body>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Quiz Management</h2>
      </div>
           <h6>You're logged in as {String(currentUserRole)}</h6>

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
                    <td>
                      <Button 
                        variant="primary" 
                        className="me-2"
                        onClick={() => handleManage(quiz.path)}
                      >
                        <FaEdit className="me-1" /> Manage
                      </Button>
                      <Button 
                        variant="info" 
                        className="me-2"
                        onClick={() => handleStats(quiz.path)}
                      >
                        <FaChartBar className="me-1" /> Stats
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