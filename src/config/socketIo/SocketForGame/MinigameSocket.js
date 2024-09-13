const { initGameState, gameUpdate, spawnRockets, updateGameEntities, stopGameLoop, startGameLoop, startTimerLoop } = require('../../../game/mini/platformLogic');
const { startBombGame } = require('../../../game/mini/bombLogic');

module.exports = (io) => {
    const ROCKET_SPAWN_INTERVAL = 5000; // Rockets spawn every 5 seconds

    let gameSessions = {};

    // Rock Paper Scissors (RPS) game logic
    const startRPSGame = (sessionKey, socket) => {
        // Initialize the session if it doesn't exist
        if (!gameSessions[sessionKey]) {
            gameSessions[sessionKey] = {
                id: sessionKey,
                players: [],
                host: null,
                gameState: { playerScore: 0, computerScore: 0, round: 1 },  // Initialize RPS game state
            };
        }

        const currentSession = gameSessions[sessionKey];

        // Host setup
        if (!currentSession.host) {
            currentSession.host = socket;
            socket.emit('role', 'host');
        } else {
            socket.emit('role', 'viewer');
        }

        // Add the player to the room
        currentSession.players.push(socket);
        socket.join(currentSession.id);
    };

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
                startBombGame(sessionKey, socket, role);
                currentSession = gameSessions[sessionKey]; // Ensure the session is assigned here
            }

            // Rock Paper Scissors Game
            if (gameType === 'RPS') {
                startRPSGame(sessionKey, socket);
                currentSession = gameSessions[sessionKey]; // Ensure the session is assigned here

                if (role === 'host') {
                    socket.emit('role', 'host');
                } else {
                    socket.emit('role', 'viewer');
                }
            }
        });

        // Platformer Event
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
        socket.on('rpsPlayerChoice', (choice) => {
            if (currentSession && currentSession.gameState) {
                io.to(currentSession.id).emit('rpsPlayerChoice', choice);
            }
        });

        // Handle Computer Choice
        socket.on('rpsComputerChoice', (choice) => {
            if (currentSession && currentSession.gameState) {
                io.to(currentSession.id).emit('rpsComputerChoice', choice);
            }
        });

        // Hanlde RPS Result
        socket.on('rpsResult', (result) => {
            if (currentSession && currentSession.gameState) {
                currentSession.gameState.result = result;
                io.to(currentSession.id).emit('rpsResult', result);
            }
        });

        // Handle RPS Score
        socket.on('rpsScore', ({ playerScore, computerScore }) => {
            if (currentSession && currentSession.gameState) {
                currentSession.gameState.playerScore = playerScore;
                currentSession.gameState.computerScore = computerScore;
                io.to(currentSession.id).emit('rpsScore', { playerScore, computerScore });
            }
        });

        socket.on('disconnect', () => {
            if (currentSession) {
                currentSession.players = currentSession.players.filter(player => player !== socket);

                if (currentSession.players.length === 0) {
                    stopGameLoop(currentSession.id);
                    delete gameSessions[currentSession.id];
                    console.log(`Session ${currentSession.id} ended.`);
                }
            }
        });
    });
}