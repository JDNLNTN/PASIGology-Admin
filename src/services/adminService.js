import { supabase } from './supabase';
import { validatePassword } from '../utils/passwordValidation';

class AdminService {
    constructor() {
        this.table = 'administrators';
    }

    /**
     * Get all administrators
     * @returns {Promise<Array>} Array of administrators
     */
    async getAll() {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*');
                console.error('success', error);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching administrators:', error);
            throw error;
        }
    }

    /**
     * Get administrator by ID
     * @param {string} id - Administrator ID
     * @returns {Promise<Object>} Administrator data
     */
    async getById(id) {
        try {
            const { data, error } = await supabase
                .from(this.table)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching administrator ${id}:`, error);
            throw error;
        }
    }

    /**
     * Find administrator by email
     * @param {string} email - Administrator email
     * @returns {Promise<Object>} Administrator data
     */
    async findByEmail(email) {
        try {
            console.log(`adminService: Attempting to find admin by email: ${email}`);
            
            // First check if the user exists in auth.users
            const { data: authData, error: authError } = await supabase.auth.admin.getUserByEmail(email);
            console.log('adminService: Auth user check:', { authData, authError });

            if (authError) {
                console.error('adminService: Error checking auth user:', authError);
                return null;
            }

            // Then check the administrators table
            const { data, error } = await supabase
                .from(this.table)
                .select('id, email, role, status, name')
                .eq('email', email)
                .single();

            console.log('adminService: findByEmail Supabase response:', { data, error });

            if (error) {
                console.error('adminService: Error finding administrator:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error(`adminService: Error finding administrator by email ${email}:`, error);
            return null;
        }
    }

    /**
     * Login administrator
     * @param {string} email - Administrator email
     * @param {string} password - Administrator password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password) {
        try {
            console.log('adminService: Attempting login for:', email);
            
            // First, try to sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            console.log('adminService: Auth sign in result:', { authData, authError });

            if (authError) {
                console.error('adminService: Auth sign in error:', authError);
                throw new Error(authError.message);
            }

            // Then check if they have an admin profile
            const adminData = await this.findByEmail(email);
            console.log('adminService: Admin profile check result:', adminData);

            if (!adminData) {
                console.error('adminService: No admin profile found for:', email);
                // Sign out the user since they don't have an admin profile
                await supabase.auth.signOut();
                throw new Error('No administrator profile found');
            }

            // Check if admin is banned
            if (adminData.status === 'banned') {
                console.error('adminService: Admin is banned:', email);
                await supabase.auth.signOut();
                throw new Error('This account has been banned');
            }

            return {
                user: authData.user,
                admin: adminData
            };
        } catch (error) {
            console.error('adminService: Login error:', error);
            throw error;
        }
    }

    /**
     * Create new administrator
     * @param {Object} data - Administrator data
     * @returns {Promise<Object>} Created administrator
     */
    async create(data) {
        try {
            // Validate password
            const passwordErrors = validatePassword(data.password);
            if (passwordErrors.length > 0) {
                throw new Error(passwordErrors.join('\n'));
            }

            // Check if email already exists
            const existingAdmin = await this.findByEmail(data.email);
            if (existingAdmin) {
                throw new Error('Email already exists');
            }

            // Create the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        role: data.role,
                        email_verified: true
                    }
                }
            });

            if (authError) throw authError;

            // Wait a moment for the trigger to create the administrator record
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update the administrator profile with additional data
            const { data: updatedAdmin, error: updateError } = await supabase
                .from(this.table)
                .update({
                    name: data.name,
                    role: data.role,
                    status: data.status || 'active'
                })
                .eq('id', authData.user.id)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating administrator:', updateError);
                // If update fails, try to get the existing record
                const { data: existingRecord, error: getError } = await supabase
                    .from(this.table)
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (getError) {
                    // If we can't get the record, something is wrong
                    throw getError;
                }

                return existingRecord;
            }

            return updatedAdmin;
        } catch (error) {
            console.error('Error creating administrator:', error);
            throw error;
        }
    }

    /**
     * Update administrator
     * @param {string} id - Administrator ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated administrator
     */
    async update(id, data) {
        try {
            if (data.password) {
                const passwordErrors = validatePassword(data.password);
                if (passwordErrors.length > 0) {
                    throw new Error(passwordErrors.join('\n'));
                }
            }

            const { data: updatedAdmin, error } = await supabase
                .from(this.table)
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updatedAdmin;
        } catch (error) {
            console.error(`Error updating administrator ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete administrator
     * @param {string} id - Administrator ID
     * @returns {Promise<void>}
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from(this.table)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error(`Error deleting administrator ${id}:`, error);
            throw error;
        }
    }

    /**
     * Check if any super admin exists
     * @returns {Promise<boolean>} True if super admin exists
     */
    async checkSuperAdminExists() {
        try {
            // First try a simple count query
            const { count, error: countError } = await supabase
                .from(this.table)
                .select('*', { count: 'exact', head: true })
                .eq('role', 'super_admin');

            if (countError) {
                console.error('Count query failed:', countError);
                // Fallback to a regular select query
                const { data, error: selectError } = await supabase
                    .from(this.table)
                    .select('id')
                    .eq('role', 'super_admin')
                    .limit(1);

                if (selectError) {
                    console.error('Select query failed:', selectError);
                    return false;
                }

                return data && data.length > 0;
            }

            return count > 0;
        } catch (error) {
            console.error('Error checking super admin:', error);
            return false;
        }
    }

    /**
     * Log administrator login
     * @param {string} adminId - Administrator ID
     * @param {string} action - Action performed
     * @param {string} status - Status of the action
     * @returns {Promise<void>}
     */
    async logLogin(adminId, action, status = 'success') {
        try {
            const { error } = await supabase
                .from('login_logs')
                .insert([{
                    admin_id: adminId,
                    action,
                    status,
                    timestamp: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error logging login:', error);
            throw error;
        }
    }

    /**
     * Log administrator activity
     * @param {string} adminId - Administrator ID
     * @param {string} action - Action performed
     * @param {string} details - Additional details
     * @returns {Promise<void>}
     */
    async logActivity(adminId, action, details = '') {
        try {
            const { error } = await supabase
                .from('admin_logs')
                .insert([{
                    admin_id: adminId,
                    action,
                    details,
                    timestamp: new Date().toISOString()
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Error logging activity:', error);
            throw error;
        }
    }

    /**
     * Get login logs
     * @returns {Promise<Array>} Array of login logs
     */
    async getLoginLogs() {
        try {
            const { data, error } = await supabase
                .from('login_logs')
                .select(`
                    *,
                    administrators (
                        name,
                        email
                    )
                `)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching login logs:', error);
            throw error;
        }
    }

    /**
     * Get admin activity logs
     * @returns {Promise<Array>} Array of activity logs
     */
    async getAdminLogs() {
        try {
            const { data, error } = await supabase
                .from('admin_logs')
                .select(`
                    *,
                    administrators (
                        name,
                        email
                    )
                `)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching admin logs:', error);
            throw error;
        }
    }
}

export const adminService = new AdminService(); 