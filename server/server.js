const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const http = require('http');

// Import game logic for platformer
const { initGameState, gameUpdate, spawnRockets, updateGameEntities } = require('./platformLogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://192.168.0.52:3000',  // Use your actual IP address here
    methods: ['GET', 'POST'],
  },
});

const ROCKET_SPAWN_INTERVAL = 5000; // Rockets spawn every 5 seconds
const GAME_UPDATE_INTERVAL = 1000 / 60; // Game updates 60 times per second (60 FPS)
const TIMER_UPDATE_INTERVAL = 1000; // Timer updates every 1 second
const MAX_PLAYERS_PER_SESSION = 4;  // Max players per session
const GAME_HEIGHT = 800;

let gameSessions = {};
let gameLoops = {};  // Store game loops for each room
let timerLoops = {};  // Store timer intervals for each room

// Platformer game loop
const startGameLoop = (sessionKey) => {
    gameLoops[sessionKey] = setInterval(() => {
        const session = gameSessions[sessionKey];

        if (session) {
            // Update game entities (like balls, rockets, etc.)
            session.gameState = updateGameEntities(session.gameState);

            // Update player position continuously
            session.gameState = gameUpdate(session.gameState, null);

            // Check if the player falls off the map (loss condition)
            if (session.gameState.player.y > GAME_HEIGHT) {
                session.gameState.isGameOver = true;
                io.to(sessionKey).emit('gameOver', { message: 'Game Over! You fell off the map!' });
                clearInterval(gameLoops[sessionKey]); // Stop the game loop
                stopGameLoop(sessionKey); // Stop all game loops for this session
            }

            // Check if the player has won (win condition)
            if (session.gameState.player.x >= session.gameState.portal.x &&
                session.gameState.player.y >= session.gameState.portal.y) {
                session.gameState.isGameOver = true;
                io.to(sessionKey).emit('gameWin', { message: 'You Win! You reached the portal!' });
                clearInterval(gameLoops[sessionKey]); // Stop the game loop
                stopGameLoop(sessionKey); // Stop all game loops for this session
            }

            // Emit the updated game state to all players in the room
            io.to(sessionKey).emit('gameStateUpdate', session.gameState);
        }
    }, GAME_UPDATE_INTERVAL); // 60 updates per second (16.67ms interval)
};

// Timer loop that handles countdown for platformer
const startTimerLoop = (sessionKey) => {
    timerLoops[sessionKey] = setInterval(() => {
        const session = gameSessions[sessionKey];

        if (session && session.gameState.timeLeft > 0) {
            session.gameState.timeLeft -= 1;  // Decrease time
            io.to(sessionKey).emit('updateTimer', session.gameState.timeLeft);  // Emit time updates to all players
        } else if (session && session.gameState.timeLeft <= 0) {
            clearInterval(timerLoops[sessionKey]);  // Stop the timer loop
            session.gameState.isGameOver = true; // Mark the game as over
            io.to(sessionKey).emit('gameOver', { message: 'Game Over! Time is up!' });  // Notify players that the time is up
            stopGameLoop(sessionKey);  // Stop the game loop
        }
    }, TIMER_UPDATE_INTERVAL);  // 1 second interval
};

// Bomb game logic (host and viewer sync)
const startBombGame = (sessionKey, socket) => {
    // Initialize the session if it doesn't exist
    if (!gameSessions[sessionKey]) {
        gameSessions[sessionKey] = {
            id: sessionKey,
            players: [],
            host: null,
            bombState: { status: 'active', defuseWire: '' },  // Initialize bombState here
        };
    }

    const currentSession = gameSessions[sessionKey];

    // Host setup
    if (!currentSession.host) {
        currentSession.host = socket;
        socket.emit('role', 'host');

        // Set a random defuse wire
        const defuseWire = Math.random() < 0.5 ? 'blue' : 'red';
        currentSession.bombState.defuseWire = defuseWire;

        // Emit the defuse wire to the host and all viewers
        io.to(sessionKey).emit('defuseWire', defuseWire);
    } else {
        // If a viewer joins later, emit the current bomb status and defuse wire
        socket.emit('role', 'viewer');
        socket.emit('bombStatusUpdate', currentSession.bombState.status);
        socket.emit('defuseWire', currentSession.bombState.defuseWire);
    }

    // Add the player to the room
    currentSession.players.push(socket);
    socket.join(currentSession.id);
};

