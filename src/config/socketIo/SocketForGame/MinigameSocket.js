const { initGameState, stopGameLoop, startGameLoop, startTimerLoop, spawnRockets, gameUpdate } = require('../../../game/mini/platformLogic');
const { startBombGame } = require('../../../game/mini/bombLogic');
const { startRPSGame, getComputerChoice, checkWinner, rpsTimerLoop, stopRpsTimerLoop } = require('../../../game/mini/rpsLogic');
const { handlePlayerMovement } = require('../../../game/mugunghwa/gameLogic');
const { startDollGame, stopDollGame } = require('../../../game/mugunghwa/doll');

const ROCKET_SPAWN_INTERVAL = 5000; // Rockets spawn every 5 seconds

module.exports = (io) => {

    let gameSessions = {};
    let rooms = {};

    // Handle player connection and room setup
    io.on('connection', (socket) => {
        console.log('New client connected');

        let currentSession = null;

        // Handle player joining a game
        socket.on('joinGame', ({ gameType, roomNumber, role }) => {
            const sessionKey = `${gameType}-${roomNumber}`;

            // Alien Shooter Game
            if (gameType === 'alienShooter') {

            }

            // Platformer Game
            if (gameType === 'platformer') {
                if (!gameSessions[sessionKey]) {
                    gameSessions[sessionKey] = {
                        id: sessionKey,
                        players: [],
                        host: null,
                        gameState: initGameState(),  // Initialize game state for the room
                    };
                }

                currentSession = gameSessions[sessionKey];

                // Add the player to the room
                currentSession.players.push(socket);
                socket.join(currentSession.id);

                console.log(`Player joined session: ${sessionKey}`);

                if (role === 'host') {
                    currentSession.host = socket;
                }
                
                socket.emit('initialGameState', currentSession.gameState);  // Send the initial map and state
            }

            // Bomb Game
            if (gameType === 'bomb') {
                // Initialize the session if it doesn't exist
                if (!gameSessions[sessionKey]) {
                    gameSessions[sessionKey] = {
                        id: sessionKey,
                        players: [],
                        host: null,
                        bombState: { status: 'active', defuseWire: Math.random() < 0.5 ? 'blue' : 'red' },  // Initialize bombState here
                    };
                }
                console.log(`Player joined session: ${sessionKey}`);
                currentSession = gameSessions[sessionKey]; // Ensure the session is assigned here

                startBombGame(currentSession, socket, role);
            }

            // Rock Paper Scissors Game
            if (gameType === 'RPS') {
                // Initialize the session if it doesn't exist
                if (!gameSessions[sessionKey]) {
                    gameSessions[sessionKey] = {
                        id: sessionKey,
                        players: [],
                        host: null,
                        gameState: { 
                            playerScore: 0, 
                            computerScore: 0, 
                            round: 1,
                            win: null,
                            isGameOver: false,
                        },
                        timeLeft: 3  // Initialize RPS game state
                    };
                }
                console.log(`Player joined session: ${sessionKey}`);
                currentSession = gameSessions[sessionKey]; // Ensure the session is assigned here
                startRPSGame(currentSession, socket);
                if(role === 'host') {
                    startTimerLoop(currentSession, io);
                }
                console.log("current state: "+JSON.stringify(currentSession.gameState));
                io.to(currentSession.id).emit('rpsState', null, null, currentSession.gameState);
            }
        });

        // Platformer Logic
        // Handle player input (movement, actions)
        socket.on('playerInput', (input) => {
            if (currentSession) {
                currentSession.gameState = gameUpdate(currentSession.gameState, input);
                io.to(currentSession.id).emit('gameStateUpdate', currentSession.gameState);
            }
        });

        socket.on('platformerStart', () => {
            // Start the game and timer loops for this room
            startGameLoop(currentSession, io, socket);
            startTimerLoop(currentSession, io, socket);

            // Start rocket spawning at intervals (for this specific room)
            if (!currentSession.rocketSpawnLoop) {
                currentSession.rocketSpawnLoop = setInterval(() => {
                    spawnRockets(currentSession.gameState);
                    io.to(currentSession.id).emit('updateRockets', currentSession.gameState.rockets);
                }, ROCKET_SPAWN_INTERVAL);
            }
        });

        socket.on('playerImage', (image) => {
            io.to(currentSession.id).emit('viewerImageReceived', image);
        });

        socket.on('requestImage', () => {
            if(currentSession.host) {
                currentSession.host.emit('requestImageForViewer');
            }
        });

        // BombGame Events
        // Handle wire cut event
        socket.on('wireCut', (wireColor) => {
            if (currentSession && currentSession.bombState) {
                if (wireColor === currentSession.bombState.defuseWire) {
                    currentSession.bombState.status = 'defused';
                    socket.emit('hostResult', true);
                    io.to(currentSession.id).emit('setBombStatus', 'defused');
                } else {
                    currentSession.bombState.status = 'exploded';
                    socket.emit('hostResult', false);
                    io.to(currentSession.id).emit('setBombStatus', 'exploded');
                }
                io.to(currentSession.id).emit('bombFinished');
            }
        });

        // RPSGame Events
        // Handle Player Choice
        socket.on('rpsPlayerChoice', (playerChoice) => {
            if (currentSession) {
                const computerChoice = getComputerChoice();
                const result = checkWinner(playerChoice, computerChoice);

                if (result === 1) {
                    currentSession.gameState.playerScore++;
                } else if (result === 2) {
                    currentSession.gameState.computerScore++;
                } else {
                    currentSession.gameState.round--;
                }

                currentSession.gameState.win = result;
                currentSession.gameState.round++;
                stopRpsTimerLoop(currentSession);
                

                if(currentSession.gameState.round > 3) {
                    currentSession.gameState.isGameOver = true;
                }

                if(!currentSession.gameState.isGameOver) {
                    rpsTimerLoop(currentSession, io);
                }

                io.to(currentSession.id).emit('rpsState', playerChoice, computerChoice, currentSession.gameState);
                if(currentSession.gameState.isGameOver) {
                    if(socket === currentSession.host) {
                        socket.emit('hostResult', currentSession.gameState.win);
                    }
                }
            }
        });

        socket.on('disconnect', () => {
            if (currentSession) {
                currentSession.players = currentSession.players.filter(player => player !== socket);

                if (currentSession.players.length === 0) {
                    stopGameLoop(currentSession.id);
                    delete gameSessions[currentSession.id];
                    console.log(JSON.stringify(gameSessions[currentSession.id]));
                    console.log(`Session ${currentSession.id} ended.`);
                }
            }

            if (rooms[roomId]) {
                rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== playerId);

                if (rooms[roomId].players.length === 0) {
                    stopDollGame();
                    delete rooms[roomId]; // 모든 플레이어가 나가면 방 삭제
                }
            }
        });

        socket.on('joinRoom', (roomId, socketId, gameType) => {
            if(gameType === 'mugunghwa') {
                console.log(`클라이언트 ${socketId}가 방 ${roomId}에 입장 요청`);

                if (!rooms[roomId]) {
                    rooms[roomId] = { players: [], started: false, timeLeft: 70 };
                }
        
                const playerId = rooms[roomId].players.length + 1;
                const playerImage = `player${playerId}.png`;
                const newPlayer = { id: playerId, image: playerImage, active: true, roomId, position: 0, socketId: socketId };
        
                rooms[roomId].players.push(newPlayer);
                socket.join(roomId);
        
                io.to(roomId).emit('updatePlayers', rooms[roomId].players);
            }

            if (rooms[roomId].players.length === 4 && !rooms[roomId].started) {
                rooms[roomId].started = true;
                io.to(roomId).emit('startCountdown');
    
                // 게임 타이머 시작
                let gameTimer = setInterval(() => {
                    if (rooms[roomId]) {
                        if (rooms[roomId].timeLeft > 0) {
                            rooms[roomId].timeLeft -= 1;
                            io.to(roomId).emit('updateTime', rooms[roomId].timeLeft);
                        }
    
                        // 모든 플레이어가 탈락했는지 체크
                        const activePlayers = rooms[roomId].players.filter(p => p.active);
                        if (activePlayers.length === 0) {
                            clearInterval(gameTimer); // 게임 타이머 종료
                            stopDollGame();
                            io.to(roomId).emit('gameOver'); // 게임 종료
                        }
    
                        // 제한 시간 종료 처리
                        if (rooms[roomId].timeLeft === 0) {
                            clearInterval(gameTimer); // 타이머 종료
                        
                            // 제한 시간 내에 통과하지 못한 플레이어 탈락 처리
                            rooms[roomId].players.forEach(player => {
                                if (player.position < 95) { // 통과하지 못한 플레이어 탈락
                                    player.active = false;
                                    io.to(roomId).emit('playerDead', { playerId: player.id });
                                }
                            });
                        
                            stopDollGame(); // 인형 동작 정지
                            io.to(roomId).emit('gameOver'); // 게임 종료
                        }
                    } else {
                        clearInterval(gameTimer); // 방이 없으면 타이머 정지
                    }
                }, 1000);
    
                setTimeout(() => {
                    startDollGame(io, roomId);
                }, 10000);
            }
        });
        
        // 무궁화 게임 로직
        socket.on('movePlayer', ({ playerId, roomId }) => {
            handlePlayerMovement(rooms, roomId, playerId, io); // 플레이어 이동 로직 함수
            const room = rooms[roomId];
            const player = room.players.find(p => p.id === playerId);
        
            if (player && player.active) {
                io.to(roomId).emit('updatePlayers', room.players);
        
                // 결승선에 통과한 플레이어가 있으면 나머지 탈락 처리 후 게임 종료
                if (player.passed) {
                    // 나머지 플레이어 탈락 처리
                    room.players.forEach(p => {
                        if (!p.passed) {
                            p.active = false; // 통과하지 않은 나머지 플레이어 탈락
                            io.to(roomId).emit('playerDead', { playerId: p.id });
                        }
                    });
        
                    // 게임 타이머와 인형 동작 중지
                    stopDollGame(); // 인형 동작 정지
                    clearInterval(gameTimer); // 타이머 정지
                    io.to(roomId).emit('gameOver'); // 모든 클라이언트에 게임 종료 알림
                }
            }
        });

        socket.on('playerDead', ({ playerId, roomId }) => {
            const room = rooms[roomId];
            const player = room.players.find(p => p.id === playerId);
            if (player) {
                player.active = false; // 탈락한 플레이어는 비활성화
                io.to(roomId).emit('playerDead', { playerId }); // 모든 클라이언트에 해당 플레이어가 탈락했다고 알림

                // 모든 플레이어가 탈락했는지 체크
                const activePlayers = room.players.filter(p => p.active);
                if (activePlayers.length === 0) {
                    stopDollGame();
                    io.to(roomId).emit('gameOver'); // 게임 종료
                }
            }
        });
    });
}