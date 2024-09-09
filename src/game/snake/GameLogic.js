const GRID_SIZE = 45; // 맵 크기 설정 (45x45)
const TICK_RATE = 100; // 밀리초 단위로 게임을 업데이트하는 주기
const MAX_PLAYERS = 4; // 최대 플레이어 수 설정
const FOOD_COUNT = 12; // 일반 사과의 개수
const GOLDEN_FOOD_COUNT = 3; // 황금 사과의 개수

// 점수와 관련된 상수
const APPLE_SCORE = 10; // 일반 사과 점수
const GOLDEN_APPLE_SCORE = 50; // 황금 사과 점수

let players = {}; // 각 플레이어 정보를 저장하는 객체
let foods = []; // 음식들 위치를 저장하는 배열

// 각 플레이어들의 시작 위치와 방향 설정
const START_POSITIONS = [
    { x: 1, y: 1, direction: { x: 1, y: 0 } }, // 왼쪽 상단
    { x: GRID_SIZE - 2, y: 1, direction: { x: -1, y: 0 } }, // 오른쪽 상단
    { x: 1, y: GRID_SIZE - 2, direction: { x: 1, y: 0 } }, // 왼쪽 하단
    { x: GRID_SIZE - 2, y: GRID_SIZE - 2, direction: { x: -1, y: 0 } } // 오른쪽 하단
];

// 먹이들을 랜덤한 위치에 생성하는 함수
function generateFoods() {
    let foods = [];
    // 일반 사과 생성
    for (let i = 0; i < FOOD_COUNT; i++) {
        foods.push({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: 'apple'
        });
    }
    // 황금 사과 생성
    for (let i = 0; i < GOLDEN_FOOD_COUNT; i++) {
        foods.push({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: 'golden_apple'
        });
    }
    return foods;
}

// 플레이어 추가 함수
function addPlayer(socket, roomId, userName, userColor, rooms) {
    const room = rooms[roomId];
    const playerCount = Object.keys(room.players).length;

    if (playerCount < MAX_PLAYERS) {
        const startPos = START_POSITIONS[playerCount];

        room.players[socket.id] = {
            id: userName,
            snake: [startPos],
            direction: startPos.direction,
            color: userColor,
            alive: true,
            canMove: false,
            score: 0
        };
    } else {
        socket.to(roomId).emit('error', 'Maximum players reached.');
    }

    if (Object.keys(room.players).length === MAX_PLAYERS && !room.gameRunning) {
        room.gameRunning = true;
        socket.to(roomId).emit('startCountdown'); // 모든 플레이어가 들어오면 카운트다운 시작
    }
}

// 플레이어 제거 함수
function removePlayer(socket, playerId, roomId, room) {
    if (room) {
        delete room.players[playerId]; // 플레이어 제거

        // 만약 방에 더 이상 플레이어가 없다면 방 삭제
        if (Object.keys(room.players).length === 0) {
            delete rooms[roomId];
        } else {
            // 플레이어가 방에 남아있는 경우, 게임 상태를 모든 클라이언트에 전송
            broadcastGameState(socket, roomId, room);
        }
    }
}

// 플레이어 방향 업데이트 함수
function updatePlayerDirection(playerId, direction, roomId, rooms) {
    const player = rooms[roomId].players[playerId];
    if (player && player.alive) {
        // 반대 방향으로 회전하지 않도록 설정
        if (direction.x !== -player.direction.x && direction.y !== -player.direction.y) {
            player.direction = direction;
        }
    }
}

// 게임 상태 업데이트 함수
function updateGameState(room) {
    const { players } = room;
    let foods = room.foods;  // foods 변수를 let으로 변경

    for (let playerId in players) {
        const player = players[playerId];
        if (!player.alive || !player.canMove) continue;

        let head = { ...player.snake[0] };
        head.x += player.direction.x;
        head.y += player.direction.y;

        // 벽 충돌 체크
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            player.alive = false;
            continue;
        }

        // 자기 몸과 충돌 체크
        for (let segment of player.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                player.alive = false;
                break;
            }
        }

        if (!player.alive) continue;

        // 다른 뱀과 충돌 체크
        for (let otherPlayerId in players) {
            if (otherPlayerId !== playerId) {
                for (let segment of players[otherPlayerId].snake) {
                    if (head.x === segment.x && head.y === segment.y) {
                        player.alive = false;
                        break;
                    }
                }
            }
        }

        if (!player.alive) continue;

        // 음식 먹기 체크 및 점수 증가
        foods = foods.filter(food => {  // 이 부분에서 foods를 재할당
            if (head.x === food.x && head.y === food.y) {
                if (food.type === 'golden_apple') {
                    player.score += GOLDEN_APPLE_SCORE;
                    for (let i = 0; i < 5; i++) {
                        player.snake.unshift({ ...player.snake[0] });
                    }
                } else {
                    player.score += APPLE_SCORE;
                    player.snake.unshift(head);
                }
                return false;
            }
            return true;
        });

        // 부족한 일반 사과 수 만큼 새로 생성
        while (foods.filter(food => food.type === 'apple').length < FOOD_COUNT) {
            foods.push({
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
                type: 'apple'
            });
        }

        // 부족한 황금 사과 수 만큼 새로 생성
        while (foods.filter(food => food.type === 'golden_apple').length < GOLDEN_FOOD_COUNT) {
            foods.push({
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
                type: 'golden_apple'
            });
        }

        // 음식이 없으면 꼬리를 줄임
        if (player.snake[0] !== head) {
            player.snake.pop();
            player.snake.unshift(head);
        }
    }

    room.foods = foods; // 방별 음식 상태 업데이트
}

// 게임 상태를 클라이언트로 전송하는 함수
function broadcastGameState(socket, roomId, room) {
    socket.to(roomId).emit('gameState', {
        players: room.players,
        foods: room.foods
    });
}

// 게임 루프 시작 함수
function startGameLoop(socket, roomId, room) {;
    room.foods = generateFoods(); // 방별 음식 생성

    const interval = setInterval(() => {
        updateGameState(room);
        broadcastGameState(socket, roomId, room);
    }, TICK_RATE);

    // 방에 플레이어가 없을 시 게임 종료 및 루프 중지
    socket.adapter.on('leave-room', (rm, id) => {
        if (rm === roomId) {
            // 플레이어 제거
            delete room.players[id];
    
            // 방에 남아 있는 플레이어가 없는 경우
            if (Object.keys(room.players).length === 0) {
                clearInterval(interval); // 게임 루프 중지
                delete room; // 방 제거
            }
        }
    });
}

module.exports = {
    addPlayer,
    removePlayer,
    updatePlayerDirection,
    startGameLoop
};
