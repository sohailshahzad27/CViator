// backend/config.js
// Single source of truth for all environment-driven configuration.
// Every module reads from here instead of calling process.env directly.

require('dotenv').config();
// console.log("DB CONFIG DEBUG:", {
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

module.exports = {
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  jwt: {
    secret:    process.env.JWT_SECRET    || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Shared secret required to register an account with role = 'admin'.
  // Anyone signing up as admin must provide this code.
  adminSignupCode: process.env.ADMIN_SIGNUP_CODE || 'CVIATOR-ADMIN-2026',

  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME     || 'cviator',
  },
};
