// backend/server.js
// Cviator Pro — Express API
//
//   /api/auth/*     — signup, login, verify, logout
//   /api/cv         — per-user CV CRUD (auth-gated)
//   /api/admin/*    — admin dashboard (auth + is_admin)
//   /generate-pdf   — Puppeteer PDF generation

const config = require('./config');
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const pdfRoutes   = require('./routes/pdf');
const authRoutes  = require('./routes/auth');
const cvRoutes    = require('./routes/cv');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./db/init');

const app = express();

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: config.frontendUrl || true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Concise request logger — one line per request.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'Cviator Pro API', version: '2.0.0' });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/cv',       cvRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/generate-pdf', pdfRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.url}` });
});

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Boot ─────────────────────────────────────────────────────────
(async () => {
  try {
    await initDatabase();
  } catch (err) {
    console.error('[server] Database init failed — refusing to start.', err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Cviator backend listening on http://localhost:${config.port}`);
  });
})();
