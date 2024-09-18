function handlePlayerMovement(rooms, roomId, playerId, io) {
    const room = rooms[roomId];
    const player = room.players.find((p) => p.id === playerId);

    if (player && player.active && player.position < 95) {
        player.position += 1; // 플레이어가 오른쪽으로 전진 (스페이스바를 누를 때 마다 1% 씩 이동)
        console.log(`플레이어 ${player.id}의 위치가 ${player.position}%로 이동했습니다.`);

        if (player.position >= 95) {
            console.log(`플레이어 ${player.id} 통과!`);
            player.active = false; // 통과한 플레이어는 더 이상의 움직임 차단
            player.passed = true; // 통과 플래그 추가
        }

        // 업데이트된 플레이어의 위치를 방에 전달
        io.to(roomId).emit('updatePlayerPosition', { playerId: player.id, newPosition: player.position });
    }
}

function handleDollAction(rooms, io) {
    setInterval(() => {
        const looking = Math.random() < 0.5; // 랜덤으로 술래 상태 결정
        Object.keys(rooms).forEach((roomId) => {
            rooms[roomId].players.forEach((player) => {
                if (player.position >= 100) {
                    io.to(roomId).emit('gameOver', player.id); // 결승선 도달
                } else if (looking && player.active) {
                    io.to(roomId).emit('playerDead', player.id); // doll-looking 상태일 때 움직인 플레이어는 사망
                    player.active = false;
                }
            });
        });
        io.emit('dollState', looking);
    }, 2000); // 2초마다 상태 변화
}

module.exports = { handlePlayerMovement, handleDollAction };
