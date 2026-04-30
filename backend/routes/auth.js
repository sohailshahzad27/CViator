// backend/routes/auth.js
// Authentication endpoints.
//
//   POST /api/auth/signup               { email, password, role, firstName, lastName, ...profile }
//   POST /api/auth/login                { email, password }
//   POST /api/auth/verify               (Authorization: Bearer …)
//   POST /api/auth/logout               (stateless — client drops token)
//   POST /api/auth/resend-verification  { email }
//   GET  /api/auth/verify-email/:token
//   POST /api/auth/forgot-password      { email }
//   POST /api/auth/reset-password       { token, password }
//
// Roles:
//   student → firstName, lastName, regNo, faculty, batch
//   admin   → firstName, lastName + adminCode (matches ADMIN_SIGNUP_CODE)

const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { query }      = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const config = require('../config');

const router = express.Router();

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWD    = 8;
const BCRYPT_ROUNDS = 10;
const ROLES         = new Set(['student', 'admin']);

const VERIFY_TTL_MS       = 24 * 60 * 60 * 1000;  // 24 h
const RESET_TTL_MS        =  1 * 60 * 60 * 1000;  // 1 h

function publicUser(row) {
  return {
    id:        row.id,
    email:     row.email,
    fullName:  row.full_name  || null,
    firstName: row.first_name || null,
    lastName:  row.last_name  || null,
    role:      row.role       || 'student',
    isAdmin:   row.is_admin   ?? false,
    regNo:     row.reg_no     || null,
    faculty:   row.faculty    || null,
    batch:     row.batch      || null,
    createdAt: row.created_at,
  };
}

function joinName(first, last) {
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createVerificationToken(userId, type) {
  const token     = generateToken();
  const expiresAt = new Date(Date.now() + (type === 'password_reset' ? RESET_TTL_MS : VERIFY_TTL_MS));
  await query(
    `INSERT INTO verification_tokens (token, user_id, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [token, userId, type, expiresAt]
  );
  return token;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const {
    email, password,
    role = 'student',
    firstName, lastName,
    regNo, faculty, batch,
    adminCode,
  } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!password || password.length < MIN_PASSWD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWD} characters.` });
  }
  if (!ROLES.has(role)) {
    return res.status(400).json({ error: 'Role must be student or admin.' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First and last name are required.' });
  }
  if (role === 'student' && (!regNo || !faculty || !batch)) {
    return res.status(400).json({ error: 'Students must provide registration number, faculty, and batch.' });
  }
  if (role === 'admin') {
    if (!adminCode || adminCode !== config.adminSignupCode) {
      return res.status(403).json({ error: 'Invalid admin signup code.' });
    }
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const fullName     = joinName(firstName, lastName);
    const isAdmin      = role === 'admin';

    const { rows } = await query(
      `INSERT INTO users (
         email, password_hash, full_name, role, is_admin,
         first_name, last_name, reg_no, faculty, batch,
         last_login_at
       )
       VALUES (
         LOWER($1), $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         NOW()
       )
       RETURNING id, email, full_name, first_name, last_name, role, is_admin,
                 reg_no, faculty, batch, created_at`,
      [
        email, passwordHash, fullName, role, isAdmin,
        firstName, lastName,
        role === 'student' ? regNo   : null,
        role === 'student' ? faculty : null,
        role === 'student' ? batch   : null,
      ]
    );
    const user = rows[0];

    if (!isAdmin) {
      await query(
        `INSERT INTO cv_data (user_id, data) VALUES ($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }

    // Admins are pre-verified; students/faculty must confirm their email.
    if (!isAdmin) {
      const token = await createVerificationToken(user.id, 'email_verify');
      const link  = `${config.frontendUrl}/verify-email?token=${token}`;
      await sendVerificationEmail(user.email, user.full_name || firstName, link);
      return res.status(201).json({ needsVerification: true, email: user.email });
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
              role, is_admin, reg_no, faculty, batch,
              created_at, email_verified
         FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.email_verified && !user.is_admin) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        needsVerification: true,
        email: user.email,
      });
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
              role, is_admin, reg_no, faculty, batch, created_at
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

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const { rows } = await query(
      `SELECT id, email, full_name, first_name, email_verified, is_admin FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    // Always return success to avoid leaking whether an account exists.
    if (!user || user.email_verified || user.is_admin) {
      return res.json({ ok: true });
    }

    // Delete any existing email_verify tokens for this user.
    await query(`DELETE FROM verification_tokens WHERE user_id = $1 AND type = 'email_verify'`, [user.id]);

    const token = await createVerificationToken(user.id, 'email_verify');
    const link  = `${config.frontendUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, user.full_name || user.first_name || '', link);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] resend-verification failed:', err.message);
    res.status(500).json({ error: 'Could not resend verification email.' });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await query(
      `SELECT user_id FROM verification_tokens
        WHERE token = $1 AND type = 'email_verify' AND expires_at > NOW()`,
      [token]
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Token is invalid or has expired.' });
    }
    const userId = rows[0].user_id;

    await query(`UPDATE users SET email_verified = TRUE WHERE id = $1`, [userId]);
    await query(`DELETE FROM verification_tokens WHERE token = $1`, [token]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] verify-email failed:', err.message);
    res.status(500).json({ error: 'Could not verify email.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const { rows } = await query(
      `SELECT id, email, full_name, first_name FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];

    // Always return success to avoid leaking account existence.
    if (!user) return res.json({ ok: true });

    await query(`DELETE FROM verification_tokens WHERE user_id = $1 AND type = 'password_reset'`, [user.id]);

    const token = await createVerificationToken(user.id, 'password_reset');
    const link  = `${config.frontendUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, user.full_name || user.first_name || '', link);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] forgot-password failed:', err.message);
    res.status(500).json({ error: 'Could not process request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (password.length < MIN_PASSWD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWD} characters.` });
  }

  try {
    const { rows } = await query(
      `SELECT user_id FROM verification_tokens
        WHERE token = $1 AND type = 'password_reset' AND expires_at > NOW()`,
      [token]
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Token is invalid or has expired.' });
    }
    const userId = rows[0].user_id;

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
    await query(`DELETE FROM verification_tokens WHERE token = $1`, [token]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] reset-password failed:', err.message);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

module.exports = router;
