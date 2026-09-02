import React, { useEffect, useState, useMemo } from 'react';
import { Card, Table, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, supabasePlayer } from '../../../services/supabase';
import { FaArrowLeft } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


// Mapping route params to STATUS table names and quiz display names
const quizTableMap = {
  // Status-table mapping aligned with QuizOverview statsToken values
  'quiz_church': { table: 'church_status', display: 'Emmaculate Conception Church' },
  'quiz_plaza_rizal': { table: 'rizal_status', display: 'Plaza Rizal' },
  'quiz_bnt': { table: 'tisa_status', display: 'Bahay na Tisa' },
  'quiz_dimasalang': { table: 'bakery_status', display: 'Dimas-alang Bakery' },
  'quiz_revolving_tower': { table: 'tower_status', display: 'Revolving Tower' },
};

function QuizStats() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug log to check if component is mounted and param is received
  console.log('QuizStats mounted. tableName:', tableName);

  //param for mapping
  const quizInfo = quizTableMap[tableName] || { table: tableName, display: tableName };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, [tableName]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Preflight existence check on status table (user_id is common)
      try {
        const ping = await supabasePlayer
          .from(quizInfo.table)
          .select('user_id')
          .limit(1)
          .maybeSingle();
        if (ping && ping.error && ping.status === 404) {
          setRows([]);
          setError(`Table ${quizInfo.table} not found in database.`);
          return;
        }
      } catch (e) {
        // fallthrough to main fetch
      }

      // Fetch status rows
      const { data: statusData, error: statusErr } = await supabasePlayer
        .from(quizInfo.table)
        .select('user_id, initAttempt, retakeAttempt, current_attempt');
      if (statusErr) throw statusErr;

      const userIds = [...new Set((statusData || []).map(r => r.user_id).filter(Boolean))];

      // Fetch usernames from profiles
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabasePlayer
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        if (profilesErr) throw profilesErr;
        profileMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.username || '';
          return acc;
        }, {});
      }

      const normalized = (statusData || []).map(r => ({
        user_id: r.user_id,
        user_name: profileMap[r.user_id] || '',
        initAttempt: r.initAttempt ?? null,
        retakeAttempt: r.retakeAttempt ?? null,
        current_attempt: r.current_attempt ?? null,
      }));

      setRows(normalized);
    } catch (err) {
      setError('Error fetching stats: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CSV export for current table + summary metrics
  const handleExportCSV = () => {
    try {
      const header = [
        'Quiz',
        'User ID',
        'User Name',
        'Initial Attempt',
        'Retake Attempt',
        'Current Attempt',
      ];

      const rowsData = rows.map(r => [
        quizInfo.display,
        r.user_id ?? '',
        (r.user_name ?? '').toString().replace(/,/g, ' '),
        r.initAttempt ?? '',
        r.retakeAttempt ?? '',
        r.current_attempt ?? '',
      ]);

      // Summary section at top
      const summary = [
        ['Summary'],
        ['Participants', metrics.totalUsers],
        ['Retake Rate (%)', (metrics.retakeRatio * 100).toFixed(0)],
        ['Retakes', metrics.retakeCount],
        ['Initials', metrics.initCount],
        ['Avg Attempts', metrics.avgCurrentAttempt.toFixed(2)],
        ['% Users Retook', (metrics.percentRetook * 100).toFixed(0)],
        [],
        ['Data'],
      ];

      const csvLines = [
        ...summary.map(line => line.join(',')),
        header.join(','),
        ...rowsData.map(line => line.join(',')),
      ];

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `${quizInfo.table}-stats-${ts}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed:', e);
    }
  };

  // Helpers to safely parse numbers and compute aggregates
  const toNumberOrZero = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  // Derived metrics (memoized for performance and safety)
  const metrics = useMemo(() => {
    const totalUsers = rows.length;
    const initCount = rows.filter(r => !!r.initAttempt).length;
    const retakeCount = rows.filter(r => !!r.retakeAttempt).length;

    const retakeRatio = initCount > 0 ? (retakeCount / initCount) : 0;

    const currentAttemptsSum = rows.reduce((sum, r) => sum + toNumberOrZero(r.current_attempt), 0);
    const avgCurrentAttempt = totalUsers > 0 ? (currentAttemptsSum / totalUsers) : 0;

    // Distribution buckets by current_attempt: 1, 2, 3+
    const dist = { '1': 0, '2': 0, '3+': 0 };
    rows.forEach(r => {
      const ca = toNumberOrZero(r.current_attempt);
      if (ca <= 1) dist['1'] += 1;
      else if (ca === 2) dist['2'] += 1;
      else dist['3+'] += 1;
    });
    const distLabels = ['1', '2', '3+'];
    const distValues = [dist['1'], dist['2'], dist['3+']];

    const percentRetook = totalUsers > 0 ? (retakeCount / totalUsers) : 0;
    const topUsers = [...rows]
      .sort((a, b) => toNumberOrZero(b.current_attempt) - toNumberOrZero(a.current_attempt))
      .slice(0, 5);

    const barData = {
      labels: distLabels,
      datasets: [
        {
          label: 'Users by Attempt Bucket',
          data: distValues,
          backgroundColor: '#0d6efd',
        },
      ],
    };

    const barOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    };

    return {
      totalUsers,
      initCount,
      retakeCount,
      retakeRatio,
      avgCurrentAttempt,
      percentRetook,
      topUsers,
      barData,
      barOptions,
      hasData: totalUsers > 0 && distValues.some(v => v > 0),
    };
  }, [rows]);

  return (
    <div className="quiz-stats p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button variant="secondary" className="me-2" onClick={() => navigate('/quiz')}>
            <FaArrowLeft className="me-1" /> Back
          </Button>
          <h2 className="d-inline-block mb-0">{quizInfo.display} Status</h2>
          <div style={{fontSize: '0.9em', color: '#888'}}>Route param: {tableName} | Table: {quizInfo.table}</div>
        </div>
        <div>
          <Button variant="primary" disabled={loading || rows.length === 0} onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {!error && !loading && rows.length === 0 && (
        <Alert variant="info">
          No stats found for this site. This may mean no users have progress yet, or the database table <b>{quizInfo.table}</b> is empty.
        </Alert>
      )}

      {/* Summary cards */}
      {!loading && rows.length > 0 && (
        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <div className="fw-bold">Participants</div>
                <div className="display-6">{metrics.totalUsers}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <div className="fw-bold">Retake Rate</div>
                <div className="display-6">{(metrics.retakeRatio * 100).toFixed(0)}%</div>
                <div className="text-muted" style={{fontSize:'0.85em'}}>
                  Retakes / Initials: {metrics.retakeCount} / {metrics.initCount}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <div className="fw-bold">Avg Attempts</div>
                <div className="display-6">{metrics.avgCurrentAttempt.toFixed(2)}</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6} className="mb-3">
            <Card className="h-100">
              <Card.Body>
                <div className="fw-bold">% Users Retook</div>
                <div className="display-6">{(metrics.percentRetook * 100).toFixed(0)}%</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Distribution chart */}
      {!loading && rows.length > 0 && (
        <Card className="shadow-sm mb-4">
          <Card.Header>Attempt Distribution</Card.Header>
          <Card.Body style={{ height: 300 }}>
            {metrics.hasData ? (
              <Bar data={metrics.barData} options={metrics.barOptions} />
            ) : (
              <Alert variant="secondary" className="mb-0">No attempt data to chart.</Alert>
            )}
          </Card.Body>
        </Card>
      )}
      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" /> Loading stats...
            </div>
          ) : (
            <Table striped bordered hover responsive className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Initial Attempt</th>
                  <th>Retake Attempt</th>
                  <th>Current Attempt</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center">No stats found</td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.user_id}</td>
                      <td>{row.user_name}</td>
                      <td>{row.initAttempt}</td>
                      <td>{row.retakeAttempt}</td>
                      <td>{row.current_attempt}</td>
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
