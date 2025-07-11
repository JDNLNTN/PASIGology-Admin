import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * useUserRole - React hook to get the current user's role from Supabase.
 *
 * Usage:
 *   const { role, loading, error } = useUserRole();
 *   // role: 'super_admin', 'content_mod', or null
 */
export default function useUserRole() {
  const { role, loading, error } = useContext(AuthContext);
  return { role, loading, error };
}
