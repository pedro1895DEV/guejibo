'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

/* ***************************************** */

// dotenv must be loaded before reading env vars
dotenv.config();

const models = require('./sequelize/models');
const logger = require('./app/logger');
const userCleanupService = require('./services/user-cleanup.service');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/* ***************************************** */

// Fail-fast: JWT_SECRET must be explicitly set in production
if (!process.env.JWT_SECRET && isProduction) {
  throw new Error('JWT_SECRET env var is required in production');
}

// Trust reverse proxy (Apache) so client IP and HTTPS headers work behind TLS termination
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Basic security headers (defense in depth when reached directly)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// cors
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : ['http://localhost:4200'];
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// cookie-parser & JSON body parser
app.use(cookieParser());
app.use(express.json());

// passport (100% stateless JWT authentication — no server-side session store)
app.use(passport.initialize());

// Healthcheck endpoint for Docker Compose and load balancers
app.get('/health', async (_req, res) => {
  try {
    await models.sequelize.authenticate();
    res.status(200).send({ status: 'ok' });
  } catch (err) {
    logger.error('Database healthcheck failed', err);
    res.status(503).send({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

/* ***************************************** */

// Internal modules
require('./app/auth')(passport);
require('./routes/auth-api')(app, passport);
require('./routes/main-api')(app, passport);

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize web socket server
require('./app/ws')(app, httpServer, passport);

// Initialize HTTP server and background cleanup only when executed directly
if (require.main === module) {
  userCleanupService.startPeriodicCleanup();
  httpServer.listen(port, () => {
    logger.info('Guejibo server listening', { port });
  });
}

module.exports = { app, httpServer };
