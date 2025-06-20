import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';

function Historical() {
  const navigate = useNavigate();

  const historicalEvents = [
    { name: 'Plaza Rizal', table: 'historical_plazarizal' },
    { name: 'Dimas-alang Bakery', table: 'historical_dimasalangbakery' },
    { name: 'City Hall', table: 'historical_cityhall' },
    { name: 'Bahay na Tisa', table: 'historical_bahaynatisa' },
    { name: 'Emmaculate Conception Church', table: 'historical_emmaculateconceptionchurch' },
    { name: 'Pasig City Museum', table: 'historical_pasigcitymuseum' },
    { name: 'Revolving Tower', table: 'historical_revolvingtower' },
    { name: 'Pasig Palengke', table: 'historical_pasigpalengke' },
    { name: 'Rainforest Park', table: 'historical_rainforestpark' },
    { name: 'Arcovia', table: 'historical_arcovia' },
    { name: 'The Pariancillo River or Bitukang Manok', table: 'historical_bitukangmanok' }
  ];

  const handleManage = (tableName) => {
    navigate(`/historical/facts/${tableName}`);
  };

  return (
    <div className="historical">
      <Card>
        <Card.Body>
          <h2>Historical Events</h2>
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
                    <Button
                      variant="primary"
                      onClick={() => handleManage(event.table)}
                    >
                      Manage
                    </Button>
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