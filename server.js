const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://192.168.0.52:3000',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://192.168.0.52:3000',
  }
});

let gameSessions = [];  // Array to store all game sessions

const MAX_PLAYERS_PER_SESSION = 4; // Max number of players per game session

const platforms = [
    { x: 0, y: 700, width: 300, height: 20 },
    { x: 400, y: 700, width: 300, height: 20 },
    { x: 800, y: 700, width: 300, height: 20 },
    { x: 0, y: 500, width: 100, height: 20 },
    { x: 150, y: 500, width: 70, height: 20 },
    { x: 300, y: 500, width: 200, height: 20 },
    { x: 400, y: 500, width: 100, height: 20 },
    { x: 600, y: 500, width: 100, height: 20 },
    { x: 800, y: 500, width: 100, height: 20 },
    { x: 1000, y: 500, width: 100, height: 20 },
    { x: 0, y: 300, width: 100, height: 20 },
    { x: 170, y: 300, width: 100, height: 20 },
    { x: 350, y: 300, width: 130, height: 20 },
    { x: 400, y: 300, width: 50, height: 20 },
    { x: 600, y: 300, width: 100, height: 20 },
    { x: 800, y: 300, width: 50, height: 20 },
    { x: 900, y: 280, width: 50, height: 20 },
    { x: 1000, y: 250, width: 100, height: 20 },
];

const ladders = [
    { x: 1000, y: 500, height: 200 },
    { x: 0, y: 300, height: 200 },
];

const portal = { x: 1110, y: 200, width: 10, height: 60 };


io.on('connection', (socket) => {
  console.log('New client connected');

  let currentSession = null;

  socket.on('joinGame', (gameType) => {
    // Find or create a session with space for a new player
    currentSession = findOrCreateSession(gameType);
    if (!currentSession) {
      socket.emit('error', 'No available sessions');
      return;
    }

    currentSession.players.push(socket);
    socket.join(currentSession.id);
    console.log(`Client joined session ${currentSession.id}`);

    if (currentSession.players.length === 1) {
      // First player becomes the host
      currentSession.host = socket;
      setupNewGameState(currentSession, gameType);
      socket.emit('role', 'host');
    } else {
      socket.emit('role', 'viewer');
      socket.emit('initialGameState', currentSession.gameState);
    }

    // Broadcast the player count update
    io.in(currentSession.id).emit('playerCount', currentSession.players.length);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentSession) {
        if (socket === currentSession.host) {
            // End the session if the host disconnects
            console.log(`Session ${currentSession.id} ended because the host disconnected.`);
            
            // Clear any intervals or timeouts related to this session
            if (currentSession.gameInterval) {
                clearInterval(currentSession.gameInterval);
            }
            if (currentSession.ballBounceInterval) {
                clearInterval(currentSession.ballBounceInterval);
            }
            
            // Notify all clients that the game is over and session is closed
            io.in(currentSession.id).emit('gameOver', true);
            io.in(currentSession.id).emit('sessionClosed');
            
            // Remove the session and disconnect all players
            gameSessions = gameSessions.filter(session => session !== currentSession);
            currentSession.players.forEach(player => player.disconnect(true));
        } else {
            // If not the host, just remove the player from the session
            currentSession.players = currentSession.players.filter(player => player !== socket);
            io.in(currentSession.id).emit('playerCount', currentSession.players.length);
        }
    }
});

  

  socket.on('spaceshipPosition', (newPosition) => {
    if (socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.spaceshipPosition = newPosition;
      io.in(currentSession.id).emit('spaceshipPosition', newPosition);
    }
  });

  socket.on('newAlien', (newAlien) => {
    if (socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.aliens.push(newAlien);
      io.in(currentSession.id).emit('newAlien', newAlien);
    }
  });

  socket.on('newRocket', (newRocket) => {
    if (socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.rockets.push(newRocket);
      io.in(currentSession.id).emit('newRocket', newRocket);
    }
  });

  socket.on('newSpecialEntity', (newSpecialEntity) => {
    if (socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.specialEntities.push(newSpecialEntity);
      io.in(currentSession.id).emit('newSpecialEntity', newSpecialEntity);
    }
  });

  socket.on('startGame', () => {
    if (currentSession.host === socket && !currentSession.gameState.isGameOver) {
      startGameTimer(currentSession);  // Start the timer when the game starts
      // startBallBouncing is removed, as it's no longer necessary
    }
  });

  socket.on('requestInitialGameState', () => {
    if (currentSession.gameState) {
      socket.emit('initialGameState', currentSession.gameState);
      console.log('Gave initial state');
    }
  });

  socket.on('playerPosition', (newPlayerState) => {
    if (socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.player = newPlayerState;
      io.in(currentSession.id).emit('playerPosition', newPlayerState);
    }
  });

  // Update the ball positions regularly
  setInterval(() => {
    if (currentSession) {
      updateBallPositions(currentSession);
    }
  }, 1000 / 60); // Update positions 60 times per second
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});

