'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const games = [
      { name: 'Binary Wars',       basePath: 'binwars',          createdAt: new Date(), updatedAt: new Date() },
      { name: 'Code Clicker',      basePath: 'codeclicker',      createdAt: new Date(), updatedAt: new Date() },
      { name: 'English Stop',      basePath: 'english_stop',     createdAt: new Date(), updatedAt: new Date() },
      { name: 'Shoot The Answer',  basePath: 'shoot-the-answer', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Torne Verdadeiro',  basePath: 'torne-verdadeiro', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Stub Game',         basePath: 'stub',             createdAt: new Date(), updatedAt: new Date() }
    ];

    for (const game of games) {
      const existing = await queryInterface.rawSelect('Game', {
        where: { basePath: game.basePath }
      }, ['id']);

      if (!existing) {
        await queryInterface.bulkInsert('Game', [game]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Game', {
      basePath: [
        'binwars',
        'codeclicker',
        'english_stop',
        'shoot-the-answer',
        'torne-verdadeiro',
        'stub'
      ]
    });
  }
};
