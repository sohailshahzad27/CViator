// backend/middleware/auth.js
// JWT verification middleware + admin guard.
//
//   requireAuth  — verifies the Bearer token, attaches req.user = { id, email }
//   requireAdmin — must come after requireAuth; checks is_admin in DB

const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');
const { query } = require('../db/pool');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
}

function extractBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('[auth] requireAdmin check failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signToken, requireAuth, requireAdmin };
