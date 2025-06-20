import { supabase } from './services/supabase';

async function testSupabaseConnection() {
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

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testSupabaseConnection(); 