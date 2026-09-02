import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

function Historical() {
  const navigate = useNavigate();
  const { role: currentUserRole } = useAuth();
  const normalizedRole = (currentUserRole || '').trim().toLowerCase();

  // Retain only the requested five items, with updated table names
  const historicalEvents = [
    { name: 'Immaculate Conception Church', table: 'historical_church' },
    { name: 'Plaza Rizal', table: 'historical_dimasalang' },
    { name: 'Bahay na Tisa', table: 'historical_bnt' },
    { name: 'Dimas-alang Bakery', table: 'historical_dimasalang' },
    { name: 'Revolving Tower', table: 'historical_revolving' }
  ];

  const handleManage = (tableName) => {
    // Pass column schema via route state (optional but robust)
    navigate(`/historical/facts/${tableName}`, {
      state: { columns: ['historical_facts', 'is_approved', 'status'] }
    });
  };

  return (
    <div className="historical">
      <Card>
        <Card.Body>
          <h2>Historical Events</h2>
          {/* Debug output for role */}
          <div style={{ marginBottom: '1rem', color: 'Black' }}>
            <h6>You're logged in as {String(currentUserRole)}</h6>
          </div>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Historical Event</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {historicalEvents.map((event) => (
                <tr key={event.table}>
                  <td>{event.name}</td>
                  <td>
                    {(normalizedRole === 'super_admin' || normalizedRole === 'content_mod') && (
                      <Button variant="primary" onClick={() => handleManage(event.table)}>
                        {normalizedRole === 'super_admin' ? 'Manage' : 'View Facts'}
                      </Button>
                    )}           
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Historical;