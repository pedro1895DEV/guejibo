'use strict';

const WebSocket = require('ws');
const base64url = require('base64url');
const models = require('../sequelize/models');
const gamelogic = require('../app/gamelogic');
const authlogic = require('../app/authlogic');
const gameroomService = require('../services/gameroom.service');
const scoreService = require('../services/score.service');

const User = models.User;
const GameRoom = models.GameRoom;

const MAX_GUEST_NAME_LENGTH = 50;

function extractTokenFromUrl(reqUrl) {
  const pathOnly = (reqUrl || '').split('?')[0];
  const segments = pathOnly.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
}

module.exports = function (app, httpServer, _passport) {

  // Web socket server for this connection
  const wss = new WebSocket.Server({
    server: httpServer,
    verifyClient: async (info, done) => {
      try {
        const token = extractTokenFromUrl(info.req.url);
        if (!token) {
          done(false);
          return;
        }

        let authenticatedUser = null;

        // Unregistered user
        if (token.startsWith('unregistered_')) {
          let name = base64url.decode(token.slice(13)).trim();
          if (!name || name === 'null' || name === 'undefined') {
            name = gamelogic.createRandomUserName();
          } else if (name.length > MAX_GUEST_NAME_LENGTH) {
            name = name.slice(0, MAX_GUEST_NAME_LENGTH);
          }

          authenticatedUser = User.build({
            name: name,
            temporary: true
          });
          await authenticatedUser.save();
        }
        // Registered user — validate JWT signature + expiration and look up the user
        else {
          let decoded;
          try {
            decoded = authlogic.verifyJWT(token);
          } catch (e) {
            done(false);
            return;
          }

          if (!decoded || !decoded.id) {
            done(false);
            return;
          }

          authenticatedUser = await User.findOne({ where: { id: decoded.id } });
        }

        if (!authenticatedUser) {
          done(false);
          return;
        }

        info.req.authenticatedUser = authenticatedUser;
        done(true);
      } catch (e) {
        console.error('WS verifyClient error:', e.message);
        done(false);
      }
    }
  });

  // Dictionary of Sets of web sockets indexed by user id
  const webSocketsById = {};

  /**
   * Sends a JSON-stringified payload to all active connections of a user.
   * Silently skips users with no active connections.
   */
  function sendToUser(userId, payload) {
    const sockets = webSocketsById[userId];
    if (!sockets) return;

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    const currentUser = req.authenticatedUser;
    const userId = currentUser.id;

    // Store connection in a Set to support multiple tabs/devices
    if (!webSocketsById[userId]) {
      webSocketsById[userId] = new Set();
    }
    webSocketsById[userId].add(ws);
    ws.user = currentUser;

    // Clean up on close to prevent memory leak
    ws.on('close', () => {
      const sockets = webSocketsById[userId];
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          delete webSocketsById[userId];
        }
      }
    });

    // Handle errors without crashing the process
    ws.on('error', (err) => {
      console.error(`WebSocket error for user ${userId}:`, err.message);
      ws.terminate();
    });

    ws.on('message', message => {
      let data;
      try {
        data = JSON.parse(message);

        if (!data || !data.action) {
          ws.send('Error: missing action field');
          return;
        }

        switch (data.action) {
          // Waiting and joining actions
          case 'join':
            doActionJoin(ws, data.code);
            return;

          case 'im-ready':
            doActionImReady(ws, data);
            return;

          case 'start-game':
            doActionStartGame(ws, data);
            return;

          case 'end-game':
            doActionEndGame(ws, data);
            return;

          // In-game actions
          case 'update-score':
            doActionUpdateScore(ws, data);
            return;

          default:
            ws.send(`Error: invalid action "${data.action}"`);
            return;
        }
      } catch (e) {
        ws.send('Error: invalid data');
      }
    });
  });

  /*
   * 'join' -> Joining a game, given code.
   */
  async function doActionJoin(ws, code) {
    try {
      if (typeof code !== 'string' || code.trim().length === 0) {
        ws.send(JSON.stringify({
          responseTo: 'join',
          success: false,
          error: 'Invalid game room code'
        }));
        return;
      }

      const gr = await gameroomService.findByCode(code.trim().toUpperCase());

      if (gr === null) {
        ws.send(JSON.stringify({
          responseTo: 'join',
          success: false,
          error: 'Game room not found'
        }));
        return;
      }

      await scoreService.addMember(gr, ws.user.get().id);

      ws.send(JSON.stringify({
        responseTo: 'join',
        success: true,
        gameroom: GameRoom.exportObject(gr, true)
      }));
    } catch (e) {
      console.error('WS doActionJoin error:', e.message);
      ws.send(JSON.stringify({
        responseTo: 'join',
        success: false,
        error: 'Failed to join game room'
      }));
    }
  }

  /*
   * 'im-ready' -> Confirm that a waiting client is ready to start playing.
   */
  async function doActionImReady(ws, data) {
    try {
      const gr = await gameroomService.findActiveById(data.gameroom);
      if (gr === null) return;

      const isParticipant = gr.ownerId === ws.user.id || gr.members.some(m => m.id === ws.user.id);
      if (!isParticipant) return;

      const sendToList = gr.members.map(m => m.id).filter(id => id !== ws.user.id);
      sendToList.push(gr.ownerId);

      const payload = {
        req: 'player-is-ready',
        user: User.exportObject(ws.user),
        gameroom: data.gameroom
      };

      for (const id of sendToList) {
        sendToUser(id, payload);
      }
    } catch (e) {
      console.error('WS doActionImReady error:', e.message);
    }
  }

  /*
   * Start a new game room session. Only the room owner is authorized.
   */
  async function doActionStartGame(ws, data) {
    try {
      const gr = await gameroomService.findWithGameById(data.gameroom);
      if (gr === null) return;

      if (gr.ownerId !== ws.user.id) {
        ws.send(JSON.stringify({
          responseTo: 'start-game',
          success: false,
          error: 'Forbidden'
        }));
        return;
      }

      await gameroomService.markStarted(gr);

      const sendToList = gr.members.filter(m => m.id !== ws.user.id);
      sendToList.push(gr.owner);

      for (const user of sendToList) {
        sendToUser(user.id, {
          req: 'game-started',
          gameroom: data.gameroom,
          startTime: gr.timeStarted,
          path: gr.game.basePath,
          token: authlogic.createJWT(user)
        });
      }
    } catch (e) {
      console.error('WS doActionStartGame error:', e.message);
    }
  }

  /**
   * Updates the score for an ongoing game. Only active room members are authorized.
   */
  async function doActionUpdateScore(ws, data) {
    try {
      const score = Number(data.score);
      if (!Number.isFinite(score)) return;

      const gr = await gameroomService.findSimpleById(data.gameroom);
      if (gr === null) return;

      const membership = await scoreService.findActiveMembership(ws.user.id, data.gameroom);
      if (!membership) return;

      const endgame = Boolean(data.endgame);

      // Update database with new score and endgame status
      await scoreService.updateScore(ws.user.id, data.gameroom, score, endgame);

      // Send new score to the game room owner
      sendToUser(gr.ownerId, {
        req: 'update-score',
        user: ws.user.id,
        gameroom: data.gameroom,
        score: score,
        endgame: endgame
      });

      // If this player has finished...
      if (endgame) {
        // ... send a confirmation message ...
        sendToUser(ws.user.id, {
          req: 'user-game-over',
          user: User.exportObject(ws.user),
          gameroom: data.gameroom,
          score: score
        });

        // ... and check if the game is also over for everybody else
        const activePlayers = await scoreService.countActivePlayers(data.gameroom);
        if (activePlayers === 0) {
          await wrapUpGameRoom(gr);
        }
      }
    } catch (e) {
      console.error('WS doActionUpdateScore error:', e.message);
    }
  }

  /**
   * Forces an ongoing game to end prematurely. Only the room owner is authorized.
   */
  async function doActionEndGame(ws, data) {
    try {
      const gr = await gameroomService.findSimpleById(data.gameroom);
      if (gr === null) return;

      if (gr.ownerId !== ws.user.id) {
        ws.send(JSON.stringify({
          responseTo: 'end-game',
          success: false,
          error: 'Forbidden'
        }));
        return;
      }

      await scoreService.endAllPlayers(data.gameroom);
      await wrapUpGameRoom(gr);
    } catch (e) {
      console.error('WS doActionEndGame error:', e.message);
    }
  }

  /**
   * Updates the database and sends the owner a message to indicate that
   * the game is over for a game room.
   */
  async function wrapUpGameRoom(gr) {
    try {
      await gameroomService.markEnded(gr);

      sendToUser(gr.ownerId, {
        req: 'game-over',
        gameroom: gr.id,
        endTime: gr.timeEnded
      });
    } catch (e) {
      console.error('WS wrapUpGameRoom error:', e.message);
    }
  }

  return wss;
};
