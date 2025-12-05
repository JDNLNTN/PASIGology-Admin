import React, { useEffect, useState } from 'react';
import { Alert, Table, Spinner } from 'react-bootstrap';
import { supabasePlayer } from '../../services/supabase';

function FeedbackTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        // Try multiple candidate feedback columns to avoid schema casing issues
        const { data, error } = await supabasePlayer
          .from('profiles')
          .select('id, username, email, feedBack')
          .order('username', { ascending: true });

        if (error) {
          // Gracefully show concise error; don't break the UI
          setErrorMsg(error.message || 'Failed to load feedback');
          setRows([]);
        } else {
          const normalized = (data || []).map((p) => {
            const feedbackValue = firstNonEmpty([
              p.feedBack,
            ]);
            return {
              id: p.id,
              username: p.username,
              email: p.email,
              feedBack: p.feedBack || null,
            };
          });
          setRows(normalized);
        }
      } catch (e) {
        setErrorMsg(e?.message || 'Unexpected error while loading feedback');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  const firstNonEmpty = (values) => {
    for (const v of values) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 p-3">
        <Spinner animation="border" size="sm" />
        <span>Loading feedback…</span>
      </div>
    );
  }

  return (
    <div>
      {errorMsg && (
        <Alert variant="warning" className="mb-3">
          {errorMsg}
        </Alert>
      )}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Username</th>
            <th>Feedback</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="text-center text-muted">
                No feedback available
              </td>
            </tr>
          ) : (
            rows.map((u) => (
              <tr key={u.id ?? `${u.username || u.email || 'unknown'}-fb`}>
                <td>{u.username || u.email || 'Unknown'}</td>
                <td>{u.feedBack || 'No feedback submitted'}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default FeedbackTab;
