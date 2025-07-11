import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Create the AuthContext
export const AuthContext = createContext();

// AuthProvider component to wrap your app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserAndRole = async () => {
      setLoading(true);
      // Get session/user from Supabase
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      setUser(supaUser);

      if (supaUser) {
        // Fetch role from administrators table
        const { data, error } = await supabase
          .from('administrators')
          .select('role')
          .eq('id', supaUser.id)
          .single();

        if (data && data.role) {
          setRole(data.role);
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    getUserAndRole();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
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