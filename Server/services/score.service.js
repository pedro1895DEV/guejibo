'use strict';

const models = require('../sequelize/models');
const UsersGameRooms = models.UsersGameRooms;

module.exports = {
  async addMember(gameroomModel, userId) {
    return gameroomModel.addMember(userId);
  },

  async updateScore(userId, gameroomId, score, ended) {
    return UsersGameRooms.update(
      { score, ended },
      { where: { userId, gameRoomId: gameroomId, ended: false } }
    );
  },

  async endAllPlayers(gameroomId) {
    return UsersGameRooms.update(
      { ended: true },
      { where: { gameRoomId: gameroomId } }
    );
  },

  async countActivePlayers(gameroomId) {
    const result = await UsersGameRooms.findAndCountAll({
      where: { gameRoomId: gameroomId, ended: false }
    });
    return result.count;
  }
};
