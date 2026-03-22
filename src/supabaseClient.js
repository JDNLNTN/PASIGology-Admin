// Re-export the shared singleton Supabase client from services/supabase
// This file used to create a separate client which could cause multiple GoTrue instances.
// To avoid that, import and re-export the single shared client.
import { supabase, getSupabaseAdminClient } from './services/supabase';

export { supabase, getSupabaseAdminClient };