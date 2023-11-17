const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
    output: {
        filename: 'gameslib.js',
    },
    mode: 'production',
    plugins: [
        new webpack.DefinePlugin({
            WSURL: "'wss://guejibo-api.onrender.com/'"
            //WSURL: "'ws://localhost:3000/'"
        })
    ]
});
