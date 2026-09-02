import { createClient } from '@supabase/supabase-js';

/*
    SECURITY NOTE:
    - Do NOT hard-code the Supabase service role key into client-side code.
    - Place the service role key in a server-only environment variable named
        SUPABASE_SERVICE_ROLE and call getSupabaseAdminClient() only from server
        code (API routes, serverless functions, or CLI scripts).
*/

// Supabase configuration
const supabaseUrl_admin = 'https://njupivejszlekxboevzw.supabase.co';
const supabaseAnonKey_admin = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXBpdmVqc3psZWt4Ym9ldnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4ODc0MTEsImV4cCI6MjA2MjQ2MzQxMX0.BrXxWwu2HUB8k49vE91Lx99MVfbPivWZD6Pq0nYehe4';
// Normalize URLs: allow passing hostnames without protocol and prepend https://
function normalizeSupabaseUrl(u) {
    if (!u || typeof u !== 'string') return u;
    if (/^https?:\/\//i.test(u)) return u;
    return `https://${u}`;
}
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
    _supabaseClient = createClient(supabaseUrl_admin, supabaseAnonKey_admin, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        db: { schema: 'public' }
    });
    if (typeof window !== 'undefined') window.__supabase_client = _supabaseClient;
}

export const supabase = _supabaseClient;

// --- Player client (second anon key) -----------------------------------
// Naming per request: `supabaseUrl_player` and `supabaseAnonKey_player`.
// By default these will fall back to the admin values if the env vars
// are not set, but you can set REACT_APP_SUPABASE_URL_PLAYER and
// REACT_APP_SUPABASE_ANON_KEY_PLAYER in your environment to override.
let _supabasePlayerClient = null;
if (typeof window !== 'undefined' && window.__supabase_player_client) {
    _supabasePlayerClient = window.__supabase_player_client;
} else {
    const supabaseUrl_player_raw = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SUPABASE_URL_PLAYER)
        ? process.env.REACT_APP_SUPABASE_URL_PLAYER
        : 'ubhxzdwtmpcmgixsdjpn.supabase.co';
    const supabaseUrl_player = normalizeSupabaseUrl(supabaseUrl_player_raw);
    const supabaseAnonKey_player = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SUPABASE_ANON_KEY_PLAYER)
        ? process.env.REACT_APP_SUPABASE_ANON_KEY_PLAYER
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHh6ZHd0bXBjbWdpeHNkanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzI2NjMsImV4cCI6MjA3MTQ0ODY2M30.XXmoROIenZKlcaQfTu8QCzhYeR2ddfNs0e7eYT_yXcM';

    _supabasePlayerClient = createClient(supabaseUrl_player, supabaseAnonKey_player, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        db: { schema: 'public' }
    });
    if (typeof window !== 'undefined') window.__supabase_player_client = _supabasePlayerClient;
}

export const supabasePlayer = _supabasePlayerClient;

// --- Clients registry + getOrCreate API ---------------------------------
// Registry is stored on window for HMR safety in the browser.
let _supabaseClients = (typeof window !== 'undefined' && window.__supabase_clients)
    ? window.__supabase_clients
    : {};
if (typeof window !== 'undefined') window.__supabase_clients = _supabaseClients;

/**
 * Create or return an existing Supabase client deduped by (origin + anonKey).
 * The function accepts a config object { url, anonKey } and returns a
 * Supabase client. This dedupes by the pair so multiple clients for the
 * same project+key will reuse the same instance.
 *
 * @param {{url: string, anonKey: string}} config
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getOrCreateSupabaseClient({ url, anonKey }) {
    if (!url || !anonKey) {
        throw new Error('getOrCreateSupabaseClient requires { url, anonKey }');
    }
    let origin;
    try {
        origin = new URL(url).origin;
    } catch (err) {
        // fallback to raw url if parsing fails
        origin = url;
    }
    const key = `${origin}::${anonKey}`;
    if (!_supabaseClients[key]) {
        _supabaseClients[key] = createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            db: { schema: 'public' }
        });
        if (typeof window !== 'undefined') window.__supabase_clients = _supabaseClients;
    }
    return _supabaseClients[key];
}

// register the existing default and player clients into the registry
try {
    const adminOrigin = new URL(supabaseUrl_admin).origin;
    _supabaseClients[`${adminOrigin}::${supabaseAnonKey_admin}`] = _supabaseClient;
} catch (e) {
    // ignore if URL parsing fails
    _supabaseClients[`admin::${supabaseAnonKey_admin}`] = _supabaseClient;
}

// compute player url/key used earlier (match the same fallback behavior)
const _supabaseUrl_player_env = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SUPABASE_URL_PLAYER)
    ? process.env.REACT_APP_SUPABASE_URL_PLAYER
    : supabaseUrl_admin;
const _supabaseAnonKey_player_env = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SUPABASE_ANON_KEY_PLAYER)
    ? process.env.REACT_APP_SUPABASE_ANON_KEY_PLAYER
    : supabaseAnonKey_admin;
try {
    const playerOrigin = new URL(_supabaseUrl_player_env).origin;
    _supabaseClients[`${playerOrigin}::${_supabaseAnonKey_player_env}`] = _supabasePlayerClient;
} catch (e) {
    _supabaseClients[`player::${_supabaseAnonKey_player_env}`] = _supabasePlayerClient;
}


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
        supabaseAdminInstance = createClient(supabaseUrl_admin, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            db: { schema: 'public' }
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

        // Dev-only: ping announcements visibility to catch 404/privilege issues early
        try {
            const isDev = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
            if (typeof window !== 'undefined' && isDev) {
                const { error, status } = await supabase
                    .from('announcements')
                    .select('id', { count: 'exact', head: true })
                    .limit(1);
                if (error) {
                    console.warn('Announcements visibility issue:', { status, error });
                } else {
                    console.log('Announcements relation visible');
                }
            }
        } catch (err) {
            console.warn('Announcements ping failed:', err && err.message ? err.message : err);
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
