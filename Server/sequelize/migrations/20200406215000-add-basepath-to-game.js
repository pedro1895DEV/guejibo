'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Game',
      'basePath', Sequelize.STRING
    );
  },

  down: (queryInterface, _Sequelize) => {
    return queryInterface.removeColumn(
      'Game',
      'basePath'
    );
  }
};
