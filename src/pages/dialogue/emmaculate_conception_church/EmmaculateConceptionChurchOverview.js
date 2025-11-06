import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';

function EmmaculateConceptionChurchOverview() {
  const navigate = useNavigate();
  // local modal state removed — we navigate to a dedicated manage page instead

  const dialoguePages = [
    { name: 'Emmaculate Pop Up', path: '/dialogue/emmaculate_conception_church/emmaculatePop' },
  ];

  const handleManage = (path) => {
    // navigate to the dialogue management page
    navigate(path);
  };

  return (
    <div className="emmaculate-conception-church-overview">
      <h2>Emmaculate Conception Church Scenarios</h2>
      <Card>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dialoguePages.map((page, index) => (
                <tr key={index}>
                  <td>{page.name}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleManage(page.path)}
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

export default EmmaculateConceptionChurchOverview;