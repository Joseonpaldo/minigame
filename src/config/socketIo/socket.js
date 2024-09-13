const socketIo = require('socket.io');
const initMiniGame = require('./SocketForGame/MinigameSocket');
const initSnakeGame = require('./SocketForGame/SnakeGameSocket');

const initGame = (io) => {
    initMiniGame(io);
    initSnakeGame(io);
}

exports.initSocket = (server) => {
    const io = socketIo(server, {
        path: '/nws',
        cors: {
            origin: "https://joseonpaldo.site",
            methods: ['GET', 'POST']
        }
    });

    initGame(io);
}