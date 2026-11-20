'use strict';

const models = require('../sequelize/models');
const authlogic = require('../app/authlogic');
const User = models.User;

function createRateLimiter(windowMs, maxRequests) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits.entries()) {
      if (now >= entry.resetAt) {
        hits.delete(ip);
      }
    }
  }, windowMs);
  if (cleanup.unref) {
    cleanup.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now >= entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).send({
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      });
    }

    entry.count += 1;
    return next();
  };
}

module.exports = function (app, passport) {
  // Resolve base URLs for OAuth redirects
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!process.env.API_URL || !process.env.CLIENT_URL)) {
    throw new Error('API_URL and CLIENT_URL env vars are required in production');
  }
  const API_URL = (process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/+$/, '');

  const authRateLimit = createRateLimiter(15 * 60 * 1000, 30);

  /*
   * Google OAuth 2.0 configurations (stateless JWT, optional when env vars are unset in dev).
   */
  const hasGoogleOAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (hasGoogleOAuth) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: API_URL + '/auth/google/callback'
    },
      function (accessToken, refreshToken, profile, cb) {
        const userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        User.findOrCreate({
          where: { googleId: profile.id },
          defaults: {
            name: profile.displayName,
            email: userEmail
          }
        }).then(([user]) => {
          return cb(null, user);
        }).catch(err => {
          return cb(err);
        });
      }
    ));

    app.get('/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'], session: false })
    );

    app.get('/auth/google/callback',
      passport.authenticate('google', { session: false, failureRedirect: CLIENT_URL + '/login' }),
      function (req, res) {
        const user = req.user.get();
        const token = authlogic.createJWT({ id: user.id, name: user.name, email: user.email });
        res.cookie('jwt', token, {
          path: '/',
          sameSite: 'lax',
          secure: isProduction
        });
        res.redirect(CLIENT_URL);
      });
  } else {
    app.get('/auth/google', (req, res) => {
      res.status(503).send({
        success: false,
        error: 'Google OAuth is not configured'
      });
    });

    app.get('/auth/google/callback', (req, res) => {
      res.redirect(CLIENT_URL + '/login');
    });
  }

  /*
   * Returns an error message.
   */
  app.get('/auth/error', (req, res) => {
    res.send({
      success: false,
      error: 'Authentication error'
    });
  });

  /*
   * Authenticates a user with email and password.
   */
  app.post('/auth/login', authRateLimit, passport.authenticate('local-login',
    {
      session: false,
      failureRedirect: '/auth/error'
    }),
    (req, res) => {
      res.send({
        success: true,
        token: authlogic.createJWT(req.user)
      });
    }
  );

  /*
   * Registers a new user.
   */
  app.post('/auth/register', authRateLimit, passport.authenticate('local-register',
    {
      session: false,
      failureRedirect: '/auth/error'
    }),
    (req, res) => {
      res.send({
        success: true,
        token: authlogic.createJWT(req.user)
      });
    }
  );

  /*
   * Returns data about the current user.
   */
  app.get('/auth/profile', isLoggedIn(), (req, res) => {
    res.send(User.exportObject(req.user, true));
  });

  function isLoggedIn() {
    return passport.authenticate('local-jwt', { session: false });
  }
};
