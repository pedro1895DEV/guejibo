'use strict';

const jwt = require('jsonwebtoken');
const models = require('../sequelize/models');
const User = models.User;

const DEFAULT_JWT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const DEV_FALLBACK_JWT_SECRET = 'dev-only-insecure-jwt-secret';

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET env var is required in production');
  }
  return DEV_FALLBACK_JWT_SECRET;
}

function getJwtTtlSeconds() {
  const parsed = Number(process.env.JWT_EXPIRES_IN_SECONDS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_JWT_TTL_SECONDS;
}

module.exports = {
  getJwtSecret,

  /*
   * Creates a signed HS256 JWT with expiration for given User object.
   * Preserves the `temporary` flag so guest tokens cannot access registered-only endpoints.
   */
  createJWT: function (obj) {
    const payload = {
      ...User.exportObject(obj, true),
      temporary: Boolean(obj && obj.temporary)
    };
    return jwt.sign(payload, getJwtSecret(), {
      algorithm: 'HS256',
      expiresIn: getJwtTtlSeconds()
    });
  },

  /*
   * Verifies signature (pinned to HS256) and expiration of a JWT.
   */
  verifyJWT: function (token) {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256']
    });
  }
};
