'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const base64url = require('base64url');
const WebSocket = require('ws');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'e2e-test-jwt-secret';

const models = require('../sequelize/models');
const authlogic = require('../app/authlogic');
const gameService = require('../services/game.service');
const gameroomService = require('../services/gameroom.service');
const scoreService = require('../services/score.service');

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
        try { json = JSON.parse(raw); } catch (_e) { /* ignore */ }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

test('E2E Multiplayer Flow: teacher creates room -> guest joins & reuses JWT -> ready -> start -> score -> finish -> mygamerooms', async (t) => {
  // In-memory state backing the full HTTP + WebSocket multiplayer session
  const dbUsers = new Map();
  const dbRooms = new Map();
  const dbScores = new Map(); // key: `${userId}:${roomId}`
  const game = { id: 1, name: 'Binary Wars', basePath: 'binwars', path: 'binwars' };

  const teacher = {
    id: 1,
    name: 'Prof. Silva',
    email: 'silva@escola.br',
    temporary: false,
    get: () => ({ id: 1, name: 'Prof. Silva', email: 'silva@escola.br' })
  };
  dbUsers.set(1, teacher);
  let nextUserId = 100;

  const origUserFindOne = models.User.findOne;
  const origUserBuild = models.User.build;
  const origGameFindAll = gameService.findAll;
  const origRoomCreate = gameroomService.create;
  const origRoomFindByCode = gameroomService.findByCode;
  const origRoomFindActive = gameroomService.findActiveById;
  const origRoomFindWithGame = gameroomService.findWithGameById;
  const origRoomFindSimple = gameroomService.findSimpleById;
  const origRoomFindByOwner = gameroomService.findByOwner;
  const origRoomFindById = gameroomService.findById;
  const origRoomMarkStarted = gameroomService.markStarted;
  const origRoomMarkEnded = gameroomService.markEnded;
  const origAddMember = scoreService.addMember;
  const origFindActiveMem = scoreService.findActiveMembership;
  const origUpdateScore = scoreService.updateScore;
  const origCountActive = scoreService.countActivePlayers;

  t.after(() => {
    models.User.findOne = origUserFindOne;
    models.User.build = origUserBuild;
    gameService.findAll = origGameFindAll;
    gameroomService.create = origRoomCreate;
    gameroomService.findByCode = origRoomFindByCode;
    gameroomService.findActiveById = origRoomFindActive;
    gameroomService.findWithGameById = origRoomFindWithGame;
    gameroomService.findSimpleById = origRoomFindSimple;
    gameroomService.findByOwner = origRoomFindByOwner;
    gameroomService.findById = origRoomFindById;
    gameroomService.markStarted = origRoomMarkStarted;
    gameroomService.markEnded = origRoomMarkEnded;
    scoreService.addMember = origAddMember;
    scoreService.findActiveMembership = origFindActiveMem;
    scoreService.updateScore = origUpdateScore;
    scoreService.countActivePlayers = origCountActive;
  });

  models.User.findOne = async ({ where }) => dbUsers.get(where.id) || null;
  models.User.build = (attrs) => {
    const id = ++nextUserId;
    const u = {
      id,
      name: attrs.name,
      temporary: true,
      get: () => ({ id, name: attrs.name, temporary: true }),
      save: async () => { dbUsers.set(id, u); }
    };
    return u;
  };

  gameService.findAll = async () => [{ id: game.id, name: game.name, path: game.basePath }];
  gameroomService.create = async (gameId, ownerId) => {
    const room = {
      id: 10,
      code: 'WXYZ',
      gameId,
      ownerId,
      game,
      owner: dbUsers.get(ownerId),
      members: [],
      timeStarted: null,
      timeEnded: null
    };
    dbRooms.set(room.id, room);
    return { id: room.id, code: room.code, game: { id: game.id, name: game.name, path: game.basePath } };
  };
  gameroomService.findByCode = async (code) => {
    for (const r of dbRooms.values()) {
      if (r.code === code && r.timeStarted === null) return r;
    }
    return null;
  };
  gameroomService.findActiveById = async (id) => dbRooms.get(Number(id)) || null;
  gameroomService.findWithGameById = async (id) => dbRooms.get(Number(id)) || null;
  gameroomService.findSimpleById = async (id) => dbRooms.get(Number(id)) || null;
  gameroomService.markStarted = async (gr) => { gr.timeStarted = '2026-11-20 12:00:00'; };
  gameroomService.markEnded = async (gr) => { gr.timeEnded = '2026-11-20 12:05:00'; };
  gameroomService.findByOwner = async (ownerId) => {
    return Array.from(dbRooms.values())
      .filter(r => r.ownerId === ownerId)
      .map(r => ({ id: r.id, code: r.code, game: { id: game.id, name: game.name, path: game.basePath }, numberOfMembers: r.members.length, timeStarted: r.timeStarted, timeEnded: r.timeEnded }));
  };
  gameroomService.findById = async (id) => {
    const r = dbRooms.get(Number(id));
    if (!r) return null;
    return {
      id: r.id,
      code: r.code,
      game: { id: game.id, name: game.name, path: game.basePath },
      owner: { id: r.owner.id, name: r.owner.name },
      members: r.members.map(m => ({ id: m.id, name: m.name })),
      timeStarted: r.timeStarted,
      timeEnded: r.timeEnded
    };
  };

  scoreService.addMember = async (gr, userId) => {
    const u = dbUsers.get(userId);
    if (!gr.members.some(m => m.id === userId)) {
      gr.members.push(u);
    }
    dbScores.set(`${userId}:${gr.id}`, { userId, gameRoomId: gr.id, score: 0, ended: false });
  };
  scoreService.findActiveMembership = async (userId, roomId) => {
    const entry = dbScores.get(`${userId}:${roomId}`);
    return entry && !entry.ended ? entry : null;
  };
  scoreService.updateScore = async (userId, roomId, score, ended) => {
    const entry = dbScores.get(`${userId}:${roomId}`);
    if (entry) {
      entry.score = score;
      entry.ended = ended;
    }
  };
  scoreService.countActivePlayers = async (roomId) => {
    let count = 0;
    for (const entry of dbScores.values()) {
      if (entry.gameRoomId === Number(roomId) && !entry.ended) count++;
    }
    return count;
  };

  const { app } = require('../index');
  const server = http.createServer(app);
  const wss = require('../app/ws')(app, server, null);
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

  function nextMsg(ws) {
    return new Promise(resolve => ws.once('message', raw => resolve(JSON.parse(raw.toString()))));
  }

  // 1. Teacher creates a game room via REST API
  const teacherJwt = authlogic.createJWT(teacher);
  const createRes = await httpRequest(port, 'POST', '/api/gameroom', {
    headers: { Authorization: 'Bearer ' + teacherJwt },
    body: { gameid: 1 }
  });
  assert.equal(createRes.status, 200);
  assert.equal(createRes.json.success, true);
  assert.equal(createRes.json.code, 'WXYZ');
  const roomId = createRes.json.id;

  // 2. Teacher connects to WebSocket
  const teacherWs = await connectWs(teacherJwt);

  // 3. Guest student connects with unregistered_<base64url> and joins room
  const studentWs1 = await connectWs('unregistered_' + base64url.encode('Carlos Eduardo'));
  const joinP = nextMsg(studentWs1);
  studentWs1.send(JSON.stringify({ action: 'join', code: 'wxyz' }));
  const joinRes = await joinP;
  assert.equal(joinRes.responseTo, 'join');
  assert.equal(joinRes.success, true);
  assert.ok(joinRes.token, 'join response should include a temporary JWT for the guest');

  // Verify guest can reconnect using the issued JWT without creating a new User row
  const userCountAfterFirstJoin = dbUsers.size;
  studentWs1.close();
  const studentWs = await connectWs(joinRes.token);
  assert.equal(dbUsers.size, userCountAfterFirstJoin, 'reconnecting with guest JWT must not create duplicate User');

  // 4. Student sends im-ready -> Teacher receives player-is-ready
  const readyP = nextMsg(teacherWs);
  studentWs.send(JSON.stringify({ action: 'im-ready', gameroom: roomId }));
  const readyMsg = await readyP;
  assert.equal(readyMsg.req, 'player-is-ready');
  assert.equal(readyMsg.user.name, 'Carlos Eduardo');

  // 5. Teacher starts game -> Student receives game-started
  const studentStartedP = nextMsg(studentWs);
  const teacherStartedP = nextMsg(teacherWs);
  teacherWs.send(JSON.stringify({ action: 'start-game', gameroom: roomId }));
  const [studentStarted] = await Promise.all([studentStartedP, teacherStartedP]);
  assert.equal(studentStarted.req, 'game-started');
  assert.equal(studentStarted.path, 'binwars');

  // 6. Student finishes game -> Teacher receives update-score and game-over, Student receives user-game-over
  const studentOverP = nextMsg(studentWs);
  const teacherMessages = [];
  const teacherDoneP = new Promise(resolve => {
    teacherWs.on('message', raw => {
      teacherMessages.push(JSON.parse(raw.toString()));
      if (teacherMessages.length === 2) resolve();
    });
  });

  studentWs.send(JSON.stringify({ action: 'update-score', gameroom: roomId, score: 850, endgame: true }));
  const [studentOver] = await Promise.all([studentOverP, teacherDoneP]);

  assert.equal(studentOver.req, 'user-game-over');
  assert.equal(studentOver.score, 850);
  assert.equal(teacherMessages[0].req, 'update-score');
  assert.equal(teacherMessages[0].score, 850);
  assert.equal(teacherMessages[0].endgame, true);
  assert.equal(teacherMessages[1].req, 'game-over');

  // 7. Teacher queries /api/mygamerooms and /api/gameroom/:id
  const myRoomsRes = await httpRequest(port, 'GET', '/api/mygamerooms', {
    headers: { Authorization: 'Bearer ' + teacherJwt }
  });
  assert.equal(myRoomsRes.status, 200);
  assert.equal(myRoomsRes.json.length, 1);
  assert.equal(myRoomsRes.json[0].code, 'WXYZ');

  const roomDetailsRes = await httpRequest(port, 'GET', `/api/gameroom/${roomId}`, {
    headers: { Authorization: 'Bearer ' + teacherJwt }
  });
  assert.equal(roomDetailsRes.status, 200);
  assert.equal(roomDetailsRes.json.members.length, 1);
  assert.equal(roomDetailsRes.json.members[0].name, 'Carlos Eduardo');

  teacherWs.close();
  studentWs.close();
});
