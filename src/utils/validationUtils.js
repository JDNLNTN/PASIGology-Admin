/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @returns {boolean} - Whether the password meets requirements
 */
export const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?:{}|<>])[A-Za-z\d!@#$%^&*(),.?:{}|<>]{8,}$/;
    return passwordRegex.test(password);
};

/**
 * Validates an age
 * @param {number|string} age - The age to validate
 * @returns {boolean} - Whether the age is valid
 */
export const validateAge = (age) => {
    const numAge = Number(age);
    return !isNaN(numAge) && numAge >= 0;
};

/**
 * Validates a sex value
 * @param {string} sex - The sex to validate
 * @returns {boolean} - Whether the sex is valid
 */
export const validateSex = (sex) => {
    return ['Male', 'Female'].includes(sex);
};

/**
 * Validates a role
 * @param {string} role - The role to validate
 * @returns {boolean} - Whether the role is valid
 */
export const validateRole = (role) => {
    return ['super admin', 'content moderator'].includes(role);
}; 