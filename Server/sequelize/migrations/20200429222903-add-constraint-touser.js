'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addConstraint('User', {
        fields: ['email'],
        type: 'unique',
        name: 'unique_email'
      }),
      queryInterface.addColumn(
        'User',
        'googleId',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      )
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeConstraint('User', 'unique_email'),
      queryInterface.removeColumn('User', 'googleId')
    ]);
  }
};
