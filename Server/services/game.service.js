'use strict';

const models = require('../sequelize/models');
const Game = models.Game;

module.exports = {
  async findAll() {
    const games = await Game.findAll();
    return games.map(game => Game.exportObject(game));
  },

  async findById(gameId) {
    const game = await Game.findOne({ where: { id: gameId } });
    return game ? Game.exportObject(game) : null;
  }
};
