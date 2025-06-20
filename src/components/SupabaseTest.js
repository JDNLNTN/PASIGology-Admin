import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

function SupabaseTest() {
    const [testResults, setTestResults] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function testConnection() {
            try {
                // Test basic connection
                const { data: testData, error: testError } = await supabase
                    .from('administrators')
                    .select('count')
                    .limit(1);

                console.log('Connection test result:', { testData, testError });

                // Test auth configuration
                const { data: authData, error: authError } = await supabase.auth.getSession();
                console.log('Auth configuration test:', { authData, authError });

                // Log the current configuration
                console.log('Current Supabase URL:', supabase.supabaseUrl);
                console.log('Current Supabase Key:', supabase.supabaseKey);

                setTestResults({
                    testData,
                    testError,
                    authData,
                    authError,
                    supabaseUrl: supabase.supabaseUrl,
                    supabaseKey: supabase.supabaseKey
                });
            } catch (err) {
                console.error('Test failed:', err);
                setError(err.message);
            }
        }

        testConnection();
    }, []);

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!testResults) {
        return <div>Testing connection...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Supabase Connection Test Results</h2>
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
        </div>
    );
}

export default SupabaseTest; 