// Helper Functions

function findOrCreateSession(gameType) {
  // Find a session with space available
  let session = gameSessions.find(s => s.gameType === gameType && s.players.length < MAX_PLAYERS_PER_SESSION);
  
  if (!session) {
    // If no session found, create a new one
    session = {
      id: `session-${gameSessions.length + 1}`,
      gameType: gameType,
      players: [],
      host: null,
      gameState: null,
      gameInterval: null,  // Interval for updating the game time
    };
    gameSessions.push(session);
  }
  
  return session;
}

function setupNewGameState(session, gameType) {
  if (gameType === 'alienShooting') {
    session.gameState = { 
      spaceshipPosition: 50,
      aliens: [],
      bullets: [],
      specialEntities: [],
      timeLeft: 50,
    };
    console.log('Alien Shooting game state initialized');
  } else if (gameType === 'platformer') {
    session.gameState = { 
      rockets: [],
      balls: [
        { x: 850, y: 650, initialY: 650, velY: -2 },  // Adjusted initial velY for faster bouncing
        { x: 850, y: 650, initialY: 650, velY: -1.5 },
            { x: 400, y: 250, initialY: 250, velY: -1.5 },
            { x: 800, y: 250, initialY: 250, velY: -1 },
            { x: 600, y: 650, initialY: 250, velY: -0.5 },
      ],
      platforms: platforms,
      ladders: ladders,
      portal: portal,
      timeLeft: 60,
      isGameOver: false,
    };
    console.log('Platformer game state initialized');
  }
}

function startGameTimer(session) {
  if (session.gameInterval) return;  // Prevent multiple intervals from being set

  session.gameInterval = setInterval(() => {
    if (!session.gameState || session.gameState.isGameOver) return;

    session.gameState.timeLeft -= 1;

    io.in(session.id).emit('updateTimer', session.gameState.timeLeft);

    if (session.gameState.timeLeft <= 0) {
      session.gameState.isGameOver = true;
      io.in(session.id).emit('gameOver', true); // Emit game over state

      clearInterval(session.gameInterval);  // Clear the interval when the game is over
      session.gameInterval = null;  // Reset the game interval variable
      
      // Remove the session after the game is over
      gameSessions = gameSessions.filter(s => s.id !== session.id);
      io.in(session.id).emit('sessionClosed'); // Notify all clients that the session is closed

      // Disconnect all players in the session
      session.players.forEach(player => player.disconnect(true));
      
      return;
    }

    if (session.gameState.timeLeft % 5 === 0) {
      // Spawn rockets every 5 seconds
      const rockets = [
        { x: 1200, y: 230, direction: 'left' },
        { x: 0, y: 260, direction: 'right' },
        { x: 0, y: 390, direction: 'right' },
        { x: 1200, y: 450, direction: 'left' },
        { x: 1200, y: 680, direction: 'left' },
        { x: 0, y: 600, direction: 'right' }
      ];
      
      // Send rocket spawn info to clients
      io.in(session.id).emit('spawnRockets', rockets);
      console.log('Rockets spawned');
    }
  }, 1000);  // Ensure the interval is exactly 1 second
}

function updateBallPositions(session) {
  if (!session.gameState || !session.gameState.balls) return;

  session.gameState.balls = session.gameState.balls.map((ball) => {
      let newY = ball.y + ball.velY;

      // Check for bounce at top and bottom limits
      const topLimit = ball.initialY - 50; // Adjust this value as needed
      const bottomLimit = ball.initialY;

      let bounced = false;

      // Handle top bounce
      if (newY < topLimit) {
          newY = topLimit;
          ball.velY = -ball.velY; // Reverse direction
          bounced = true;
      }

      // Handle bottom bounce
      if (newY > bottomLimit) {
          newY = bottomLimit;
          ball.velY = -ball.velY; // Reverse direction
          bounced = true;
      }

      // Notify clients only if a bounce occurred
      if (bounced) {
          io.in(session.id).emit('ballBounce', ball); // Emit ballBounce event
      }

      // Update ball position locally on the server
      return { ...ball, y: newY };
  });
}
