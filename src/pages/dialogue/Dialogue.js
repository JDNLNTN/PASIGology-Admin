import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

function Dialogue() {
  const navigate = useNavigate();
  const { role: currentUserRole } = useAuth();
  const [openIndex, setOpenIndex] = useState(null);
  const locations = [
    {
      name: 'INTRODUCTION AFTER LOG IN AND SIGN UP',
      overviewPath: '/dialogue/introduction-overview',
      children: [
        { name: 'Gallery introduction info', path: '/dialogue/introduction-gallery', status: 'available' },
      ],
    },
    {
      name: 'Church',
      overviewPath: '/dialogue/emmaculate-conception-church-overview',
      children: [
        { name: 'Augmented reality church info', path: '/dialogue/emmaculate-conception-church-overview', status: 'available' },
        { name: 'Gallery church info', path: '/dialogue/emmaculate-conception-church-gallery', status: 'available' },
      ],
    },
    {
      name: 'Plaza Rizal',
      overviewPath: '/dialogue/plaza-rizal',
      children: [
        { name: 'Augmented reality Plaza Rizal info', path: '/dialogue/plaza-rizal', status: 'available' },
        { name: 'Gallery Plaza Rizal info', path: '/dialogue/plaza-rizal-gallery', status: 'available' },
      ],
    },
    {
      name: 'Bahay na tisa',
      overviewPath: '/dialogue/bahay-na-tisa',
      children: [
        { name: 'Augmented reality Bahay na tisa info', path: '/dialogue/bahay-na-tisa', status: 'available' },
        { name: 'Gallery Bahay na tisa info', path: '/dialogue/bahay-na-tisa-gallery', status: 'available' },
      ],
    },
    {
      name: 'Dimas alang',
      overviewPath: '/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview',
      children: [
        { name: 'Augmented reality Dimas alang info', path: '/dialogue/dimas_alang_bakery/DimasAlangBakeryOverview', status: 'available' },
        { name: 'Gallery Dimas alang info', path: '/dialogue/dimas_alang_bakery/gallery', status: 'available' },
      ],
    },
    {
      name: 'Revolving Tower',
      overviewPath: '/dialogue/revolving-tower',
      children: [
        { name: 'Augmented reality Revolving Tower info', path: '/dialogue/revolving-tower', status: 'available' },
        { name: 'Gallery Revolving Tower info', path: '/dialogue/revolving-tower-gallery', status: 'available' },
      ],
    },
  ];

  const handleManage = (path) => {
    console.log('Navigating to:', path);
    navigate(path, { state: { role: currentUserRole } });
  };

  const toggleRow = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
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
                <th>Location</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, index) => (
                <React.Fragment key={loc.name}>
                  <tr>
                    <td>{loc.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                          variant={openIndex === index ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleRow(index)}
                          aria-expanded={openIndex === index}
                          aria-controls={`nested-${index}`}
                        >
                          {openIndex === index ? 'Close' : 'Open'}
                        </Button>
  

                      </div>
                    </td>
                  </tr>

                  {openIndex === index && (
                    <tr id={`nested-${index}`}>
                      <td colSpan={2} style={{ background: '#f9f9f9' }}>
                        <Table size="sm" bordered hover className="mb-0">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Manage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loc.children?.map((child) => (
                              <tr key={child.name}>
                                <td>{child.name}</td>
                                <td>
                                  {child.status === 'available' ? (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleManage(child.path)}
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Dialogue;