import socketIo from 'socket.io';
const initPlatformerGame = require('./SocketForGame/PlatformerGameSocket');
const initShooterGame = require('./SocketForGame/ShooterGameSocket');
const initSnakeGame = require('./SocketForGame/SnakeGameSocket');

const initGame = (io) => {
    initPlatformerGame(io);
    initShooterGame(io);
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