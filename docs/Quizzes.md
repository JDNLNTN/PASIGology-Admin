# Quizzes: Overview and How-To (Beginner Friendly)

This app lists quiz sites in a single overview and opens a dedicated "Manage" page for each site. A separate Stats page shows user attempts per site.

## Files and Folders
- `src/pages/quiz/QuizOverview.js` — The overview list (Sites + Actions).
- `src/pages/quiz/manage/` — Individual manage pages per site:
  - `ChurchManage.js` → reads `quiz_church`
  - `PlazaRizalManage.js` → reads `quiz_plaza_rizal`
  - `BahayNaTisaManage.js` → reads `quiz_bnt`
  - `DimasalangManage.js` → reads `quiz_dimasalang`
  - `RevolvingTowerManage.js` → reads `quiz_revolving_tower`
- `src/pages/quiz/stats/QuizStats.js` — Shows attempts for a site based on the route param.
- `src/config/attemptTables.js` — Allowlist of attempt tables that exist in your Supabase project.
- `src/App.js` — Routes for the five manage pages and the stats page.

## How routing works
- Manage pages use kebab-case paths for consistency:
  - `/quiz/manage/church`
  - `/quiz/manage/plaza-rizal`
  - `/quiz/manage/bnt`
  - `/quiz/manage/dimasalang`
  - `/quiz/manage/revolving-tower`
- Stats uses a single route with a parameter: `/quiz/stats/:tableName`.
  - The `:tableName` token is mapped inside `QuizStats.js` (see `quizTableMap`).

## How the Overview builds links
`QuizOverview.js` uses a small array of objects:
```
{ site, path, table, statsToken }
```
- `site`: Display name in the table.
- `path`: Route for the Manage button.
- `table`: The Supabase table that stores quiz items.
- `statsToken`: Token passed to the Stats page (mapped to an attempt table in `QuizStats.js`).

## Stats mapping and allowlist
- `QuizStats.js` maps each token (e.g. `quiz_church`) to a real Supabase attempts table (e.g. `attempt_immaculate_scores`).
- `ENABLED_ATTEMPT_TABLES` in `src/config/attemptTables.js` must include the exact attempts tables that exist in your Supabase project. If it’s not enabled there, Stats will show a friendly error instead of querying a missing table.

## Adding a new site (step-by-step)
1. Create a manage page in `src/pages/quiz/manage/YourSiteManage.js`:
   - Import `{ supabase }` from `src/services/supabase`.
   - Query your question table with `supabase.from('<your_table>').select('*')`.
2. Add a route in `src/App.js`:
   - Import your component and add `<Route path="/quiz/manage/your-site" element={<YourSiteManage />} />` inside the protected routes.
3. Update `QuizOverview.js`:
   - Add an entry to the `quizData` list with `{ site, path, table, statsToken }`.
4. Update `QuizStats.js` mapping:
   - Add a key for your `statsToken` pointing to the attempts table, e.g. `'quiz_your_site': { table: 'attempt_your_site_scores', display: 'Your Site' }`.
5. Allow the attempts table:
   - Add `'attempt_your_site_scores'` to `ENABLED_ATTEMPT_TABLES` in `src/config/attemptTables.js`.

## Common issues and fixes
- 404 when clicking Manage: Ensure the path in `QuizOverview.js` exactly matches the route in `App.js` (React Router v6 is case-sensitive).
- Stats shows "table not enabled": Add the attempts table to `ENABLED_ATTEMPT_TABLES`.
- Supabase error: Double-check the exact table name in Supabase and in your query.

## Where to customize next
- Replace the temporary table rendering with real CRUD UI in each manage page.
- Add role-based restrictions inside manage pages if needed.
- Extend Stats to filter/sort and show more columns as your attempts schema grows.
