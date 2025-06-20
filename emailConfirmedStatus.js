const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Replace with your actual Supabase project URL and service role key
const supabaseUrl = 'https://njupivejszlekxboevzw.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXBpdmVqc3psZWt4Ym9ldnp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njg4NzQxMSwiZXhwIjoyMDYyNDYzNDExfQ.E484GPCBgjtg3qJ4vnyde6NeO9VBxaf4L22Ui91dmmc';
const supabase = createClient(supabaseUrl, serviceRoleKey);

// POST /api/email-confirmed
// Body: { ids: ["uuid1", "uuid2", ...] }
app.post('/api/email-confirmed', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array' });
  }

  try {
    const results = {};
    for (const id of ids) {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      if (error || !data?.user) {
        results[id] = null;
      } else {
        results[id] = !!data.user.email_confirmed_at;
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));