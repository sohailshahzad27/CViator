// backend/routes/auth.js
// Authentication endpoints.
//
//   POST /api/auth/signup   { email, password, fullName? }
//   POST /api/auth/login    { email, password }
//   POST /api/auth/verify   (Authorization: Bearer …)
//   POST /api/auth/logout   (stateless — client drops token)

const express = require('express');
const bcrypt  = require('bcryptjs');
const { query }      = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWD = 8;
const BCRYPT_ROUNDS = 10;

function publicUser(row) {
  return {
    id:        row.id,
    email:     row.email,
    fullName:  row.full_name  || null,
    isAdmin:   row.is_admin   ?? false,
    createdAt: row.created_at,
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, fullName } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || password.length < MIN_PASSWD) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWD} characters.`,
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user and set last_login_at in one query.
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, last_login_at)
       VALUES (LOWER($1), $2, $3, NOW())
       RETURNING id, email, full_name, is_admin, created_at`,
      [email, passwordHash, fullName || null]
    );
    const user = rows[0];

    // Provision an empty CV row. ON CONFLICT is a safety net for retries.
    await query(
      `INSERT INTO cv_data (user_id, data)
       VALUES ($1, '{}'::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('[auth] signup failed:', err.message);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { rows } = await query(
      `SELECT id, email, password_hash, full_name, is_admin, created_at
         FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    // Use the same generic message for both "not found" and "wrong password"
    // to avoid leaking whether an email is registered.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Fire-and-forget — don't block the response on this.
    query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(
      (err) => console.error('[auth] last_login_at update failed:', err.message)
    );

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth] login failed:', err.message);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// POST /api/auth/verify
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, is_admin, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error('[auth] verify failed:', err.message);
    res.status(500).json({ error: 'Could not verify session.' });
  }
});

// POST /api/auth/logout — stateless; just acknowledge
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
