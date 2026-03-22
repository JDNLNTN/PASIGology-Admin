// Central list of attempt tables that actually exist in the current DB.
// Toggle entries here to avoid making requests to tables that aren't present in the project.
// Keep this file small and commit-safe.

export const ENABLED_ATTEMPT_TABLES = [
  // Enable the attempt tables that exist in your Supabase project.
  'attempt_plazarizal_scores',
  'attempt_immaculate_scores',
  'attempt_bahaynatisa_scores',
  'attempt_dimas_alangbakery_identification_scores',
  'attempt_revolving_tower_scores',
];
