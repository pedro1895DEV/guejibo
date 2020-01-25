module.exports = {

    createGameRoomCode: function () {
        let result = new Array(5);
        let characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
        for (let i = 0; i < 5; i++) {
            result[i] = characters.charAt(Math.floor(Math.random() * characters.length));
        }
        console.log(result);
        return result.join('');
    }
    
}