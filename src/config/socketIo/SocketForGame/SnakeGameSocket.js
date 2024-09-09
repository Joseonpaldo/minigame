const gameLogic = require('@src/game/snake/GameLogic');

module.exports = (io, roomNum) => {
    const snakeNamespace = io.of(`/nws/snake/${roomNum}`);
    const rooms = {};

    snakeNamespace.on('connection', (socket) => {
        console.log('Conntections to snake game');

        // Join Game Action
        socket.on('joinRoom', ({ roomNum }) => {
            socket.join(roomNum);
            console.log(`User joined room: ${roomNum} for snake game`);

            if (!rooms[roomId]) {
                rooms[roomId] = {
                    players: {},
                    gameRunning: false,
                    countdown: 10
                };
                gameLogic.startGameLoop(io, roomNum, rooms); // 방별 게임 루프 시작
            }

            gameLogic.addPlayer(io, socket, roomNum, rooms); // 방별로 플레이어 추가
        });

        // Disconnect Action
        socket.on('disconnect', () => {
            console.log('User disconnected from snake game');
        });
    });
}