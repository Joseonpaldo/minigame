const socketIo = require('socket.io');
const initPlatformerGame = require('./SocketForGame/PlatformerGameSocket');
const initShooterGame = require('./SocketForGame/ShooterGameSocket');
const initSnakeGame = require('./SocketForGame/SnakeGameSocket');

const initGame = (io, gameType, roomNum) => {
    if (gameType === 'platformer') {
        initPlatformerGame(io, roomNum);
    } else if (gameType === 'shooter') {
        initShooterGame(io, roomNum);
    } else if (gameType === 'snake') {
        initSnakeGame(io, roomNum);
    }
}

exports.initSocket = (server) => {
    const io = socketIo(server);

    io.on('connection', (socket) => {
        console.log('New connection');

        socket.on('joinRoom', ({ room_num, gameType }) => {
            initGame(io, gameType, room_num);
            console.log(`User joined room: ${room_num} for ${gameType} game`);
        });
    });
}