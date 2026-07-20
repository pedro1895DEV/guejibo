const express = require('express');
const path = require('path');
const gameService = require('../services/game.service');
const gameroomService = require('../services/gameroom.service');
const authlogic = require('../app/authlogic');

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
        try {
            const game = await gameService.findById(req.params.id);
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
        try {
            const result = await gameroomService.create(req.body.gameid, req.user.id);
            res.send({ success: true, ...result });
        } catch (error) {
            res.send({ success: false });
        }
    });

    /*
     * Creates a new game room with a new unregistered user as the owner.
     */
    app.post('/api/guest/gameroom/', async (req, res) => {
        try {
            const result = await gameroomService.createForGuest(req.body.gameid);
            res.send({
                success: true,
                id: result.id,
                game: result.game,
                code: result.code,
                token: authlogic.createJWT(result.guestUser)
            });
        } catch (error) {
            res.send({ success: false });
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
     */
    app.get('/api/gameroom/:id', isLoggedIn(), async (req, res) => {
        try {
            const room = await gameroomService.findById(req.params.id);
            if (!room) return res.status(404).send({ success: false, error: 'Game room not found' });
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
    app.use('/games', express.static(path.join(__dirname, '../../Games'), {
        redirect: true   // auto-redirect directories to include trailing slash
    }));

    app.use('/GamesLib', express.static(path.join(__dirname, '../../GamesLib')));

    app.get('/*', (req, res) => {
        res.sendFile('client/index.html', { root: path.join(__dirname, '..') });
    });

    //    
    function isLoggedIn() {
        return passport.authenticate('local-jwt', { session: false });
    }
};