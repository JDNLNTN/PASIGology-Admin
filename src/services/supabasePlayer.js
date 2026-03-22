import { supabase } from './supabase';

// Password requirements configuration
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 32,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// NOTE: Do NOT store or use the service_role key in client-side code.
// The code below intentionally avoids creating an admin client. If you
// need elevated access, call a server-side endpoint that uses the
// service_role key securely.

// We reuse the shared `supabase` client from services/supabase.js. Any initialization
// (session checks or admin checks) should be done in that module to avoid creating
// multiple GoTrue clients during HMR.

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
        'PASIGology',
        'announcements'
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
