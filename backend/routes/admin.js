// backend/routes/admin.js
// Admin-only endpoints. Every route requires a valid JWT *and* is_admin = true.
//
//   GET  /api/admin/users               — paginated user list (filterable)
//   GET  /api/admin/users/:id           — single user + their CV snapshot
//   GET  /api/admin/users/:id/pdf       — generate that user's CV as PDF
//   GET  /api/admin/filters             — distinct faculty / batch / department lists
//   GET  /api/admin/download-all        — bundle all (filtered) CVs into a single ZIP

const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const { query } = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateHTML } = require('../utils/generateHTML');

const router = express.Router();

// All admin routes require authentication AND admin privilege.
router.use(requireAuth, requireAdmin);

const PAGE_LIMIT = 20;

function publicUser(u) {
  return {
    id:          u.id,
    email:       u.email,
    fullName:    u.full_name   || null,
    firstName:   u.first_name  || null,
    lastName:    u.last_name   || null,
    role:        u.role        || 'student',
    isAdmin:     u.is_admin,
    regNo:       u.reg_no      || null,
    faculty:     u.faculty     || null,
    batch:       u.batch       || null,
    department:  u.department  || null,
    designation: u.designation || null,
    createdAt:   u.created_at,
    lastLoginAt: u.last_login_at || null,
  };
}

