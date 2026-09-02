import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaEdit, FaChartBar } from 'react-icons/fa';
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
        { site: 'Immaculate Conception Church', path: '/quiz/manage/church', table: 'quiz_church', statsToken: 'quiz_church' },
        { site: 'Plaza Rizal', path: '/quiz/manage/plaza-rizal', table: 'quiz_plaza_rizal', statsToken: 'quiz_plaza_rizal' },
        { site: 'Bahay na Tisa', path: '/quiz/manage/bnt', table: 'quiz_bnt', statsToken: 'quiz_bnt' },
        { site: 'Dimas-alang Bakery', path: '/quiz/manage/dimasalang', table: 'quiz_dimasalang', statsToken: 'quiz_dimasalang' },
        { site: 'Revolving Tower', path: '/quiz/manage/revolving-tower', table: 'quiz_revolving_tower', statsToken: 'quiz_revolving_tower' },
      ];
      setQuizzes(quizData);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Directly use statsToken from quiz entries

  const handleManage = (path) => {
    navigate(path);
  };

  const handleStats = (statsToken) => {
    navigate(`/quiz/stats/${statsToken}`);
  };

  const filteredQuizzes = quizzes.filter(q =>
    q.site.toLowerCase().includes(searchTerm.toLowerCase())
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
                placeholder="Search sites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>

          <Table striped bordered hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th>Sites</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="2" className="text-center">Loading...</td>
                </tr>
              ) : filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center">No sites found</td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz, index) => (
                  <tr key={index}>
                    <td>{quiz.site}</td>
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
                        onClick={() => handleStats(quiz.statsToken)}
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