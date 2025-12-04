import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function RevolvingTowerOverview() {
  const { role } = useAuth();
  return (
    <div>
      <h3>Augmented reality Revolving Tower info</h3>
      <p>Role: {String(role)}</p>
    </div>
  );
}
