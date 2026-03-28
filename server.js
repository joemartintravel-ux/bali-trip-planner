const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use a persistent path if available (Railway volume), otherwise local
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

// Set up database
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rsvp TEXT NOT NULL,
    dates TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Submit or update a response
app.post('/api/responses', (req, res) => {
  const { name, rsvp, dates } = req.body;
  if (!name || !rsvp) {
    return res.status(400).json({ error: 'Name and RSVP are required' });
  }
  if (!['yes', 'maybe', 'no'].includes(rsvp)) {
    return res.status(400).json({ error: 'Invalid RSVP value' });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const datesJson = JSON.stringify(dates || []);

  const stmt = db.prepare(`
    INSERT INTO responses (id, name, rsvp, dates, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      rsvp = excluded.rsvp,
      dates = excluded.dates,
      created_at = datetime('now')
  `);
  stmt.run(id, name.trim(), rsvp, datesJson);

  res.json({ ok: true });
});

// Get all responses
app.get('/api/responses', (req, res) => {
  const rows = db.prepare('SELECT * FROM responses ORDER BY created_at DESC').all();
  const responses = rows.map(r => ({
    ...r,
    dates: JSON.parse(r.dates)
  }));
  res.json(responses);
});

app.listen(PORT, () => {
  console.log(`Bali Trip Planner running on port ${PORT}`);
});
