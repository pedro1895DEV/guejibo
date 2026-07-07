'use strict';

// Database configuration
// - Development: uses explicit defaults for Docker Compose (db container)
// - Production: reads from environment variables, fails fast if missing

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required database env vars in production: ${missing.join(', ')}`);
  }
}

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'admin',
    database: process.env.DB_NAME || 'guejibo',
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mariadb',
    operatorsAliases: 0
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mariadb',
    operatorsAliases: 0,
    logging: false
  }
};
