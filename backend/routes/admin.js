// backend/routes/admin.js
// Admin-only endpoints. Every route requires a valid JWT *and* is_admin = true.
//
//   GET /api/admin/users          — paginated user list
//   GET /api/admin/users/:id      — single user + their CV snapshot

const express = require('express');
const { query } = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication AND admin privilege.
router.use(requireAuth, requireAdmin);

const PAGE_LIMIT = 20;

// ── GET /api/admin/users?page=1 ──────────────────────────────────
router.get('/users', async (req, res) => {
  const page   = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE_LIMIT;

  try {
    // Run the data query and the count in parallel.
    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT id, email, full_name, is_admin, created_at, last_login_at
           FROM users
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2`,
        [PAGE_LIMIT, offset]
      ),
      query('SELECT COUNT(*) AS total FROM users'),
    ]);

    const total = Number(countResult.rows[0].total);

    res.json({
      users: usersResult.rows.map((u) => ({
        id:          u.id,
        email:       u.email,
        fullName:    u.full_name    || null,
        isAdmin:     u.is_admin,
        createdAt:   u.created_at,
        lastLoginAt: u.last_login_at || null,
      })),
      pagination: {
        page,
        limit:  PAGE_LIMIT,
        total,
        pages:  Math.ceil(total / PAGE_LIMIT),
      },
    });
  } catch (err) {
    console.error('[admin] GET /users failed:', err.message);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch user and CV data in parallel.
    const [userResult, cvResult] = await Promise.all([
      query(
        `SELECT id, email, full_name, is_admin, created_at, last_login_at
           FROM users WHERE id = $1`,
        [id]
      ),
      query(
        `SELECT data, updated_at FROM cv_data WHERE user_id = $1`,
        [id]
      ),
    ]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const u  = userResult.rows[0];
    const cv = cvResult.rows[0] || null;

    res.json({
      user: {
        id:          u.id,
        email:       u.email,
        fullName:    u.full_name    || null,
        isAdmin:     u.is_admin,
        createdAt:   u.created_at,
        lastLoginAt: u.last_login_at || null,
      },
      cv: cv ? { data: cv.data, updatedAt: cv.updated_at } : null,
    });
  } catch (err) {
    console.error('[admin] GET /users/:id failed:', err.message);
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

module.exports = router;
