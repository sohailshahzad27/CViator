// backend/utils/browser.js
// Puppeteer launches a full Chromium process, which costs 300-800ms of pure
// startup latency. The PDF routes used to pay that cost on every request.
// Instead, launch Chromium once and reuse it — each request just opens and
// closes a page, which is orders of magnitude cheaper.

const puppeteer = require('puppeteer');

let browserPromise = null;

function launch() {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
}

async function getBrowser() {
  if (!browserPromise) browserPromise = launch();
  let browser = await browserPromise;
  if (!browser.isConnected()) {
    // Chromium crashed or was killed — relaunch on next use.
    browserPromise = launch();
    browser = await browserPromise;
  }
  return browser;
}

async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  if (browser) await browser.close().catch(() => {});
}

module.exports = { getBrowser, renderPdf, closeBrowser };
