'use strict';

const models = require('../sequelize/models');
const User = models.User;
const Game = models.Game;
const GameRoom = models.GameRoom;
const gamelogic = require('../app/gamelogic');

module.exports = {
  async create(gameId, ownerId) {
    const game = await Game.findOne({ where: { id: gameId } });
    if (!game) {
      return null;
    }

    const gr = await GameRoom.create({
      gameId: game.id,
      ownerId,
      timeStarted: null,
      timeEnded: null,
      code: gamelogic.createGameRoomCode()
    });

    return {
      id: gr.id,
      game: Game.exportObject(game),
      code: gr.code
    };
  },

  async findByOwner(ownerId) {
    const rooms = await GameRoom.findAll({
      where: { ownerId },
      include: [
        { model: Game, as: 'game' },
        { model: User, as: 'members' }
      ]
    });
    return rooms.map(gr => GameRoom.exportObject(gr));
  },

  async findById(id) {
    const gr = await GameRoom.findOne({
      where: { id },
      include: [
        { model: Game, as: 'game' },
        { model: User, as: 'owner' },
        { model: User, as: 'members' }
      ]
    });
    return gr ? GameRoom.exportObject(gr, true) : null;
  },

  async findByCode(code) {
    return GameRoom.findOne({
      where: { code, timeStarted: null },
      include: [
        { model: Game, as: 'game' },
        { model: User, as: 'owner' },
        { model: User, as: 'members' }
      ]
    });
  },

  async findActiveById(gameroomId) {
    return GameRoom.findOne({
      where: { id: gameroomId, timeEnded: null },
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'members' }
      ]
    });
  },

  async findWithGameById(gameroomId) {
    return GameRoom.findOne({
      where: { id: gameroomId },
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'members' },
        { model: Game, as: 'game' }
      ]
    });
  },

  async findSimpleById(gameroomId) {
    return GameRoom.findOne({ where: { id: gameroomId } });
  },

  async markStarted(gr) {
    gr.timeStarted = toMysqlFormat(new Date());
    return gr.save();
  },

  async markEnded(gr) {
    gr.timeEnded = toMysqlFormat(new Date());
    return gr.save();
  }
};

function toMysqlFormat(date) {
  function pad(d) {
    if (0 <= d && d < 10) return '0' + d.toString();
    if (-10 < d && d < 0) return '-0' + (-1 * d).toString();
    return d.toString();
  }
  return date.getUTCFullYear() + '-' + pad(1 + date.getUTCMonth()) + '-' + pad(date.getUTCDate()) + ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds());
}
