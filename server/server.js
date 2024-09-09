const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const http = require('http');

// Import game logic
const { initGameState, gameUpdate, spawnRockets, updateGameEntities } = require('./platformLogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://192.168.0.52:3000',  // Use your actual IP address here
    methods: ['GET', 'POST'],            // Allowed methods
  },
});

const ROCKET_SPAWN_INTERVAL = 5000; // Rockets spawn every 5 seconds
const GAME_UPDATE_INTERVAL = 1000 / 60; // Game updates 60 times per second (60 FPS)
const TIMER_UPDATE_INTERVAL = 1000; // Timer updates every 1 second
const MAX_PLAYERS_PER_SESSION = 4;  // Max players per session

let gameSessions = {};  
let gameLoops = {};  // Store game loops for each room
let timerLoops = {};  // Store timer intervals for each room

// Create a game loop that updates entities (like the timer, balls, etc.) and player movement
const startGameLoop = (sessionKey) => {
    gameLoops[sessionKey] = setInterval(() => {
        const session = gameSessions[sessionKey];

        if (session) {
            // Update game entities (like balls, rockets, etc.)
            session.gameState = updateGameEntities(session.gameState);

            // Update player position continuously
            session.gameState = gameUpdate(session.gameState, null);

            // Emit the updated game state to all players in the room
            io.to(sessionKey).emit('gameStateUpdate', session.gameState);
        }
    }, GAME_UPDATE_INTERVAL); // 60 updates per second (16.67ms interval)
};

// Create a timer loop that handles countdown independently
const startTimerLoop = (sessionKey) => {
    timerLoops[sessionKey] = setInterval(() => {
        const session = gameSessions[sessionKey];

        if (session && session.gameState.timeLeft > 0) {
            session.gameState.timeLeft -= 1;  // Decrease time
            io.to(sessionKey).emit('updateTimer', session.gameState.timeLeft);  // Emit time updates to all players
        } else {
            clearInterval(timerLoops[sessionKey]);
            io.to(sessionKey).emit('gameOver');  // Notify players that the game is over
        }
    }, TIMER_UPDATE_INTERVAL);  // 1 second interval
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
};

io.on('connection', (socket) => {
    console.log('New client connected');

    let currentSession = null;
    let roleAssigned = false;

    // Handle player joining a game
    socket.on('joinGame', ({ gameType, roomNumber }) => {
        const sessionKey = `${gameType}-${roomNumber}`;

        // Create session if it doesn't exist
        if (!gameSessions[sessionKey]) {
            gameSessions[sessionKey] = {
                id: sessionKey,
                players: [],
                host: null,
                gameState: initGameState(),  // Initialize game state for the room
            };

            // Start the game and timer loops for this room
            startGameLoop(sessionKey);
            startTimerLoop(sessionKey);
        }

        currentSession = gameSessions[sessionKey];

        // Add the player to the room
        currentSession.players.push(socket);
        socket.join(currentSession.id);

        console.log(`Player joined session: ${sessionKey}`);

        // Assign host if it's the first player in the room
        if (currentSession.players.length === 1) {
            currentSession.host = socket;
            roleAssigned = true;
            socket.emit('role', 'host');
        } else {
            roleAssigned = true;
            socket.emit('role', 'viewer');
            socket.emit('initialGameState', currentSession.gameState);  // Send the initial map and state
        }

        // Broadcast player count
        io.to(currentSession.id).emit('playerCount', currentSession.players.length);

        // Start rocket spawning at intervals (for this specific room)
        if (!gameLoops[sessionKey]) {
            gameLoops[sessionKey] = setInterval(() => {
                spawnRockets(currentSession.gameState);
                io.to(currentSession.id).emit('updateRockets', currentSession.gameState.rockets);
            }, ROCKET_SPAWN_INTERVAL);
        }
    });

    // Handle player input (movement, actions)
    socket.on('playerInput', (input) => {
        if (currentSession) {
            currentSession.gameState = gameUpdate(currentSession.gameState, input);
            io.to(currentSession.id).emit('gameStateUpdate', currentSession.gameState);
        }
    });

    // Handle player disconnecting
    socket.on('disconnect', () => {
        if (currentSession) {
            currentSession.players = currentSession.players.filter(player => player !== socket);

            // Broadcast updated player count
            io.to(currentSession.id).emit('playerCount', currentSession.players.length);

            console.log('Player disconnected from session:', currentSession.id);

            // If no players are left in the session, clear the intervals and delete the session
            if (currentSession.players.length === 0) {
                stopGameLoop(currentSession.id);  // Stop the game and timer loops for the room
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
