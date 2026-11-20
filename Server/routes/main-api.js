'use strict';

const express = require('express');
const path = require('path');
const gameService = require('../services/game.service');
const gameroomService = require('../services/gameroom.service');
const authlogic = require('../app/authlogic');

function parsePositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

module.exports = function (app, passport) {

  /*
   * Returns a list of all available games.
   */
  app.get('/api/games', async (req, res) => {
    try {
      const games = await gameService.findAll();
      res.send(games);
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to fetch games' });
    }
  });

  /*
   * Returns information about a specific game.
   */
  app.get('/api/game/:id', async (req, res) => {
    const gameId = parsePositiveInt(req.params.id);
    if (!gameId) {
      return res.status(400).send({ success: false, error: 'Invalid game id' });
    }

    try {
      const game = await gameService.findById(gameId);
      if (!game) return res.status(404).send({ success: false, error: 'Game not found' });
      res.send(game);
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to fetch game' });
    }
  });

  /*
   * Creates a new game room with current user as the owner.
   */
  app.post('/api/gameroom', isLoggedIn(), async (req, res) => {
    const gameId = parsePositiveInt(req.body && req.body.gameid);
    if (!gameId) {
      return res.status(400).send({ success: false, error: 'Invalid gameid' });
    }

    try {
      const result = await gameroomService.create(gameId, req.user.id);
      if (!result) {
        return res.status(404).send({ success: false, error: 'Game not found' });
      }
      res.send({ success: true, ...result });
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to create game room' });
    }
  });

  /*
   * Creates a new game room with a new unregistered user as the owner.
   */
  app.post('/api/guest/gameroom/', async (req, res) => {
    const gameId = parsePositiveInt(req.body && req.body.gameid);
    if (!gameId) {
      return res.status(400).send({ success: false, error: 'Invalid gameid' });
    }

    try {
      const result = await gameroomService.createForGuest(gameId);
      if (!result) {
        return res.status(404).send({ success: false, error: 'Game not found' });
      }
      res.send({
        success: true,
        id: result.id,
        game: result.game,
        code: result.code,
        token: authlogic.createJWT(result.guestUser)
      });
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to create guest game room' });
    }
  });

  /*
   * Returns a list of all game rooms owned by current user.
   */
  app.get('/api/mygamerooms', isLoggedIn(), async (req, res) => {
    try {
      const rooms = await gameroomService.findByOwner(req.user.id);
      res.send(rooms);
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to fetch game rooms' });
    }
  });

  /*
   * Returns data about a game room, including a full list of members.
   * Restricted to the room owner and members.
   */
  app.get('/api/gameroom/:id', isLoggedIn(), async (req, res) => {
    const roomId = parsePositiveInt(req.params.id);
    if (!roomId) {
      return res.status(400).send({ success: false, error: 'Invalid game room id' });
    }

    try {
      const room = await gameroomService.findById(roomId);
      if (!room) return res.status(404).send({ success: false, error: 'Game room not found' });

      const isOwner = room.owner && room.owner.id === req.user.id;
      const isMember = Array.isArray(room.members) && room.members.some(m => m.id === req.user.id);
      if (!isOwner && !isMember) {
        return res.status(403).send({ success: false, error: 'Forbidden' });
      }

      res.send(room);
    } catch (error) {
      res.status(500).send({ success: false, error: 'Failed to fetch game room' });
    }
  });

  /*
   * All other routes are redirected to the Angular client.
   */
  app.use(express.static('client'));

  /*
   * Serve game static files securely.
   * express.static resolves paths internally and rejects any traversal
   * attempt (../) that would escape the served root directory.
   */
  const gamesDir = path.join(__dirname, '../../Games');
  app.use('/games', express.static(gamesDir, { redirect: true }));
  app.use('/Games', express.static(gamesDir, { redirect: true }));

  app.use('/GamesLib', express.static(path.join(__dirname, '../../GamesLib')));

  app.get('/*', (req, res) => {
    res.sendFile('client/index.html', { root: path.join(__dirname, '..') });
  });

  function isLoggedIn() {
    return passport.authenticate('local-jwt', { session: false });
  }
};
