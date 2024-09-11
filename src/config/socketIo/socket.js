const socketIo = require('socket.io');
const initPlatformerGame = require('./SocketForGame/PlatformerGameSocket');
const initSnakeGame = require('./SocketForGame/SnakeGameSocket');

const initGame = (io) => {
    initPlatformerGame(io);
    initSnakeGame(io);
}

exports.initSocket = (server) => {
    const io = socketIo(server, {
        path: '/nws',
        cors: {
            origin: "*",
            methods: ['GET', 'POST']
        }
    });

    initGame(io);
}