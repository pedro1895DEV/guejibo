'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const base64url = require('base64url');
const WebSocket = require('ws');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
process.env.SESSION_SECRET = 'test-session-secret';
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;

const models = require('../sequelize/models');
const authlogic = require('../app/authlogic');
const gameroomService = require('../services/gameroom.service');
const scoreService = require('../services/score.service');
const gameService = require('../services/game.service');

// Helper to make HTTP JSON requests using Node's built-in http module
function httpRequest(port, method, reqPath, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload !== null) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({ hostname: '127.0.0.1', port, path: reqPath, method, headers: reqHeaders }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_e) { /* non-JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

test('Sequelize configuration points to config.js and config.json is removed', () => {
  const rc = require('../sequelize/.sequelizerc');
  assert.ok(rc.config.endsWith(path.join('config', 'config.js')));
  assert.equal(fs.existsSync(path.join(__dirname, '../sequelize/config/config.json')), false);
});

test('JWT creation includes iat/exp and verifyJWT rejects expired or tampered tokens', () => {
  const token = authlogic.createJWT({ id: 42, name: 'Alice', email: 'alice@example.com' });
  const decoded = authlogic.verifyJWT(token);

  assert.equal(decoded.id, 42);
  assert.equal(decoded.name, 'Alice');
  assert.equal(decoded.email, 'alice@example.com');
  assert.equal(typeof decoded.iat, 'number');
  assert.equal(typeof decoded.exp, 'number');
  assert.ok(decoded.exp > decoded.iat);

  // Tampered token must fail
  assert.throws(() => authlogic.verifyJWT(token + 'tamper'));

  // Expired token must fail
  const jwtSimple = require('jwt-simple');
  const expiredToken = jwtSimple.encode(
    { id: 42, name: 'Alice', exp: Math.floor(Date.now() / 1000) - 60 },
    authlogic.getJwtSecret(),
    'HS256'
  );
  assert.throws(() => authlogic.verifyJWT(expiredToken), /Token expired/);
});

test('Local login handles OAuth user with null password without crashing', async (t) => {
  const origFindOne = models.User.findOne;
  t.after(() => { models.User.findOne = origFindOne; });

  const localPassport = new passport.Passport();
  require('../app/auth')(localPassport);

  const app = express();
  app.use(bodyParser.json());
  app.use(localPassport.initialize());
  require('../routes/auth-api')(app, localPassport);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;

  // User created via Google OAuth has password === null
  models.User.findOne = async () => ({
    id: 7,
    name: 'OAuth User',
    email: 'oauth@example.com',
    get: () => ({ id: 7, name: 'OAuth User', email: 'oauth@example.com', password: null })
  });

  const res = await httpRequest(port, 'POST', '/auth/login', {
    body: { email: 'oauth@example.com', password: 'anypassword' }
  });
  // Passport redirects to /auth/error (302) instead of throwing 500
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/auth/error');

  // Valid local password succeeds
  const hashed = bcrypt.hashSync('supersecret123', 4);
  models.User.findOne = async () => ({
    id: 8,
    name: 'Local User',
    email: 'local@example.com',
    get: () => ({ id: 8, name: 'Local User', email: 'local@example.com', password: hashed })
  });

  const okRes = await httpRequest(port, 'POST', '/auth/login', {
    body: { email: 'local@example.com', password: 'supersecret123' }
  });
  assert.equal(okRes.status, 200);
  assert.equal(okRes.json.success, true);
  assert.ok(okRes.json.token);

  // Google OAuth route returns 503 cleanly when unconfigured
  const googleRes = await httpRequest(port, 'GET', '/auth/google');
  assert.equal(googleRes.status, 503);
  assert.equal(googleRes.json.success, false);
});

test('Main API enforces gameroom authorization and validates game IDs', async (t) => {
  const origFindById = gameroomService.findById;
  const origCreate = gameroomService.create;
  const origGameFindById = gameService.findById;
  t.after(() => {
    gameroomService.findById = origFindById;
    gameroomService.create = origCreate;
    gameService.findById = origGameFindById;
  });

  const localPassport = new passport.Passport();
  require('../app/auth')(localPassport);

  const app = express();
  app.use(bodyParser.json());
  app.use(localPassport.initialize());
  require('../routes/main-api')(app, localPassport);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;

  const ownerToken = authlogic.createJWT({ id: 10, name: 'Owner', email: 'owner@example.com' });
  const memberToken = authlogic.createJWT({ id: 20, name: 'Member', email: 'member@example.com' });
  const intruderToken = authlogic.createJWT({ id: 99, name: 'Intruder', email: 'intruder@example.com' });

  gameroomService.findById = async () => ({
    id: 1,
    code: 'ABCD',
    owner: { id: 10, name: 'Owner' },
    members: [{ id: 20, name: 'Member' }]
  });

  // Intruder receives 403 Forbidden
  const forbiddenRes = await httpRequest(port, 'GET', '/api/gameroom/1', {
    headers: { Authorization: 'Bearer ' + intruderToken }
  });
  assert.equal(forbiddenRes.status, 403);

  // Owner and member receive 200 OK
  const ownerRes = await httpRequest(port, 'GET', '/api/gameroom/1', {
    headers: { Authorization: 'Bearer ' + ownerToken }
  });
  assert.equal(ownerRes.status, 200);
  assert.equal(ownerRes.json.code, 'ABCD');

  const memberRes = await httpRequest(port, 'GET', '/api/gameroom/1', {
    headers: { Authorization: 'Bearer ' + memberToken }
  });
  assert.equal(memberRes.status, 200);

  // Non-integer game id rejected with 400
  const badGameId = await httpRequest(port, 'GET', '/api/game/not-a-number');
  assert.equal(badGameId.status, 400);

  // Creating gameroom for non-existent game returns 404
  gameroomService.create = async () => null;
  const missingGame = await httpRequest(port, 'POST', '/api/gameroom', {
    headers: { Authorization: 'Bearer ' + ownerToken },
    body: { gameid: 9999 }
  });
  assert.equal(missingGame.status, 404);
  assert.equal(missingGame.json.success, false);
});

test('WebSocket enforces ownership on start-game/end-game, membership on update-score, and UTF-8 guest names', async (t) => {
  const origUserFindOne = models.User.findOne;
  const origUserBuild = models.User.build;
  const origFindWithGame = gameroomService.findWithGameById;
  const origFindSimple = gameroomService.findSimpleById;
  const origMarkStarted = gameroomService.markStarted;
  const origMarkEnded = gameroomService.markEnded;
  const origFindActive = scoreService.findActiveMembership;
  const origUpdateScore = scoreService.updateScore;
  const origEndAll = scoreService.endAllPlayers;

  t.after(() => {
    models.User.findOne = origUserFindOne;
    models.User.build = origUserBuild;
    gameroomService.findWithGameById = origFindWithGame;
    gameroomService.findSimpleById = origFindSimple;
    gameroomService.markStarted = origMarkStarted;
    gameroomService.markEnded = origMarkEnded;
    scoreService.findActiveMembership = origFindActive;
    scoreService.updateScore = origUpdateScore;
    scoreService.endAllPlayers = origEndAll;
  });

  const users = {
    10: { id: 10, name: 'Owner', email: 'o@e.com', get: () => ({ id: 10, name: 'Owner' }) },
    20: { id: 20, name: 'Player', email: 'p@e.com', get: () => ({ id: 20, name: 'Player' }) },
    99: { id: 99, name: 'Intruder', email: 'i@e.com', get: () => ({ id: 99, name: 'Intruder' }) }
  };

  models.User.findOne = async ({ where }) => users[where.id] || null;
  let capturedGuestName = null;
  models.User.build = (attrs) => {
    capturedGuestName = attrs.name;
    return {
      id: 500,
      name: attrs.name,
      temporary: true,
      get: () => ({ id: 500, name: attrs.name }),
      save: async () => {}
    };
  };

  let startedCalled = false;
  let endedCalled = false;
  let scoreUpdated = false;

  gameroomService.findWithGameById = async () => ({
    id: 1,
    ownerId: 10,
    owner: users[10],
    members: [users[20]],
    game: { basePath: 'binwars' },
    timeStarted: '2026-01-01 00:00:00'
  });
  gameroomService.findSimpleById = async () => ({ id: 1, ownerId: 10, timeEnded: '2026-01-01 00:10:00' });
  gameroomService.markStarted = async () => { startedCalled = true; };
  gameroomService.markEnded = async () => { endedCalled = true; };
  scoreService.endAllPlayers = async () => {};
  scoreService.findActiveMembership = async (userId) => (userId === 20 ? { userId: 20, gameRoomId: 1, ended: false } : null);
  scoreService.updateScore = async () => { scoreUpdated = true; };

  const app = express();
  const server = http.createServer(app);
  const wss = require('../app/ws')(app, server, passport);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const client of wss.clients) client.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
  });

  const port = server.address().port;

  function connectWs(token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/${token}`);
      ws.once('open', () => resolve(ws));
      ws.once('error', reject);
    });
  }

  function nextMessage(ws) {
    return new Promise((resolve) => ws.once('message', msg => resolve(JSON.parse(msg.toString()))));
  }

  // 1. Invalid JWT rejected at handshake
  await assert.rejects(() => connectWs('invalid.jwt.token'));

  // 2. UTF-8 Portuguese guest name decoded properly
  const guestWs = await connectWs('unregistered_' + base64url.encode('João Vitória'));
  assert.equal(capturedGuestName, 'João Vitória');
  guestWs.close();

  // 3. Connect owner and intruder
  const ownerWs = await connectWs(authlogic.createJWT(users[10]));
  const intruderWs = await connectWs(authlogic.createJWT(users[99]));
  const playerWs = await connectWs(authlogic.createJWT(users[20]));

  // Intruder cannot start-game
  const startForbiddenP = nextMessage(intruderWs);
  intruderWs.send(JSON.stringify({ action: 'start-game', gameroom: 1 }));
  const startForbidden = await startForbiddenP;
  assert.equal(startForbidden.success, false);
  assert.equal(startForbidden.error, 'Forbidden');
  assert.equal(startedCalled, false);

  // Intruder cannot end-game
  const endForbiddenP = nextMessage(intruderWs);
  intruderWs.send(JSON.stringify({ action: 'end-game', gameroom: 1 }));
  const endForbidden = await endForbiddenP;
  assert.equal(endForbidden.success, false);
  assert.equal(endForbidden.error, 'Forbidden');
  assert.equal(endedCalled, false);

  // Intruder cannot spoof update-score
  intruderWs.send(JSON.stringify({ action: 'update-score', gameroom: 1, score: 9999, endgame: false }));
  await new Promise(r => setTimeout(r, 80));
  assert.equal(scoreUpdated, false);

  // Real member can update-score and owner receives it
  const ownerScoreP = nextMessage(ownerWs);
  playerWs.send(JSON.stringify({ action: 'update-score', gameroom: 1, score: 150, endgame: false }));
  const ownerScoreMsg = await ownerScoreP;
  assert.equal(ownerScoreMsg.req, 'update-score');
  assert.equal(ownerScoreMsg.user, 20);
  assert.equal(ownerScoreMsg.score, 150);
  assert.equal(scoreUpdated, true);

  // Owner can start-game (both player and owner receive game-started)
  const playerStartedP = nextMessage(playerWs);
  const ownerStartedP = nextMessage(ownerWs);
  ownerWs.send(JSON.stringify({ action: 'start-game', gameroom: 1 }));
  const [playerStarted, ownerStarted] = await Promise.all([playerStartedP, ownerStartedP]);
  assert.equal(playerStarted.req, 'game-started');
  assert.equal(ownerStarted.req, 'game-started');
  assert.equal(startedCalled, true);

  // Owner can end-game
  const ownerGameOverP = nextMessage(ownerWs);
  ownerWs.send(JSON.stringify({ action: 'end-game', gameroom: 1 }));
  const ownerGameOver = await ownerGameOverP;
  assert.equal(ownerGameOver.req, 'game-over');
  assert.equal(endedCalled, true);

  ownerWs.close();
  intruderWs.close();
  playerWs.close();
});

test('Server index boots cleanly with trust proxy and security headers', async (t) => {
  const { app } = require('../index');
  assert.equal(app.get('trust proxy'), 1);
  assert.equal(app.get('x-powered-by'), false);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const res = await httpRequest(server.address().port, 'GET', '/auth/error');
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.equal(res.json.success, false);
});
