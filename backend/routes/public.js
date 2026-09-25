// backend/routes/public.js
// Endpoints that the signup page (un-authenticated) needs.
//
//   GET /api/public/faculties → { faculties: [{id, code, name, departments: [...]}] }

const express = require('express');
const { query } = require('../db/pool');
const cache = require('../utils/cache');

const router = express.Router();

const FACULTIES_CACHE_TTL_MS = 5 * 60 * 1000; // no write endpoint — seeded once

router.get('/faculties', async (_req, res) => {
  try {
    // Hit on every visit to the signup page — cache the assembled payload so
    // an unauthenticated traffic spike doesn't hammer these two queries.
    const payload = await cache.wrap('public:faculties', FACULTIES_CACHE_TTL_MS, async () => {
      const [facRes, deptRes] = await Promise.all([
        query(`SELECT id, code, name, display_order FROM faculties ORDER BY display_order, name`),
        query(`SELECT id, faculty_id, code, name, display_order FROM departments ORDER BY faculty_id, display_order, name`),
      ]);
      const byFaculty = new Map();
      for (const d of deptRes.rows) {
        if (!byFaculty.has(d.faculty_id)) byFaculty.set(d.faculty_id, []);
        byFaculty.get(d.faculty_id).push({ id: d.id, code: d.code, name: d.name });
      }
      return {
        faculties: facRes.rows.map((f) => ({
          id: f.id, code: f.code, name: f.name,
          departments: byFaculty.get(f.id) || [],
        })),
      };
    });

    res.json(payload);
  } catch (err) {
    console.error('[public] faculties failed:', err.message);
    res.status(500).json({ error: 'Could not fetch faculties.' });
  }
});

module.exports = router;
