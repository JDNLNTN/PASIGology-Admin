import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

function Dialogue() {
  const navigate = useNavigate();
  const { role: currentUserRole } = useAuth();

  const scenes = [
    { name: 'Introduction', path: '/dialogue/introduction-overview' },
    { name: 'Plaza Rizal', path: '/dialogue/plaza-rizal' },
    { name: 'Dimas-alang Bakery', path: '/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview' },    
    { name: 'City Hall', path: '/dialogue/city-hall' },
    { name: 'Bahay na Tisa', path: '/dialogue/bahay-na-tisa' },
    { name: 'Immaculate Conception Church', path: '/dialogue/emmaculate-conception-church-overview' },
    { name: 'Pasig City Museum', path: '/dialogue/pasig-city-museum' },
    { name: 'Revolving Tower', path: '/dialogue/revolving-tower' },
    { name: 'Pasig Palengke', path: '/dialogue/pasig-palengke' },
    { name: 'Rainforest Park', path: '/dialogue/rainforest-park' },
    { name: 'Arcovia', path: '/dialogue/arcovia' },
    { name: 'The Pariancillo River or Bitukang Manok', path: '/dialogue/pariancillo-river' },
  ];

  const handleManage = (path) => {
    console.log('Navigating to:', path);
    navigate(path, { state: { role: currentUserRole } });
  };

  return (
    <div className="dialogue">

      <Card>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th colSpan={2}>
                  <h2>Dialogue</h2>
                 <h6>You're logged in as {String(currentUserRole)}</h6>

                </th>
              </tr>
              <tr>
                <th>Scene</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene, index) => (
                <tr key={index}>
                  <td>{scene.name}</td>
                  <td>
                    {(scene.name === 'Dimas-alang Bakery' ||
                      scene.name === 'Immaculate Conception Church' ||
                      scene.name === 'Introduction') ? (
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleManage(scene.path)}
                      >
                        Manage
                      </Button>
                    ) : (
                      <span>Coming Soon</span>
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

export default Dialogue;