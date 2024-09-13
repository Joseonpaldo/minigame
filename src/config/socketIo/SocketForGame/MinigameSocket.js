const { initGameState, stopGameLoop, startGameLoop, startTimerLoop, spawnRockets, gameUpdate } = require('../../../game/mini/platformLogic');
const { startBombGame } = require('../../../game/mini/bombLogic');
const { startRPSGame, getComputerChoice, checkWinner, rpsTimerLoop, stopRpsTimerLoop } = require('../../../game/mini/rpsLogic');

const ROCKET_SPAWN_INTERVAL = 5000; // Rockets spawn every 5 seconds

module.exports = (io) => {

    let gameSessions = {};

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
        });
    });
}