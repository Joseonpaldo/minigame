const gameLogic = require('../../../game/snake/GameLogic');

module.exports = (io) => {
    const snakeNamespace = io.of(`/nws/snake`);
    const rooms = {};

    snakeNamespace.on('connection', (socket) => {
        console.log('Conntections to snake game');

        // Join Game Action
        socket.on('joinRoom', ({ roomNum }) => {
            socket.join(roomNum);
            console.log(`User joined room: ${roomNum} for snake game`);

            if (!rooms[roomNum]) {
                rooms[roomNum] = {
                    players: {},
                    gameRunning: false,
                    countdown: 10
                };
                gameLogic.startGameLoop(socket, roomNum, rooms); // 방별 게임 루프 시작
            }

            gameLogic.addPlayer(socket, roomNum, rooms); // 방별로 플레이어 추가
        });

        socket.on('move', (direction) => {
            const roomId = [...socket.rooms][1]; // socket.rooms 배열에서 방 ID 가져오기
            gameLogic.updatePlayerDirection(socket.id, direction, roomId, rooms);
        });
    
        socket.on('countdownFinished', () => {
            const roomId = [...socket.rooms][1]; // socket.rooms 배열에서 방 ID 가져오기
            const room = rooms[roomId];
        
            if (room) {
                Object.values(room.players).forEach((player) => {
                    player.canMove = true; // 카운트다운 후에 이동 가능하도록 설정
                });
            }
        });
    
        socket.on('disconnect', () => {
            const roomId = [...socket.rooms][1]; // 방 ID 가져오기
            console.log('A user disconnected:', socket.id);
            gameLogic.removePlayer(socket.id, roomId, rooms, io); // 방에서 플레이어 제거 및 상태 업데이트
        });
    });
}