'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const session = require('express-session');

/* ***************************************** */

// dotenv must be loaded before reading env vars
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/* ***************************************** */

// Fail-fast: critical secrets must be explicitly set in production
if (!process.env.JWT_SECRET && isProduction) {
  throw new Error('JWT_SECRET env var is required in production');
}
if (!process.env.SESSION_SECRET && isProduction) {
  throw new Error('SESSION_SECRET env var is required in production');
}

// Trust reverse proxy (Apache) so secure cookies & client IP work behind TLS termination
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

// cookie-parser
app.use(cookieParser());

// body-parser
app.use(bodyParser.json());

// express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// passport
app.use(passport.initialize());
app.use(passport.session());

/* ***************************************** */

// Internal modules
require('./app/auth')(passport);
require('./routes/auth-api')(app, passport);
require('./routes/main-api')(app, passport);

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize web socket server
require('./app/ws')(app, httpServer, passport);

// Initialize HTTP server only when executed directly
if (require.main === module) {
  httpServer.listen(port);
  console.log('Port: ' + port);
}

module.exports = { app, httpServer };
