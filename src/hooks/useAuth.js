import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for authentication-related functions
 * @returns {Object} Authentication utilities
 */
export const useAuth = () => {
    const navigate = useNavigate();

    /**
     * Checks if user is logged in
     * @returns {boolean} Whether the user is logged in
     */
    const isLoggedIn = useCallback(() => {
        return !!localStorage.getItem('admin_id') && !!localStorage.getItem('role');
    }, []);

    /**
     * Checks if user is super admin
     * @returns {boolean} Whether the user is super admin
     */
    const isSuperAdmin = useCallback(() => {
        return localStorage.getItem('role') === 'super_admin';
    }, []);

    /**
     * Checks if user has permission to perform action
     * @param {string} requiredRole - The required role for the action
     * @returns {boolean} Whether the user has permission
     */
    const hasPermission = useCallback((requiredRole) => {
        if (!isLoggedIn()) {
            return false;
        }

        const userRole = localStorage.getItem('role');

        switch (requiredRole) {
            case 'super_admin':
                return userRole === 'super_admin';
            case 'content_moderator':
                return ['super_admin', 'content_moderator'].includes(userRole);
            case 'viewer':
                return ['super_admin', 'content_moderator', 'viewer'].includes(userRole);
            default:
                return false;
        }
    }, [isLoggedIn]);

    /**
     * Redirects to a path with an optional message
     * @param {string} path - The path to redirect to
     * @param {string} message - Optional message to display
     */
    const redirect = useCallback((path, message = null) => {
        if (message) {
            localStorage.setItem('message', message);
        }
        navigate(path);
    }, [navigate]);

    return {
        isLoggedIn,
        isSuperAdmin,
        hasPermission,
        redirect
    };
};

export default useAuth; 