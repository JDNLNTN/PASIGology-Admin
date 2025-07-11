import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

/**
 * Custom hook for authentication-related functions
 * @returns {Object} Authentication utilities
 */
export const useAuth = () => {
    const navigate = useNavigate();
    const [role, setRoleState] = useState(null);
    const [adminId, setAdminIdState] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper to persist to sessionStorage
    const setRole = (value) => {
        setRoleState(value);
        if (value) {
            sessionStorage.setItem('role', value);
        } else {
            sessionStorage.removeItem('role');
        }
    };
    const setAdminId = (value) => {
        setAdminIdState(value);
        if (value) {
            sessionStorage.setItem('adminId', value);
        } else {
            sessionStorage.removeItem('adminId');
        }
    };

    // On mount, restore from sessionStorage if available
    useEffect(() => {
        let isMounted = true;
        const restoreFromSession = () => {
            const storedRole = sessionStorage.getItem('role');
            const storedAdminId = sessionStorage.getItem('adminId');
            if (storedRole && storedAdminId) {
                setRoleState(storedRole);
                setAdminIdState(storedAdminId);
                setLoading(false);
                return true;
            }
            return false;
        };
        const fetchUserRole = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                // Query administrators table for role
                const { data: adminData, error } = await supabase
                    .from('administrators')
                    .select('id, role')
                    .eq('email', user.email)
                    .single();
                if (!error && adminData && isMounted) {
                    setRole(adminData.role);
                    setAdminId(adminData.id);
                } else if (isMounted) {
                    setRole(null);
                    setAdminId(null);
                }
            } else if (isMounted) {
                setRole(null);
                setAdminId(null);
            }
            if (isMounted) setLoading(false);
        };
        if (!restoreFromSession()) {
            fetchUserRole();
        }
        // Listen for auth state changes
        const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
            // Reset state immediately on auth change to avoid stale UI
            setRole(null);
            setAdminId(null);
            setLoading(true);
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                await fetchUserRole();
            }
        });
        // Listen for window focus to re-check sessionStorage
        const onFocus = () => {
            restoreFromSession();
        };
        window.addEventListener('focus', onFocus);
        return () => {
            isMounted = false;
            if (listener && listener.subscription) listener.subscription.unsubscribe();
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    /**
     * Checks if user is logged in
     * @returns {boolean} Whether the user is logged in
     */
    const isLoggedIn = () => {
        return !!adminId && !!role;
    };

    /**
     * Checks if user is super admin
     * @returns {boolean} Whether the user is super admin
     */
    const isSuperAdmin = () => {
        return role === 'super_admin';
    };

    /**
     * Checks if user has permission to perform action
     * @param {string} requiredRole - The required role for the action
     * @returns {boolean} Whether the user has permission
     */
    const hasPermission = (requiredRole) => {
        if (!isLoggedIn()) {
            return false;
        }
        switch (requiredRole) {
            case 'super_admin':
                return role === 'super_admin';
            case 'content_moderator':
                return ['super_admin', 'content_moderator'].includes(role);
            case 'viewer':
                return ['super_admin', 'content_moderator', 'viewer'].includes(role);
            default:
                return false;
        }
    };

    /**
     * Redirects to a path with an optional message
     * @param {string} path - The path to redirect to
     * @param {string} message - Optional message to display
     */
    const redirect = (path, message = null) => {
        if (message) {
            localStorage.setItem('message', message);
        }
        navigate(path);
    };

    return {
        isLoggedIn,
        isSuperAdmin,
        hasPermission,
        redirect,
        role,
        admin_id: adminId,
        loading
    };
};

export default useAuth;