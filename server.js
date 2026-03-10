const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      personal_note TEXT,
      note_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS launch_requested BOOLEAN DEFAULT FALSE
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS personal_note TEXT
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMP
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
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
  store: new pgSession({
    pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'habbo-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));


/* ============================= */
/* PAGE ACCUEIL */
/* ============================= */

app.get('/', (req, res) => {

  if (req.session.userId) {
    return res.redirect('/dashboard');
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));

});


/* ============================= */
/* REGISTER */
/* ============================= */

app.post('/api/register', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({
      success: false,
      message: 'Pseudo et mot de passe requis.'
    });
  }

  if (username.length < 3) {
    return res.json({
      success: false,
      message: 'Pseudo trop court (3 caractères min).'
    });
  }

  if (password.length < 3) {
    return res.json({
      success: false,
      message: 'Mot de passe trop court.'
    });
  }

  try {

    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (exists.rows.length > 0) {
      return res.json({
        success: false,
        message: 'Ce pseudo est déjà pris.'
      });
    }

    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, password]
    );

    res.json({
      success: true,
      message: 'Compte créé !'
    });

  } catch (err) {

    console.error(err);

    res.json({
      success: false,
      message: 'Erreur serveur.'
    });

  }

});


/* ============================= */
/* LOGIN */
/* ============================= */

app.post('/api/login', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({
      success: false,
      message: 'Pseudo et mot de passe requis.'
    });
  }

  try {

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.json({
        success: false,
        message: 'Pseudo ou mot de passe incorrect.'
      });
    }

    if (password !== user.password) {
      return res.json({
        success: false,
        message: 'Pseudo ou mot de passe incorrect.'
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      redirect: '/dashboard'
    });

  } catch (err) {

    console.error(err);

    res.json({
      success: false,
      message: 'Erreur serveur.'
    });

  }

});


/* ============================= */
/* LOGOUT */
/* ============================= */

app.post('/api/logout', (req, res) => {

  req.session.destroy(() => {

    res.json({
      success: true,
      redirect: '/'
    });

  });

});


/* ============================= */
/* SAVE NOTE */
/* ============================= */

app.post('/api/save-note', async (req, res) => {

  if (!req.session.userId) {
    return res.json({
      success: false,
      message: 'Non connecté.'
    });
  }

  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.json({
      success: false,
      message: 'Champ vide.'
    });
  }

  try {

    await pool.query(
      'UPDATE users SET personal_note = $1, note_updated_at = NOW() WHERE id = $2',
      [note.trim(), req.session.userId]
    );

    res.json({
      success: true,
      message: 'Note enregistrée !'
    });

  } catch (err) {

    console.error(err);

    res.json({
      success: false,
      message: 'Erreur serveur.'
    });

  }

});


/* ============================= */
/* DASHBOARD */
/* ============================= */

app.get('/dashboard', (req, res) => {

  if (!req.session.userId) {
    return res.redirect('/');
  }

  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));

});


/* ============================= */
/* API ME */
/* ============================= */

app.get('/api/me', async (req, res) => {

  if (!req.session.userId) {
    return res.json({
      loggedIn: false
    });
  }

  try {

    const result = await pool.query(
      'SELECT username, personal_note, note_updated_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    const user = result.rows[0];

    res.json({
      loggedIn: true,
      username: req.session.username,
      personalNote: user?.personal_note || '',
      noteUpdatedAt: user?.note_updated_at || null
    });

  } catch (err) {

    console.error(err);

    res.json({
      loggedIn: true,
      username: req.session.username,
      personalNote: '',
      noteUpdatedAt: null
    });

  }

});

/* ============================= */
/* LAUNCH FLAG */
/* ============================= */

app.post('/api/request-launch', async (req, res) => {
  if (!req.session.userId) return res.json({ success: false });

  await pool.query(
    'UPDATE users SET launch_requested = TRUE WHERE id = $1',
    [req.session.userId]
  );

  res.json({ success: true });
});

app.get('/api/pending-launches', async (req, res) => {
  const result = await pool.query(
    'SELECT username, personal_note FROM users WHERE launch_requested = TRUE'
  );

  await pool.query('UPDATE users SET launch_requested = FALSE WHERE launch_requested = TRUE');

  res.json({ launches: result.rows });
});

/* ============================= */
/* START SERVER */
/* ============================= */

initDb()
  .then(() => {

    app.listen(PORT, () => {

      console.log(`\n🏨 Habbo site lancé sur http://localhost:${PORT}\n`);

    });

  })
  .catch(err => {

    console.error('Erreur de connexion à la base de données:', err.message);
    process.exit(1);

  });