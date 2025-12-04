import React, { useEffect, useState } from 'react';
import { Card, Spinner, Alert, Table } from 'react-bootstrap';
import { supabase } from '../../../services/supabase';

export default function BahayNaTisaManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('quiz_bnt')
        .select('*')
        .order('id', { ascending: true });
      if (error) setError(error.message);
      setRows(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h2 className="mb-3">Bahay na Tisa Quiz</h2>
          {loading && (
            <div className="text-center my-4"><Spinner animation="border" /> Loading...</div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {!loading && !error && (
            rows.length === 0 ? (
              <Alert variant="info">No entries found in table <b>quiz_bnt</b>.</Alert>
            ) : (
              <Table striped bordered hover responsive className="align-middle">
                <thead className="table-light">
                  <tr>
                    {Object.keys(rows[0] || {}).map((k) => <th key={k}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {Object.keys(rows[0] || {}).map((k) => <td key={k}>{String(r[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
