import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(__dirname, '../dist/gameslib.js');

function createSandbox(cookieStr = '') {
  const sentMessages = [];
  let createdWs = null;

  class MockWebSocket {
    static OPEN = 1;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = MockWebSocket.OPEN;
      createdWs = this;
    }
    send(msg) {
      sentMessages.push(JSON.parse(msg));
    }
    close() {
      this.readyState = MockWebSocket.CLOSED;
    }
  }

  const document = { cookie: cookieStr };
  const window = {
    location: { protocol: 'http:', host: 'localhost:4200' },
    setInterval: () => 123,
    clearInterval: () => {},
    setTimeout: () => 456,
    clearTimeout: () => {},
    open: () => {},
    WebSocket: MockWebSocket
  };

  const context = vm.createContext({
    window,
    document,
    WebSocket: MockWebSocket,
    console: { warn: () => {}, log: () => {} }
  });

  const code = fs.readFileSync(bundlePath, 'utf8');
  vm.runInContext(code, context);

  return {
    gameslib: context.gameslib,
    sentMessages,
    getCreatedWs: () => createdWs
  };
}

test('GamesLib bundle runs in standalone mode when no jwt cookie exists', () => {
  const { gameslib, getCreatedWs } = createSandbox('');
  const gc = new gameslib.GameConnection();
  assert.ok(gc);
  assert.equal(getCreatedWs(), null);
});

test('GamesLib bundle connects, sends score, and triggers onEndGame callback', () => {
  const { gameslib, sentMessages, getCreatedWs } = createSandbox('jwt=my-test-jwt; gameroom=77');
  const gc = new gameslib.GameConnection();
  const ws = getCreatedWs();

  assert.ok(ws);
  assert.equal(ws.url, 'ws://localhost:4200/ws/my-test-jwt');

  ws.onopen();
  gc.sendScore('450', true);

  assert.equal(sentMessages.length, 1);
  assert.deepEqual(sentMessages[0], {
    action: 'update-score',
    gameroom: 77,
    score: 450,
    endgame: true
  });

  let receivedEndData = null;
  gc.onEndGame(data => {
    receivedEndData = data;
  });

  ws.onmessage({
    data: JSON.stringify({
      req: 'user-game-over',
      gameroom: 77,
      score: 450,
      user: { id: 9, name: 'Maria' }
    })
  });

  assert.deepEqual(JSON.parse(JSON.stringify(receivedEndData)), {
    gameroom: 77,
    score: 450,
    user: { id: 9, name: 'Maria' }
  });

  // Malformed JSON should not throw
  assert.doesNotThrow(() => {
    ws.onmessage({ data: 'not-json' });
  });

  gc.disconnect();
});
