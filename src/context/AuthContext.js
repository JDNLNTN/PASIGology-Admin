import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the AuthContext
const AuthContext = createContext();

// AuthProvider component to wrap your app
export const AuthProvider = ({ children }) => {
  // For now, use dummy user and role. Replace with real auth logic as needed.
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Example: fetch user and role from localStorage or API
    // Here, we just set dummy values for demonstration
    setUser({ name: 'Demo User', email: 'demo@example.com' });
    setRole('super_admin');
  }, []);

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Usage:
// Wrap your app with <AuthProvider> in index.js or App.js
// Use useAuth() in components to access user and role 