import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { FaArrowLeft } from 'react-icons/fa';


// Mapping route params to table names and quiz display names
const quizTableMap = {
    'quiz_plaza': { table: 'attempt_plazarizal_scores', display: 'Plaza Rizal' },
    'quiz_cathedral': { table: 'attempt_immaculate_scores', display: 'emmaculate conception church quiz' },
    'quiz_museum': { table: 'attempt_cityhall_scores', display: 'pasig city museum quiz' },
    'quiz_palengke': { table: 'attempt_pasig_palengke_scores', display: 'pasig palengke quiz' },
    'quiz_rainforest': { table: 'attempt_rainforest_park_scores', display: 'rainforest park quiz' },
    'quiz_arcovia': { table: 'attempt_arcovia_scores', display: 'arcovia quiz' },
    'quiz_bitukang': { table: 'attempt_bituka_scores', display: 'bitukang manok quiz' },
    'quiz_tisa': { table: 'attempt_bahaynatisa_scores', display: 'Bahay na Tisa' },
    'quiz_dimasalang_identification': { table: 'attempt_dimas_alangbakery_identification_scores', display: 'Dimasalang Bakery Identification' },
    'quiz_dimasalang_multiple_choice': { table: 'attempt_dimas_alangbakery_multiple_scores', display: 'Dimasalang Bakery Multiple Choice' },
    'quiz_revolving': { table: 'attempt_revolving_tower_scores', display: 'Revolving Tower' },
}

function QuizStats() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug log to check if component is mounted and param is received
  console.log('QuizStats mounted. tableName:', tableName);

  //param for mapping
  const quizInfo = quizTableMap[tableName] || { table: tableName, display: tableName };

  useEffect(() => {
    fetchAttempts();
    // eslint-disable-next-line
  }, [tableName]);

  const fetchAttempts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from(quizInfo.table)
        .select('*');
      if (error) throw error;
      setAttempts(data || []);
    } catch (err) {
      setError('Error fetching attempts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-stats p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="secondary" className="me-2" onClick={() => navigate('/quiz')}>
            <FaArrowLeft className="me-1" /> Back
          </Button>
          <h2 className="d-inline-block mb-0">{quizInfo.display} Attempts Stats</h2>
          <div style={{fontSize: '0.9em', color: '#888'}}>Route param: {tableName} | Table: {quizInfo.table}</div>
        </div>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {!error && !loading && attempts.length === 0 && (
        <Alert variant="info">
          No attempts found for this quiz. This may mean no users have taken this quiz yet, or the database table <b>{quizInfo.table}</b> is empty.<br/>
          <span style={{fontSize: '0.95em', color: '#888'}}>If you expect data here, check your Supabase table and column names: <b>user_id</b>, <b>user_name</b>, <b>attempt1_score</b> ... <b>attempt5_score</b>.</span>
        </Alert>
      )}
      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" /> Loading attempts...
            </div>
          ) : (
            <Table striped bordered hover responsive className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Attempt 1</th>
                  <th>Attempt 2</th>
                  <th>Attempt 3</th>
                  <th>Attempt 4</th>
                  <th>Attempt 5</th>
                </tr>
              </thead>
              <tbody>
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No attempts found</td>
                  </tr>
                ) : (
                  attempts.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.user_id}</td>
                      <td>{row.user_name}</td>
                      <td>{row.attempt1_score}</td>
                      <td>{row.attempt2_score}</td>
                      <td>{row.attempt3_score}</td>
                      <td>{row.attempt4_score}</td>
                      <td>{row.attempt5_score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default QuizStats;
