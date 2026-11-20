'use strict';

module.exports = {
  /*
   * Generates a new random code for a game room.
   */
  createGameRoomCode: function () {
    const result = new Array(4);
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    for (let i = 0; i < 4; i++) {
      result[i] = characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result.join('');
  },

  /*
   * Generates a temporary random user name.
   */
  createRandomUserName: function () {
    const size = Math.floor(Math.random() * 3 + 3); // random number between 3 and 5

    const result = new Array(size);
    const characters = '0123456789';
    for (let i = 0; i < size; i++) {
      result[i] = characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return 'Guest_' + result.join('');
  }
};
