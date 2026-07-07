const WebSocket = require('ws');
const jwt = require('jwt-simple');
const base64url = require("base64url");
const models = require('../sequelize/models');
const gamelogic = require('../app/gamelogic');
const authlogic = require('../app/authlogic');

const User = models.User;
const GameRoom = models.GameRoom;
const Game = models.Game;
const UsersGameRooms = models.UsersGameRooms;


module.exports = function (app, httpServer, passport) {

    //Web socket server for this connection
    const wss = new WebSocket.Server({
        server: httpServer,
        verifyClient: async (info, done) => {
            const token = info.req.url.split('/')[1];

            let authenticatedUser = null;

            //Unregistered user
            if (token.startsWith('unregistered_')) {
                let name = base64url.decode(token.substr(13));
                if (name === '') {
                    name = gamelogic.createRandomUserName();
                }

                authenticatedUser = User.build(
                    {
                        name: name,
                        temporary: true
                    }
                );
                await authenticatedUser.save();
            }

            //Registered user — validate JWT and look up the user
            else {
                let decoded;
                try {
                    decoded = jwt.decode(token, process.env.JWT_SECRET);
                }
                catch (e) {
                    done(false);
                    return;
                }

                authenticatedUser = await User.findOne({ where: { id: decoded.id } });
            }

            // Reject connection if the user could not be resolved
            if (!authenticatedUser) {
                done(false);
                return;
            }

            // Attach the verified user to the request so it can be read
            // in the 'connection' handler without a shared closure variable.
            info.req.authenticatedUser = authenticatedUser;
            done(true);
        }
    });

    //Dictionary of Sets of web sockets indexed by user id
    let webSocketsById = {};

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

                if (!data.action) {
                    ws.send("Error: missing action field");
                    return;
                }

                switch (data.action) {
                    //Waiting and joining actions
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

                    //In-game actions
                    case 'update-score':
                        doActionUpdateScore(ws, data);
                        return;

                    //
                    default:
                        ws.send(`Error: invalid action "${data.action}"`);
                        return;
                }

            }
            catch (e) {

                ws.send('Error: invalid data');
                return;
            }
        });
    });

    /*
     * 'join' -> Joing a game, given code.
     */
    function doActionJoin(ws, code) {
        GameRoom.findOne({
            where: {
                code: code,
                timeStarted: null
            },
            include: [
                {
                    model: Game,
                    as: 'game'
                },
                {
                    model: User,
                    as: 'owner'
                },
                {
                    model: User,
                    as: 'members'
                }
            ]
        })
            .then(gr => {
                if (gr === null) {
                    ws.send(JSON.stringify({
                        responseTo: 'join',
                        success: false,
                        error: 'Game room not found'
                    }));
                    return;
                }

                gr.addMember(ws.user.get().id)
                    .then(() => {
                        ws.send(JSON.stringify({
                            responseTo: 'join',
                            success: true,
                            gameroom: GameRoom.exportObject(gr, true)
                        }));
                    })
                    .catch(e => {
                        console.error('WS doActionJoin addMember error:', e.message);
                        ws.send(JSON.stringify({
                            responseTo: 'join',
                            success: false,
                            error: 'Failed to join game room'
                        }));
                    });
            })
            .catch(e => {
                console.error('WS doActionJoin error:', e.message);
                ws.send(JSON.stringify({
                    responseTo: 'join',
                    success: false,
                    error: 'Game room not found'
                }));
            });
    }

    /*
     * 'im-ready' -> Confirm that a waiting client is ready to start playing.
     */
    function doActionImReady(ws, data) {
        GameRoom.findOne({
            where: {
                id: data.gameroom,
                timeEnded: null
            },
            include: [
                {
                    model: User,
                    as: 'owner'
                },
                {
                    model: User,
                    as: 'members'
                }
            ]
        })
            .then(gr => {
                if (gr === null) return;

                let sendToList = gr.members.map(m => m.id).filter(id => id != ws.user.id);
                sendToList.push(gr.ownerId);

                const payload = {
                    req: 'player-is-ready',
                    user: User.exportObject(ws.user),
                    gameroom: data.gameroom
                };

                for (let id of sendToList) {
                    sendToUser(id, payload);
                }
            })
            .catch(e => {
                console.error('WS doActionImReady error:', e.message);
            });
    }

    /*
     * Start a new game room session.
     */
    function doActionStartGame(ws, data) {
        GameRoom.findOne({
            where: {
                id: data.gameroom
            },
            include: [
                {
                    model: User,
                    as: 'owner'
                },
                {
                    model: User,
                    as: 'members'
                },
                {
                    model: Game,
                    as: 'game'
                }
            ]
        })
            .then(gr => {
                if (gr === null) return;

                gr.timeStarted = toMysqlFormat(new Date());
                gr.save()
                    .then(result => {
                        let sendToList = gr.members.filter(m => m.id != ws.user.id);
                        sendToList.push(gr.owner);

                        for (let user of sendToList) {
                            sendToUser(user.id, {
                                req: 'game-started',
                                gameroom: data.gameroom,
                                startTime: gr.timeStarted,
                                path: gr.game.basePath,
                                token: authlogic.createJWT(user)
                            });
                        }
                    })
                    .catch(e => {
                        console.error('WS doActionStartGame save error:', e.message);
                    });
            })
            .catch(e => {
                console.error('WS doActionStartGame error:', e.message);
            });
    }


    //Adapted from https://stackoverflow.com/a/5133807/641312    
    function toMysqlFormat(date) {
        function pad(d) {
            if (0 <= d && d < 10) return "0" + d.toString();
            if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
            return d.toString();
        }
        return date.getUTCFullYear() + "-" + pad(1 + date.getUTCMonth()) + "-" + pad(date.getUTCDate()) + " " + pad(date.getUTCHours()) + ":" + pad(date.getUTCMinutes()) + ":" + pad(date.getUTCSeconds());
    }

    /**
     * Updates the score for an ongoing game.
     */
    function doActionUpdateScore(ws, data) {
        GameRoom.findOne({
            where: {
                id: data.gameroom
            }
        })
            .then(gr => {
                if (gr === null) return;

                //Send new score to the game room owner
                sendToUser(gr.ownerId, {
                    req: 'update-score',
                    user: ws.user.id,
                    gameroom: data.gameroom,
                    score: data.score,
                    endgame: data.endgame
                });

                //Update database with new score and endgame status
                return UsersGameRooms.update(
                    {
                        score: data.score,
                        ended: data.endgame
                    },
                    {
                        where: {
                            userId: ws.user.id,
                            gameRoomId: data.gameroom,
                            ended: false
                        }
                    }
                )
                    .then(n => {
                        //If this player has finished...
                        if (data.endgame) {          

                            //... send a confirmation message ...
                            sendToUser(ws.user.id, {
                                req: 'user-game-over',
                                user: User.exportObject(ws.user),
                                gameroom: data.gameroom,
                                score: data.score
                            });                            
                            
                            //... and check if the game is also over for everybody else
                            return UsersGameRooms.findAndCountAll({
                                where: {
                                    gameRoomId: data.gameroom,
                                    ended: false
                                }
                            })
                                .then(obj => {
                                    if (obj.count === 0) {
                                        wrapUpGameRoom(gr);
                                    }
                                });
                        }
                    });
            })
            .catch(e => {
                console.error('WS doActionUpdateScore error:', e.message);
            });
    }

    /**
     * Forces an ongoing game to end prematurely.
     */
    function doActionEndGame(ws, data) {
        UsersGameRooms.update(
            { ended: true },
            { where: { gameRoomId: data.gameroom } }
        )
            .then(n => {
                return GameRoom.findOne(
                    { where: { id: data.gameroom } }
                )
                    .then(gr => {
                        if (gr === null) return;
                        wrapUpGameRoom(gr);
                    });
            })
            .catch(e => {
                console.error('WS doActionEndGame error:', e.message);
            });
    }

    /**
     * Udpdates the database and send the owner a message to indicate that
     * the game is over for a game room.
     */
    function wrapUpGameRoom(gr) {
        gr.timeEnded = toMysqlFormat(new Date());
        gr.save()
            .then(result => {
                sendToUser(gr.ownerId, {
                    req: 'game-over',
                    gameroom: gr.id,
                    endTime: gr.timeEnded
                });
            })
            .catch(e => {
                console.error('WS wrapUpGameRoom error:', e.message);
            });
    }
};