// ── GET /api/admin/users ──────────────────────────────────────────
// Query params: page, role, faculty, batch, department, q (email/name search)
router.get('/users', async (req, res) => {
  const page   = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * PAGE_LIMIT;

  // Build a parameterised WHERE clause from the supplied filters.
  const w  = [];
  const p  = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replace('$$', `$${p.length}`)); };

  if (req.query.role)       add('role        = $$', req.query.role);
  if (req.query.faculty)    add('faculty     = $$', req.query.faculty);
  if (req.query.batch)      add('batch       = $$', req.query.batch);
  if (req.query.department) add('department  = $$', req.query.department);
  if (req.query.q) {
    const like = `%${String(req.query.q).toLowerCase()}%`;
    p.push(like);
    const i = p.length;
    w.push(`(LOWER(email) LIKE $${i} OR LOWER(COALESCE(full_name, '')) LIKE $${i} OR LOWER(COALESCE(reg_no, '')) LIKE $${i})`);
  }

  const whereSql = w.length ? `WHERE ${w.join(' AND ')}` : '';

  try {
    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT id, email, full_name, first_name, last_name, role, is_admin,
                reg_no, faculty, batch, department, designation,
                created_at, last_login_at
           FROM users
           ${whereSql}
          ORDER BY created_at DESC
          LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
        [...p, PAGE_LIMIT, offset]
      ),
      query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, p),
    ]);

    const total = Number(countResult.rows[0].total);

    res.json({
      users: usersResult.rows.map(publicUser),
      pagination: {
        page,
        limit:  PAGE_LIMIT,
        total,
        pages:  Math.max(1, Math.ceil(total / PAGE_LIMIT)),
      },
    });
  } catch (err) {
    console.error('[admin] GET /users failed:', err.message);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

// ── GET /api/admin/filters ────────────────────────────────────────
// Returns distinct values for the filter dropdowns.
router.get('/filters', async (_req, res) => {
  try {
    const [faculties, batches, departments] = await Promise.all([
      query(`SELECT DISTINCT faculty    FROM users WHERE faculty    IS NOT NULL AND faculty    <> '' ORDER BY faculty`),
      query(`SELECT DISTINCT batch      FROM users WHERE batch      IS NOT NULL AND batch      <> '' ORDER BY batch DESC`),
      query(`SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department <> '' ORDER BY department`),
    ]);
    res.json({
      faculties:   faculties.rows.map((r) => r.faculty),
      batches:     batches.rows.map((r) => r.batch),
      departments: departments.rows.map((r) => r.department),
    });
  } catch (err) {
    console.error('[admin] GET /filters failed:', err.message);
    res.status(500).json({ error: 'Could not fetch filters.' });
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [userResult, cvResult] = await Promise.all([
      query(
        `SELECT id, email, full_name, first_name, last_name, role, is_admin,
                reg_no, faculty, batch, department, designation,
                created_at, last_login_at
           FROM users WHERE id = $1`,
        [id]
      ),
      query(`SELECT data, updated_at FROM cv_data WHERE user_id = $1`, [id]),
    ]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const u  = userResult.rows[0];
    const cv = cvResult.rows[0] || null;

    res.json({
      user: publicUser(u),
      cv: cv ? { data: cv.data, updatedAt: cv.updated_at } : null,
    });
  } catch (err) {
    console.error('[admin] GET /users/:id failed:', err.message);
    res.status(500).json({ error: 'Could not fetch user.' });
  }
});

// ── GET /api/admin/users/:id/pdf ─────────────────────────────────
// Renders the user's saved CV to a PDF and streams it back.
router.get('/users/:id/pdf', async (req, res) => {
  const { id } = req.params;
  const template = (req.query.template || 'classic').toString();

  let browser;
  try {
    const [userResult, cvResult] = await Promise.all([
      query(
        `SELECT email, full_name, first_name, last_name FROM users WHERE id = $1`,
        [id]
      ),
      query(`SELECT data FROM cv_data WHERE user_id = $1`, [id]),
    ]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const u = userResult.rows[0];
    const data = cvResult.rows[0]?.data || {};

    const html = generateHTML(data, template);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    const filename = (
      [u.first_name, u.last_name].filter(Boolean).join('_') ||
      u.full_name ||
      u.email ||
      'resume'
    ).replace(/\s+/g, '_');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[admin] GET /users/:id/pdf failed:', err.message);
    res.status(500).json({ error: 'Could not generate PDF.' });
  } finally {
    if (browser) await browser.close();
  }
});

// ── GET /api/admin/download-all ──────────────────────────────────
// Bundles all matching users' CVs into a single ZIP. Same query-param
// filters as /users (role / faculty / batch / department / q). If no
// filters are supplied, every non-admin user is included.
//
// Streams the zip to the client as it builds — no temp files on disk.
router.get('/download-all', async (req, res) => {
  const template = (req.query.template || 'classic').toString();

  // Replicate the WHERE-clause builder from /users.
  const w = [];
  const p = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replace('$$', `$${p.length}`)); };

  if (req.query.role)       add('role        = $$', req.query.role);
  if (req.query.faculty)    add('faculty     = $$', req.query.faculty);
  if (req.query.batch)      add('batch       = $$', req.query.batch);
  if (req.query.department) add('department  = $$', req.query.department);
  if (req.query.q) {
    const like = `%${String(req.query.q).toLowerCase()}%`;
    p.push(like);
    const i = p.length;
    w.push(`(LOWER(email) LIKE $${i} OR LOWER(COALESCE(full_name, '')) LIKE $${i} OR LOWER(COALESCE(reg_no, '')) LIKE $${i})`);
  }

  // Admins themselves never have CVs — exclude them so the zip stays clean.
  w.push('is_admin = FALSE');

  const whereSql = `WHERE ${w.join(' AND ')}`;

  let browser;
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.first_name, u.last_name,
              u.faculty, u.batch, u.department, c.data
         FROM users u
         LEFT JOIN cv_data c ON c.user_id = u.id
         ${whereSql}
         ORDER BY u.last_name, u.first_name, u.email`,
      p
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No users matched the filters.' });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const filterTag = [
      req.query.faculty,
      req.query.batch,
      req.query.department,
      req.query.role,
    ].filter(Boolean).join('_').replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
    const zipName = ['cvs', stamp, filterTag].filter(Boolean).join('_') + '.zip';

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => console.warn('[zip] warning:', err.message));
    archive.on('error',   (err) => { throw err; });
    archive.pipe(res);

    // Reuse a single Chromium across the batch — much faster than relaunching.
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    // Generate sequentially (Puppeteer pages are heavy; parallel runs OOM).
    let included = 0;
    let skipped  = 0;
    for (const u of rows) {
      const data = u.data || {};
      // Skip totally empty CVs — they'd produce a blank PDF.
      const hasContent = data && (
        data.name || data.summary ||
        (data.education  || []).length ||
        (data.experience || []).length ||
        (data.projects   || []).length ||
        (data.skills     || []).length
      );
      if (!hasContent) { skipped++; continue; }

      try {
        const html = generateHTML(data, template);
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', bottom: '0', left: '0', right: '0' },
        });
        await page.close();

        const baseName = (
          [u.first_name, u.last_name].filter(Boolean).join('_') ||
          u.full_name || u.email || `user_${u.id.slice(0, 8)}`
        ).replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/gi, '');

        // Group inside the zip by faculty / department when available.
        const folder = u.faculty || u.department || 'Other';
        const path = `${folder}/${baseName}.pdf`;

        archive.append(pdf, { name: path });
        included++;
      } catch (err) {
        console.error(`[zip] failed for user ${u.email}:`, err.message);
        skipped++;
      }
    }

    archive.append(
      `Generated: ${new Date().toISOString()}\n` +
      `Included: ${included}\nSkipped (empty/error): ${skipped}\n` +
      `Filters: ${JSON.stringify(req.query)}\n`,
      { name: 'README.txt' }
    );

    await archive.finalize();
  } catch (err) {
    console.error('[admin] GET /download-all failed:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not generate zip.' });
    } else {
      res.end();
    }
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
