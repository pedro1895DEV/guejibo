'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'GameRoom',
      'code', Sequelize.CHAR(4)
    );
  },

  down: (queryInterface, _Sequelize) => {
    return queryInterface.removeColumn(
      'GameRoom',
      'code'
    );
  }
};
