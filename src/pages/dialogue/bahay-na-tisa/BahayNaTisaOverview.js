import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function BahayNaTisaOverview() {
  const { role } = useAuth();
  return (
    <div>
      <h3>Augmented reality Bahay na tisa info</h3>
      <p>Role: {String(role)}</p>
    </div>
  );
}
