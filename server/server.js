const path = require('path');
const crypto = require('crypto');

const express = require('express');

const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// CORS (pentru cazul când paginile sunt deschise din alt origin, ex. Live Server)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [saltHex, hashHex] = String(stored).split(':');
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function createSession(db, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  await db.run(
    'INSERT INTO sessions(token, user_id, created_at, expires_at) VALUES(?,?,?,?)',
    token,
    userId,
    nowIso(),
    addDaysIso(7)
  );
  return token;
}

async function getUserByToken(db, token) {
  const t = String(token ?? '').trim();
  if (!t) return null;

  const row = await db.get(
    `SELECT u.id, u.name, u.email
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    t,
    nowIso()
  );
  return row || null;
}

// API
app.post('/api/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');

  if (!name) return res.status(400).json({ ok: false, error: 'Completează câmpul „Nume”.' });
  if (!email) return res.status(400).json({ ok: false, error: 'Completează câmpul „Email”.' });
  if (password.length < 6)
    return res.status(400).json({ ok: false, error: 'Parola trebuie să aibă minim 6 caractere.' });

  const db = await getDb();

  const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
  if (existing) return res.status(409).json({ ok: false, error: 'Există deja un cont cu acest email.' });

  const password_hash = hashPassword(password);
  const created_at = nowIso();

  const result = await db.run(
    'INSERT INTO users(name, email, password_hash, created_at) VALUES(?,?,?,?)',
    name,
    email,
    password_hash,
    created_at
  );

  const userId = result.lastID;
  const token = await createSession(db, userId);

  return res.json({ ok: true, token, user: { name, email } });
});

app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');

  if (!email) return res.status(400).json({ ok: false, error: 'Completează câmpul „Email”.' });
  if (!password) return res.status(400).json({ ok: false, error: 'Completează câmpul „Parolă”.' });

  const db = await getDb();
  const user = await db.get('SELECT id, name, email, password_hash FROM users WHERE email = ?', email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ ok: false, error: 'Email sau parolă incorecte.' });
  }

  const token = await createSession(db, user.id);
  return res.json({ ok: true, token, user: { name: user.name, email: user.email } });
});

app.get('/api/me', async (req, res) => {
  const token = String(req.query?.token ?? '').trim();
  const db = await getDb();
  const user = await getUserByToken(db, token);
  if (!user) return res.status(401).json({ ok: false, error: 'Neautorizat.' });
  return res.json({ ok: true, user });
});

app.post('/api/logout', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  if (!token) return res.json({ ok: true });
  const db = await getDb();
  await db.run('DELETE FROM sessions WHERE token = ?', token);
  return res.json({ ok: true });
});

app.get('/api/messages', async (req, res) => {
  const token = String(req.query?.token ?? '').trim();
  const db = await getDb();
  const user = await getUserByToken(db, token);
  if (!user) return res.status(401).json({ ok: false, error: 'Neautorizat.' });

  const rows = await db.all(
    `SELECT id, name, email, message, created_at
     FROM messages
     ORDER BY id DESC
     LIMIT 10`
  );
  return res.json({ ok: true, messages: rows });
});

app.post('/api/messages', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  const message = String(req.body?.message ?? '').trim();

  const db = await getDb();
  const user = await getUserByToken(db, token);
  if (!user) return res.status(401).json({ ok: false, error: 'Neautorizat.' });
  if (!message) return res.status(400).json({ ok: false, error: 'Completează câmpul „Mesaj”.' });

  const name = String(req.body?.name ?? user.name ?? '').trim() || 'Anonim';
  const email = String(req.body?.email ?? user.email ?? '').trim() || user.email;

  await db.run(
    'INSERT INTO messages(user_id, name, email, message, created_at) VALUES(?,?,?,?,?)',
    user.id,
    name,
    email,
    message,
    nowIso()
  );

  return res.json({ ok: true });
});

// Lab 4: afișare date din DB în tabele (utilizatori + mesaje)
app.get('/api/admin/data', async (req, res) => {
  const token = String(req.query?.token ?? '').trim();
  const db = await getDb();
  const user = await getUserByToken(db, token);
  if (!user) return res.status(401).json({ ok: false, error: 'Neautorizat.' });

  const users = await db.all(
    `SELECT id, name, email, created_at
     FROM users
     ORDER BY id DESC
     LIMIT 50`
  );

  const messages = await db.all(
    `SELECT id, user_id, name, email, message, created_at
     FROM messages
     ORDER BY id DESC
     LIMIT 50`
  );

  return res.json({ ok: true, users, messages });
});

// Static site
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

// Default: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
