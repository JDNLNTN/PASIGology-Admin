import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function PlazaRizalOverview() {
  const { role } = useAuth();
  return (
    <div>
      <h3>Augmented reality Plaza Rizal info</h3>
      <p>Role: {String(role)}</p>
    </div>
  );
}
