import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ubhxzdwtmpcmgixsdjpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHh6ZHd0bXBjbWdpeHNkanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzI2NjMsImV4cCI6MjA3MTQ0ODY2M30.XXmoROIenZKlcaQfTu8QCzhYeR2ddfNs0e7eYT_yXcM';

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

// NOTE: Do NOT store or use the service_role key in client-side code.
// The code below intentionally avoids creating an admin client. If you
// need elevated access, call a server-side endpoint that uses the
// service_role key securely.

// Initialize and test connections
const initializeConnections = async () => {
    try {
        // Test regular client connection
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log('Active session found:', session.user.email);
        }

        // Test reading from the common 'profile' table (singular) using the anon key.
        // If your schema uses 'profiles' change the table name accordingly or
        // pass a table option to `fetchProfiles` below.
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .limit(1);

            if (profileError) {
                console.warn('Reading from public.profiles failed (this may be expected until you configure RLS):', profileError.message || profileError);
            } else {
                console.log('Able to read from public.profiles (anon):', profileData?.length ?? 0);
            }
        } catch (err) {
            console.warn('Error testing profiles read:', err?.message || err);
        }
    } catch (error) {
        console.error('Error initializing connections:', error);
    }
};

// Initialize connections when the module is loaded
initializeConnections();

// Helper: fetch records from the public 'profiles' table using the anon key.
// Returns { data, error } — call from your components.
export const fetchProfiles = async (opts = {}) => {
    // opts can include table (string), select (string), match/filter, limit, etc.
    // We'll attempt the requested table, and fall back to common variants
    // to avoid hard failures when the table name differs between projects.
    const requestedTable = opts.table;
    const select = opts.select || '*';
    const limit = opts.limit;

    const tryTable = async (table) => {
        try {
            let q = supabase.from(table).select(select);
            if (limit) q = q.limit(limit);
            const { data, error } = await q;
            return { data, error };
        } catch (err) {
            return { data: null, error: err };
        }
    };

    // Common table name candidates used across projects. Add your project's
    // table name here if it's different.
    const commonCandidates = [
        'profiles',
        'profile',
        'users',
        'user_profiles',
        'players',
        'player_profiles',
        'PASIGology'
    ];

    // Build the ordered list of tables to try.
    const tablesToTry = [];
    if (requestedTable) {
        tablesToTry.push(requestedTable);
        // if requested was singular/plural, add the alternate
        if (requestedTable === 'profile') tablesToTry.push('profiles');
        if (requestedTable === 'profiles') tablesToTry.push('profile');
        // also add common candidates that aren't duplicates
        for (const c of commonCandidates) if (!tablesToTry.includes(c)) tablesToTry.push(c);
    } else {
        tablesToTry.push(...commonCandidates);
    }

    // Keep per-table diagnostics to build a helpful error for the caller.
    const diagnostics = [];

    for (const table of tablesToTry) {
        const { data, error } = await tryTable(table);
        if (!error && data) {
            // successful read
            console.log(`fetchProfiles: succesfully read table '${table}' (rows: ${Array.isArray(data) ? data.length : 'unknown'})`);
            return { data, error: null, tableUsed: table };
        }

        const message = (error && (error.message || error.msg || String(error))) || 'no response';
        diagnostics.push({ table, message });

        // If the error message indicates the table doesn't exist, try next candidate.
        if (/Could not find the table|does not exist|relation "public\./i.test(message)) {
            continue;
        }

        // For permission or other runtime errors, include diagnostics and return
        // immediately — this is likely an RLS/permission problem rather than a
        // missing-table problem and should be surfaced to the caller.
        console.warn(`fetchProfiles: table='${table}' returned error: ${message}`);
        return { data: null, error: new Error(`Error reading table '${table}': ${message}`) };
    }

    // None of the candidate tables worked. Return an aggregated, actionable error.
    const diagText = diagnostics.map(d => `${d.table}: ${d.message}`).join('; ');
    const tried = tablesToTry.join(', ');
    return { data: null, error: new Error(`Could not find a suitable table (tried: ${tried}). Per-table diagnostics: ${diagText}. Check your Supabase project's table names and RLS policies.`) };
};