// Rock Paper Scissors (RPS) game logic
const startRPSGame = (sessionKey, socket, role) => {
    // Initialize the session if it doesn't exist
    if (!gameSessions[sessionKey]) {
        console.log(`Creating new RPS session for room: ${sessionKey}`);
        gameSessions[sessionKey] = {
            id: sessionKey,
            players: [],
            host: null,  // Host will be set explicitly by client
            gameState: {
                playerScore: 0,
                computerScore: 0,
                round: 1,
                playerChoice: null,
                computerChoice: null,
                result: '',
                isGameOver: false,
            },
        };
    }

    const currentSession = gameSessions[sessionKey];

    // Add player to the session
    currentSession.players.push(socket);
    socket.join(currentSession.id);
    console.log(`Player joined RPS session: ${sessionKey} as ${role}`);

    // Assign role based on client input
    if (role === 'host') {
        currentSession.host = socket;
        socket.emit('role', 'host');
        console.log(`Assigned host to RPS session: ${sessionKey}`);
    } else {
        socket.emit('role', 'viewer');
        console.log(`Assigned viewer to RPS session: ${sessionKey}`);
    }

    // Emit initial game state
    socket.emit('initialGameState', currentSession.gameState);

    // Listen for timer updates and broadcast them to all viewers
    socket.on('rpsTimeLeft', (timeLeft) => {
        currentSession.gameState.timeLeft = timeLeft;
        io.to(currentSession.id).emit('rpsTimeLeft', timeLeft);
    });

    // Listener for player choice and broadcast to all viewers
    socket.on('rpsPlayerChoice', (choice) => {
        currentSession.gameState.playerChoice = choice;
        io.to(currentSession.id).emit('rpsPlayerChoice', choice);
    });

    // Listener for computer choice and broadcast to all viewers
    socket.on('rpsComputerChoice', (computerChoice) => {
        currentSession.gameState.computerChoice = computerChoice;
        io.to(currentSession.id).emit('rpsComputerChoice', computerChoice);
    });

    // Listener for game result and broadcast to all viewers
    socket.on('rpsResult', (result) => {
        currentSession.gameState.result = result;
        io.to(currentSession.id).emit('rpsResult', result);
    });

    // Listener for scores and broadcast to all viewers
    socket.on('rpsScore', ({ playerScore, computerScore }) => {
        currentSession.gameState.playerScore = playerScore;
        currentSession.gameState.computerScore = computerScore;
        io.to(currentSession.id).emit('rpsScore', {
            playerScore,
            computerScore
        });
    });

    // Listener for the round number and broadcast to all viewers
    socket.on('round', (round) => {
        currentSession.gameState.round = round;
        io.to(currentSession.id).emit('rpsRound', round);
    });

    // Listener for game over status and broadcast to all viewers
    socket.on('rpsFinalResult', (finalResult) => {
        currentSession.gameState.isGameOver = true;
        io.to(currentSession.id).emit('rpsFinalResult', finalResult);
    });
};

// Clear the game and timer loops when the session ends
const stopGameLoop = (sessionKey) => {
    if (gameLoops[sessionKey]) {
        clearInterval(gameLoops[sessionKey]);
        delete gameLoops[sessionKey];
    }
    if (timerLoops[sessionKey]) {
        clearInterval(timerLoops[sessionKey]);
        delete timerLoops[sessionKey];
    }
    // Clear the rocket spawn loop
    if (gameSessions[sessionKey] && gameSessions[sessionKey].rocketSpawnLoop) {
        clearInterval(gameSessions[sessionKey].rocketSpawnLoop);
        delete gameSessions[sessionKey].rocketSpawnLoop;
    }
};

// Handle player connection and room setup
io.on('connection', (socket) => {
    console.log('New client connected');

    let currentSession = null;

    // Handle player joining a game
    socket.on('joinGame', ({ gameType, roomNumber, role }) => {
        const sessionKey = `${gameType}-${roomNumber}`;
        console.log(`joinGame event received: gameType: ${gameType}, roomNumber: ${roomNumber}, role: ${role}`);

        // Rock Paper Scissors Game
        if (gameType === 'RPS') {
            startRPSGame(sessionKey, socket, role);
            currentSession = gameSessions[sessionKey];  // Ensure the session is assigned here
        }

        // Handle other game types...
        // Bomb Game
        if (gameType === 'bomb') {
            startBombGame(sessionKey, socket);
            currentSession = gameSessions[sessionKey]; // Ensure the session is assigned here
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

                startGameLoop(sessionKey);
                startTimerLoop(sessionKey);
            }

            currentSession = gameSessions[sessionKey];
            currentSession.players.push(socket);
            socket.join(currentSession.id);

            console.log(`Player joined session: ${sessionKey}`);

            if (currentSession.host) {
                socket.emit('role', 'viewer');
                socket.emit('initialGameState', currentSession.gameState);
            } else {
                currentSession.host = socket;
                socket.emit('role', 'host');
            }

            io.to(currentSession.id).emit('playerCount', currentSession.players.length);
            if (!currentSession.rocketSpawnLoop) {
                currentSession.rocketSpawnLoop = setInterval(() => {
                    spawnRockets(currentSession.gameState);
                    io.to(currentSession.id).emit('updateRockets', currentSession.gameState.rockets);
                }, ROCKET_SPAWN_INTERVAL);
            }
        }
    });

    // Handle player input (movement, actions)
    socket.on('playerInput', (input) => {
        if (currentSession) {
            currentSession.gameState = gameUpdate(currentSession.gameState, input);
            io.to(currentSession.id).emit('gameStateUpdate', currentSession.gameState);
        }
    });

    // Handle bomb status updates
    socket.on('setDefuseWire', (wire) => {
        if (currentSession && currentSession.bombState && socket === currentSession.host) {
            currentSession.bombState.defuseWire = wire;
            io.to(currentSession.id).emit('defuseWire', wire);
        }
    });

    socket.on('bombStatus', (status) => {
        if (currentSession && currentSession.bombState) {
            currentSession.bombState.status = status;
            io.to(currentSession.id).emit('bombStatusUpdate', status);
        }
    });

    // Handle disconnect
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

// Start the server
server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
