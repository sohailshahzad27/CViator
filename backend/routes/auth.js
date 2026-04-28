// backend/routes/auth.js
// Authentication endpoints.
//
//   POST /api/auth/signup   { email, password, role, firstName, lastName, ...profile }
//   POST /api/auth/login    { email, password }
//   POST /api/auth/verify   (Authorization: Bearer …)
//   POST /api/auth/logout   (stateless — client drops token)
//
// Role-based fields:
//   student  → firstName, lastName, regNo, faculty, batch
//   faculty  → firstName, lastName, department, designation
//   admin    → firstName, lastName + adminCode (matches ADMIN_SIGNUP_CODE)

const express = require('express');
const bcrypt  = require('bcryptjs');
const { query }      = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWD   = 8;
const BCRYPT_ROUNDS = 10;
const ROLES        = new Set(['student', 'faculty', 'admin']);

function publicUser(row) {
  return {
    id:          row.id,
    email:       row.email,
    fullName:    row.full_name   || null,
    firstName:   row.first_name  || null,
    lastName:    row.last_name   || null,
    role:        row.role        || 'student',
    isAdmin:     row.is_admin    ?? false,
    regNo:       row.reg_no      || null,
    faculty:     row.faculty     || null,
    batch:       row.batch       || null,
    department:  row.department  || null,
    designation: row.designation || null,
    createdAt:   row.created_at,
  };
}

function joinName(first, last) {
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const {
    email, password,
    role = 'student',
    firstName, lastName,
    regNo, faculty, batch,
    department, designation,
    adminCode,
  } = req.body || {};

  // ── Validation ─────────────────────────────────────────────
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || password.length < MIN_PASSWD) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWD} characters.`,
    });
  }
  if (!ROLES.has(role)) {
    return res.status(400).json({ error: 'Role must be student, faculty, or admin.' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First and last name are required.' });
  }

  if (role === 'student' && (!regNo || !faculty || !batch)) {
    return res.status(400).json({
      error: 'Students must provide registration number, faculty, and batch.',
    });
  }
  if (role === 'faculty' && (!department || !designation)) {
    return res.status(400).json({
      error: 'Faculty members must provide department and designation.',
    });
  }
  if (role === 'admin') {
    if (!adminCode || adminCode !== config.adminSignupCode) {
      return res.status(403).json({ error: 'Invalid admin signup code.' });
    }
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const fullName = joinName(firstName, lastName);
    const isAdmin  = role === 'admin';

    const { rows } = await query(
      `INSERT INTO users (
         email, password_hash, full_name, role, is_admin,
         first_name, last_name, reg_no, faculty, batch,
         department, designation, last_login_at
       )
       VALUES (
         LOWER($1), $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, NOW()
       )
       RETURNING id, email, full_name, first_name, last_name, role, is_admin,
                 reg_no, faculty, batch, department, designation, created_at`,
      [
        email, passwordHash, fullName, role, isAdmin,
        firstName, lastName,
        role === 'student' ? regNo   : null,
        role === 'student' ? faculty : null,
        role === 'student' ? batch   : null,
        role === 'faculty' ? department  : null,
        role === 'faculty' ? designation : null,
      ]
    );
    const user = rows[0];

    // Provision an empty CV row only for non-admins (admins don't build CVs).
    if (!isAdmin) {
      await query(
        `INSERT INTO cv_data (user_id, data)
         VALUES ($1, '{}'::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }

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
      `SELECT id, email, password_hash, full_name, first_name, last_name,
              role, is_admin, reg_no, faculty, batch, department, designation,
              created_at
         FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

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
      `SELECT id, email, full_name, first_name, last_name,
              role, is_admin, reg_no, faculty, batch, department, designation,
              created_at
         FROM users WHERE id = $1`,
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
