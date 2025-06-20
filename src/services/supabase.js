import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://njupivejszlekxboevzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXBpdmVqc3psZWt4Ym9ldnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4ODc0MTEsImV4cCI6MjA2MjQ2MzQxMX0.BrXxWwu2HUB8k49vE91Lx99MVfbPivWZD6Pq0nYehe4';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXBpdmVqc3psZWt4Ym9ldnp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njg4NzQxMSwiZXhwIjoyMDYyNDYzNDExfQ.E484GPCBgjtg3qJ4vnyde6NeO9VBxaf4L22Ui91dmmc';

// Password requirements configuration
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 32,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Create a single Supabase client instance for regular operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Create a single instance of the Supabase admin client
let supabaseAdminInstance = null;

export const getSupabaseAdminClient = () => {
    if (!supabaseAdminInstance) {
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

        // Test admin connection
        const { data, error } = await getSupabaseAdminClient()
            .from('administrators')
            .select('count')
            .single();

        if (error) {
            console.error('Error testing admin connection:', error);
        } else {
            console.log('Supabase admin connection successful');
        }
    } catch (error) {
        console.error('Error initializing connections:', error);
    }
};

// Initialize connections when the module is loaded
initializeConnections();
