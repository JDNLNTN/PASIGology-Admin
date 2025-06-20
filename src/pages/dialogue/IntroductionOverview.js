import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import DialogueLayout from './DialogueLayout'; // Assuming you have a DialogueLayout or similar for consistency

function IntroductionOverview() {
  const navigate = useNavigate();

  const dialoguePages = [
    { name: 'Introduction Dialogue', path: '/dialogue/introduction' },
    { name: 'Living Room Dialogue', path: '/dialogue/livingroom' },
    { name: 'Player Room Dialogue', path: '/dialogue/playerroom' },
   // { name: 'Mechanics Dialogue', path: '/dialogue/mechanics' },
  ];

  const handleManage = (path) => {
    navigate(path);
  };

  return (
    <DialogueLayout>
      <div className="introduction-overview">
        <h2>Introduction Scenarios</h2>
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

export default IntroductionOverview; 