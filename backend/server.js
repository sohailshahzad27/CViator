// backend/server.js
// ---------------------------------------------------------------
// Cviator Pro backend.
//   - PostgreSQL for users + per-user CV JSONB
//   - JWT auth (Bearer header)
//   - Puppeteer-based PDF generation (kept from previous version)
// ---------------------------------------------------------------

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pdfRoutes  = require('./routes/pdf');
const authRoutes = require('./routes/auth');
const cvRoutes   = require('./routes/cv');
const { initDatabase } = require('./db/init');

const app  = express();
const PORT = Number(process.env.PORT) || 5000;

// ---------------- Middleware ----------------
const corsOrigin = process.env.FRONTEND_URL || true; // `true` reflects request origin
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------------- Routes ----------------
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'Cviator Pro API', version: '2.0.0' });
});

app.use('/api/auth',     authRoutes);
app.use('/api/cv',       cvRoutes);
app.use('/generate-pdf', pdfRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.url}` }));

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------- Boot ----------------
(async () => {
  try {
    await initDatabase();
  } catch (err) {
    console.error('❌ Database init failed — refusing to start.');
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Cviator backend listening on http://localhost:${PORT}`);
  });
})();
