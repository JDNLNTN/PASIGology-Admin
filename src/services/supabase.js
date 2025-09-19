import { createClient } from '@supabase/supabase-js';

/*
    SECURITY NOTE:
    - Do NOT hard-code the Supabase service role key into client-side code.
    - Place the service role key in a server-only environment variable named
        SUPABASE_SERVICE_ROLE and call getSupabaseAdminClient() only from server
        code (API routes, serverless functions, or CLI scripts).
*/

// Supabase configuration
const supabaseUrl = 'https://njupivejszlekxboevzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXBpdmVqc3psZWt4Ym9ldnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4ODc0MTEsImV4cCI6MjA2MjQ2MzQxMX0.BrXxWwu2HUB8k49vE91Lx99MVfbPivWZD6Pq0nYehe4';
// IMPORTANT: Do NOT store or hard-code the service role key in client-side source.
// The service role key must only be available on a trusted server environment.
// Read it from a server-only environment variable when running on the server.
const serviceRoleKey = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_SERVICE_ROLE)
    ? process.env.SUPABASE_SERVICE_ROLE
    : null;

// Password requirements configuration
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 32,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Create a single Supabase client instance for regular operations
// Ensure single supabase client instance across HMR / multiple module loads
let _supabaseClient = null;
if (typeof window !== 'undefined' && window.__supabase_client) {
    _supabaseClient = window.__supabase_client;
} else {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    if (typeof window !== 'undefined') window.__supabase_client = _supabaseClient;
}

export const supabase = _supabaseClient;

// Create a single instance of the Supabase admin client
let supabaseAdminInstance = null;

export const getSupabaseAdminClient = () => {
    if (!supabaseAdminInstance) {
        // Only create an admin/service-role client in server-side environments
        // where SUPABASE_SERVICE_ROLE is set. Creating it in the browser would
        // expose the service key to end users.
        if (typeof window !== 'undefined') {
            throw new Error('getSupabaseAdminClient must be called from server-side code only.');
        }
        if (!serviceRoleKey) {
            throw new Error('SUPABASE_SERVICE_ROLE environment variable is not set on the server.');
        }
        supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    }
    return supabaseAdminInstance;
};

// Initialize and test connections
const initializeConnections = async () => {
    try {
        // Test regular client connection
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log('Active session found:', session.user.email);
        }

        // Test admin connection only on server-side where the service role key
        // is available. Skip on the browser to avoid exposing the service key.
        try {
            if (typeof window === 'undefined' && serviceRoleKey) {
                const { data, error } = await getSupabaseAdminClient()
                    .from('administrators')
                    .select('count')
                    .single();
                if (error) {
                    console.error('Error testing admin connection:', error);
                } else {
                    console.log('Supabase admin connection successful');
                }
            } else {
                console.log('Skipping admin connection test in browser or without service key.');
            }
        } catch (err) {
            console.warn('Admin client not initialized:', err.message);
        }
    } catch (error) {
        console.error('Error initializing connections:', error);
    }
};

// Initialize connections when the module is loaded
// Run initializeConnections once per page load (avoid re-running on HMR reloads)
if (typeof window !== 'undefined') {
    if (!window.__supabase_initialized) {
        initializeConnections();
        window.__supabase_initialized = true;
    }
} else {
    // In non-browser environments, just run it once
    initializeConnections();
}
