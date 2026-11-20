'use strict';

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const models = require('../sequelize/models');
const User = models.User;
const authlogic = require('./authlogic');

const passportJWT = require('passport-jwt');
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const MIN_PASSWORD_LENGTH = 8;

function isValidRegistrationInput(name, email, password) {
  return (
    typeof name === 'string' && name.trim().length > 0 &&
    typeof email === 'string' && email.trim().length > 0 &&
    typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
  );
}

module.exports = function (passport) {

  passport.use(
    'local-register',
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
      (req, email, password, done) => {
        const returnFunction = user => done(null, user);

        if ('id' in req.body) {
          completeRegistration(req, email, password, returnFunction);
        }
        else {
          registerNewUser(req, email, password, returnFunction);
        }
      })
  );

  function completeRegistration(req, email, password, returnFunction) {
    if (!isValidRegistrationInput(req.body.name, email, password)) {
      return returnFunction(false);
    }

    User.findOne({ where: { id: req.body.id, temporary: true } })
      .then(
        existingUser => {
          if (existingUser === null) {
            return returnFunction(false);
          }

          existingUser.name = req.body.name.trim();
          existingUser.email = email.trim();
          existingUser.password = bcrypt.hashSync(password, 10);
          existingUser.temporary = false;

          return existingUser.save()
            .then(returnFunction)
            .catch(() => returnFunction(false));
        }
      )
      .catch(() => returnFunction(false));
  }

  function registerNewUser(req, email, password, returnFunction) {
    if (!isValidRegistrationInput(req.body.name, email, password)) {
      return returnFunction(false);
    }

    const normalizedEmail = email.trim();

    User.findOne({ where: { email: normalizedEmail } })
      .then(
        user => {
          if (user === null) {
            return User.create({
              name: req.body.name.trim(),
              email: normalizedEmail,
              password: bcrypt.hashSync(password, 10)
            })
              .then(returnFunction)
              .catch(() => returnFunction(false));
          }
          return returnFunction(false);
        }
      )
      .catch(() => returnFunction(false));
  }

  passport.use(
    'local-login',
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    },
      (req, email, password, done) => {
        User.findOne({ where: { email: email } })
          .then((user) => {
            if (user === null || !user.get().password) {
              return done(null, false);
            }

            if (bcrypt.compareSync(password, user.get().password)) {
              return done(null, user);
            }
            return done(null, false);
          })
          .catch((err) => done(err));
      })
  );

  passport.use(
    'local-jwt',
    new JWTStrategy({
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: authlogic.getJwtSecret(),
      algorithms: ['HS256']
    },
      (jwtPayload, done) => {
        return done(null, jwtPayload);
      }
    ));
};
