// backend/utils/mailer.js
// Thin nodemailer wrapper. If SMTP is not configured the email is skipped
// and the verification/reset link is logged to the console instead — safe
// for local development without a mail server.

const nodemailer = require('nodemailer');
const config = require('../config');

function createTransport() {
  const { host, port, user, pass } = config.smtp;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port:   Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

async function send(to, subject, html) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}`);
    // Extract and log the link so devs can still test the flow locally.
    const match = html.match(/href="([^"]+)"/);
    if (match) console.log(`[mailer] Link: ${match[1]}`);
    return;
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, html });
}

async function sendVerificationEmail(to, name, link) {
  await send(
    to,
    'Verify your Cviator email',
    `<p>Hi ${name || 'there'},</p>
     <p>Click the link below to verify your email address. The link expires in 24 hours.</p>
     <p><a href="${link}">${link}</a></p>
     <p>If you did not create an account, you can ignore this email.</p>`
  );
}

async function sendPasswordResetEmail(to, name, link) {
  await send(
    to,
    'Reset your Cviator password',
    `<p>Hi ${name || 'there'},</p>
     <p>Click the link below to reset your password. The link expires in 1 hour.</p>
     <p><a href="${link}">${link}</a></p>
     <p>If you did not request a password reset, you can ignore this email.</p>`
  );
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
