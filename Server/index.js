const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const session = require('express-session');

/* ***************************************** */

const app = express();
const port = process.env.PORT || 3000;

/* ***************************************** */

// dotenv
dotenv.config();

// Fail-fast: JWT_SECRET is critical for auth tokens and must be a constant
// set in the deployment environment, not generated per build.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET env var is required in production');
}

// cors
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
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
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET env var is required in production');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true }
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

// Initialize HTTP server
httpServer.listen(port);
console.log("Port: " + port);

/* ***************************************** */