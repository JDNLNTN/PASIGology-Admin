const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// POST /api/admin/delete-intro
// Body: { id }
// Authorization: Bearer <user_access_token>
app.post('/api/admin/delete-intro', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id in request body' });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });

    // Verify the token corresponds to a valid user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }
    const userId = userData.user.id;

    // Verify the user has super_admin role in administrators table
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('administrators')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();
    if (adminErr) return res.status(500).json({ error: 'Error checking admin role', detail: adminErr.message });
    if (!adminRow || String(adminRow.role) !== 'super_admin') return res.status(403).json({ error: 'Not authorized' });

    // Perform the privileged delete
    const { data, error } = await supabaseAdmin.from('intro').delete().eq('id', id).select();
    if (error) return res.status(500).json({ error });

    return res.json({ data });
  } catch (err) {
    console.error('Server error in delete-intro:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// If run directly, start a server for local testing
if (require.main === module) {
  const port = process.env.PORT || 8787;
  app.listen(port, () => console.log(`Admin delete endpoint listening on http://localhost:${port}`));
}

module.exports = app;
