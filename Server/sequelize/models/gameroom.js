'use strict';

module.exports = (sequelize, DataTypes) => {

  const GameRoom = sequelize.define('GameRoom',
    {
      gameId: DataTypes.INTEGER,
      ownerId: DataTypes.INTEGER,
      code: DataTypes.CHAR(4),
      timeStarted: DataTypes.DATE,
      timeEnded: DataTypes.DATE
    },
    { freezeTableName: true }
  );

  GameRoom.associate = (models) => {
    GameRoom.belongsTo(models.User, { foreignKey: 'ownerId', as: 'owner' });
    GameRoom.belongsTo(models.Game, { foreignKey: 'gameId', as: 'game' });

    GameRoom.belongsToMany(
      models.User,
      {
        foreignKey: 'gameRoomId',
        through: 'UsersGameRooms',
        as: 'members'
      }
    );
  };

  GameRoom.exportObject = (gr, fulllist = false) => {
    const { Game, User } = sequelize.models;

    const obj = {
      id: gr.id,
      code: gr.code,
      timeStarted: gr.timeStarted,
      timeEnded: gr.timeEnded
    };

    if (Object.prototype.hasOwnProperty.call(gr, 'game')) {
      obj.game = Game.exportObject(gr.game);
    }
    else {
      obj.gameId = gr.gameId;
    }

    if (Object.prototype.hasOwnProperty.call(gr, 'owner')) {
      obj.owner = User.exportObject(gr.owner);
    }
    else {
      obj.ownerId = gr.ownerId;
    }

    if (Object.prototype.hasOwnProperty.call(gr, 'members')) {
      if (fulllist)
        obj.members = gr.members.map(user => User.exportObject(user));
      else
        obj.numberOfMembers = gr.members.length;
    }

    return obj;
  };

  return GameRoom;

};