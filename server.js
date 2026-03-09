const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                  SERIAL PRIMARY KEY,
      username            TEXT NOT NULL UNIQUE,
      password            TEXT NOT NULL,
      identification_code TEXT,
      code_updated_at     TIMESTAMP,
      created_at          TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS identification_code TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS code_updated_at TIMESTAMP`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid    VARCHAR NOT NULL COLLATE "default",
      sess   JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    )
  `);
  console.log('✅ Base de données initialisée');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'habbo-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'Pseudo et mot de passe requis.' });
  if (username.length < 3) return res.json({ success: false, message: 'Pseudo trop court (3 caractères min).' });
  if (password.length < 6) return res.json({ success: false, message: 'Mot de passe trop court (6 caractères min).' });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length > 0) return res.json({ success: false, message: 'Ce pseudo est déjà pris.' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hash]);
    res.json({ success: true, message: 'Compte créé !' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Erreur serveur.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'Pseudo et mot de passe requis.' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.json({ success: false, message: 'Pseudo ou mot de passe incorrect.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Pseudo ou mot de passe incorrect.' });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, redirect: '/dashboard' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Erreur serveur.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, redirect: '/' }));
});

// Sauvegarde le code d'identification en clair
app.post('/api/save-code', async (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Non connecté.' });
  const { code } = req.body;
  if (!code) return res.json({ success: false, message: 'Code vide.' });
  try {
    await pool.query(
      'UPDATE users SET identification_code = $1, code_updated_at = NOW() WHERE id = $2',
      [code, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Erreur serveur.' });
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: req.session.username });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏨 Habbo site lancé sur http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Erreur de connexion à la base de données:', err.message);
  process.exit(1);
});
