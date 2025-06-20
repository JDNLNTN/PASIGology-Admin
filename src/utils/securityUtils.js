/**
 * Sanitizes input data
 * @param {string} data - The data to sanitize
 * @returns {string} - The sanitized data
 */
export const sanitizeInput = (data) => {
    if (typeof data !== 'string') return data;
    return data.trim().replace(/[<>]/g, '');
};

/**
 * Generates a CSRF token
 * @returns {string} - The generated CSRF token
 */
export const generateCSRFToken = () => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('csrf_token', token);
    return token;
};

/**
 * Validates a CSRF token
 * @param {string} token - The token to validate
 * @returns {boolean} - Whether the token is valid
 */
export const validateCSRFToken = (token) => {
    const storedToken = localStorage.getItem('csrf_token');
    return storedToken === token;
}; 