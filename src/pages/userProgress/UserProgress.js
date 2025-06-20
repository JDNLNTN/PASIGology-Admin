import React, { useState, useEffect } from 'react';
import { Card, Table, ProgressBar } from 'react-bootstrap';
import { supabase } from '../../services/supabase';

function UserProgress() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const calculateProgress = (user) => {
    const locations = [
      'emmacula',
      'plazarizal',
      'dimas_ala',
      'cityhall',
      'bahaynatis',
      'pasigcitym',
      'pasig_pale',
      'rainforest_',
      'arcovia',
      'the_pariar'
    ];

    const completedLocations = locations.filter(location => {
      // Convert the value to boolean explicitly
      return Boolean(user[location]);
    });
    
    const progress = (completedLocations.length / locations.length) * 100;
    return progress;
  };

  const getProgressVariant = (progress) => {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'info';
    if (progress >= 20) return 'warning';
    return 'danger';
  };

  // Add this function to debug the values
  const debugUserProgress = (user) => {
    console.log('User:', user.username);
    console.log('emmacula:', user.emmacula);
    console.log('plazarizal:', user.plazarizal);
    console.log('dimas_ala:', user.dimas_ala);
    console.log('cityhall:', user.cityhall);
    console.log('bahaynatis:', user.bahaynatis);
    console.log('pasigcitym:', user.pasigcitym);
    console.log('pasig_pale:', user.pasig_pale);
    console.log('rainforest_:', user.rainforest_);
    console.log('arcovia:', user.arcovia);
    console.log('the_pariar:', user.the_pariar);
  };

  return (
    <div className="user-progress p-4">
      <h2 className="mb-4">User Progress</h2>
      <Card>
        <Card.Body>
          {users.length === 0 ? (
            <div className="text-center py-4">
              <h4>No users found</h4>
              <p className="text-muted">There are no users in the progress table.</p>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  // Debug the user data
                  debugUserProgress(user);
                  
                  const progress = calculateProgress(user);
                  return (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <ProgressBar
                            now={progress}
                            variant={getProgressVariant(progress)}
                            className="flex-grow-1 me-2"
                            label={`${Math.round(progress)}%`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default UserProgress; 