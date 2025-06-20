import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import DialogueLayout from '../DialogueLayout';

function EmmaculateConceptionChurchOverview() {
  const navigate = useNavigate();

  const dialoguePages = [
    { name: 'Kuya Rene Dialogue', path: '/dialogue/kuyarene' },
    { name: 'Lolita Dialogue', path: '/dialogue/lolita' },
  ];

  const handleManage = (path) => {
    navigate(path);
  };

  return (
    <DialogueLayout>
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
    </DialogueLayout>
  );
}

export default EmmaculateConceptionChurchOverview; 