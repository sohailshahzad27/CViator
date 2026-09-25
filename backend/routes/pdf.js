// backend/routes/pdf.js
// ---------------------------------------------------------------
// POST /generate-pdf
// Accepts JSON resume data + a template name, renders it to HTML
// with generateHTML(), converts the HTML to a PDF using Puppeteer,
// and streams the PDF back to the client.
// ---------------------------------------------------------------

const express   = require('express');
const rateLimit = require('express-rate-limit');
const { generateHTML } = require('../utils/generateHTML');
const { renderPdf } = require('../utils/browser');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Each request spins up a headless-Chromium render — cheap per-call but not
// free. Without auth this route was reachable by anyone on the internet;
// require a session and cap how often it can be called per client.
const pdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many PDF requests. Try again in 15 minutes.' },
});

router.post('/', requireAuth, pdfLimiter, async (req, res) => {
  const { resumeData = {}, template = 'classic' } = req.body || {};

  try {
    // Build the HTML string from the user's resume data.
    const html = generateHTML(resumeData, template);

    // Renders via a shared, already-warm Chromium instance (see utils/browser.js)
    // instead of paying a ~500ms cold-launch cost on every request.
    const pdfBuffer = await renderPdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(resumeData.name || 'resume').replace(/\s+/g, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

module.exports = router;
