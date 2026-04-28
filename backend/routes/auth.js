// backend/routes/auth.js
// ---------------------------------------------------------------
// Authentication endpoints.
//
//   POST /api/auth/signup   { email, password, fullName? }
//   POST /api/auth/login    { email, password }
//   POST /api/auth/verify   (Authorization: Bearer …)
//   POST /api/auth/logout   (no-op on the server; client discards token)
// ---------------------------------------------------------------

const express = require('express');
const bcrypt  = require('bcryptjs');
const { query } = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || null,
    createdAt: row.created_at,
  };
}

// ---- POST /api/auth/signup ----
router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || password.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES (LOWER($1), $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, passwordHash, fullName || null]
    );
    const user = rows[0];

    // Create empty CV row alongside the user.
    await query(
      `INSERT INTO cv_data (user_id, data) VALUES ($1, '{}'::jsonb)`,
      [user.id]
    );

    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

    const token = signToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('signup failed:', err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// ---- POST /api/auth/login ----
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { rows } = await query(
      `SELECT id, email, password_hash, full_name, created_at
         FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('login failed:', err);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// ---- POST /api/auth/verify ----
// Returns the user record if the token is valid.
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('verify failed:', err);
    res.status(500).json({ error: 'Could not verify session.' });
  }
});

// ---- POST /api/auth/logout ----
// Stateless JWTs can't truly be invalidated server-side without a blocklist.
// We just acknowledge — the client drops the token from localStorage.
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
