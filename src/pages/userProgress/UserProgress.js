import React, { useState, useEffect } from 'react';
import { Card, Table, ProgressBar, Tabs, Tab } from 'react-bootstrap';
import { supabase, supabasePlayer } from '../../services/supabase';
import AchievementsTab from './AchievementsTab';
//still in error here will fix the user progress first
function UserProgress() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    try {
      // Fetch profiles (id, username, email) and player progress, then join by id
      const [profilesRes, progressRes] = await Promise.all([
        supabasePlayer
          .from('profiles')
          .select('id, username, email')
          .order('username', { ascending: true }),
        supabasePlayer
          .from('player_progress')
          .select('user_id, bakery_done, church_done, rizal_done, tisa_done, tower_done'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (progressRes.error) throw progressRes.error;

      const profiles = profilesRes.data || [];
      const progressRows = progressRes.data || [];

      const progressByUserId = new Map(progressRows.map((r) => [r.user_id, r]));

      const combined = profiles.map((p) => {
        const pr = progressByUserId.get(p.id) || {};
        return {
          id: p.id,
          username: p.username,
          email: p.email,
          bakery_done: pr.bakery_done ?? null,
          church_done: pr.church_done ?? null,
          rizal_done: pr.rizal_done ?? null,
          tisa_done: pr.tisa_done ?? null,
          tower_done: pr.tower_done ?? null,
        };
      });

      setUsers(combined);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const calculateProgress = (user) => {
    const locations = [
      'bakery_done',
      'church_done',
      'rizal_done',
      'tisa_done',
      'tower_done',
    ];

    const isComplete = (code) => {
      if (code == null) return false;
      const c = String(code).trim().toLowerCase();
      return c === 'o' || c === 'v' || c === 's';
    };

    const completedLocations = locations.filter((location) => isComplete(user[location]));

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
    console.log('User id:', user.id);
    console.log('Username:', user.username);
    console.log('bakery_done:', user.bakery_done);
    console.log('church_done:', user.church_done);
    console.log('rizal_done:', user.rizal_done);
    console.log('tisa_done:', user.tisa_done);
    console.log('tower_done:', user.tower_done);
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
            <Tabs defaultActiveKey="progress" id="user-progress-tabs" className="mb-3">
              <Tab eventKey="progress" title="Progress">
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
                        <tr key={user.id ?? `${user.username || user.email || 'unknown'}-row`}>
                          <td>{user.username || user.email || 'Unknown'}</td>
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
              </Tab>
              <Tab eventKey="achievements" title="Achievements">
                <AchievementsTab users={users} />
              </Tab>
            </Tabs>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default UserProgress; 