const gameLogic = require('../../../game/snake/GameLogic');

module.exports = (io) => {
    const snakeNamespace = io.of(`/nws/snake`);
    const rooms = {};
    const clientRooms = {};

    snakeNamespace.on('connection', (socket) => {
        console.log('Connections to snake game');

        // Join Game Action
        socket.on('joinRoom', ({ roomNum, userName, userColor }) => {
            socket.join(roomNum);
            console.log(`User joined room: ${roomNum} for snake game`);

            if (!rooms[roomNum]) {
                rooms[roomNum] = {
                    players: {},
                    gameRunning: false,
                    countdown: 10
                };
                gameLogic.startGameLoop(socket, roomNum, rooms[roomNum]); // 방별 게임 루프 시작
            }
            clientRooms[socket.id] = roomNum;
            gameLogic.addPlayer(socket, roomNum, userName, userColor, rooms); // 방별로 플레이어 추가
        });

        socket.on('move', (direction) => {
            const roomId = clientRooms[socket.id];
            gameLogic.updatePlayerDirection(socket.id, direction, roomId, rooms);
        });
    
        socket.on('countdownFinished', () => {
            const roomId = clientRooms[socket.id];
            const room = rooms[roomId];
        
            if (room) {
                Object.values(room.players).forEach((player) => {
                    player.canMove = true; // 카운트다운 후에 이동 가능하도록 설정
                });
            }
        });
    
        socket.on('disconnect', () => {
            if(clientRooms[socket.id]) {
                const roomId = clientRooms[socket.id];
                gameLogic.removePlayer(socket, socket.id, roomId, rooms); // 방에서 플레이어 제거 및 상태 업데이트
            }
        });
    });
}