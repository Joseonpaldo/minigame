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

let alienHostSocket = null;
let platformerHostSocket = null;
let alienGameState = null;
let platformerGameState = null;
let gameInterval = null;  // Interval for updating the game time

// Define game environment data on the server
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

// Physics constants
const GRAVITY = 0.1;
const DAMPING = 0.98;

io.on('connection', (socket) => {
  console.log('New client connected');

  let roleAssigned = false;

  socket.on('joinGame', (gameType) => {
    if (roleAssigned) return;

    if (gameType === 'alienShooting') {
      if (!alienHostSocket) {
        alienHostSocket = socket;
        alienGameState = { 
          spaceshipPosition: 50,
          aliens: [],
          bullets: [],
          specialEntities: [],
          timeLeft: 50,
        };
        roleAssigned = true;
        socket.emit('role', 'host');
        console.log('Alien Shooting Host assigned');
      } else {
        socket.emit('role', 'viewer');
        roleAssigned = true;
        console.log('Alien Shooting Viewer assigned');
        if (alienGameState) {
          socket.emit('initialGameState', alienGameState);
        }
      }
    } else if (gameType === 'platformer') {
      if (!platformerHostSocket) {
        platformerHostSocket = socket;
        platformerGameState = { 
          rockets: [],
          balls: [
            { x: 850, y: 650, initialY: 650, velY: -0.4 },
          ],
          platforms: platforms,
          ladders: ladders,
          portal: portal,
          timeLeft: 60,
          isGameOver: false,
        };
        roleAssigned = true;
        socket.emit('role', 'host');
        console.log('Platformer Host assigned');
      } else {
        socket.emit('role', 'viewer');
        roleAssigned = true;
        console.log('Platformer Viewer assigned');
        if (platformerGameState) {
          socket.emit('initialGameState', platformerGameState);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (socket === alienHostSocket) {
      alienHostSocket = null;
      alienGameState = null;
      console.log('Alien Shooting Host disconnected');
    }
    if (socket === platformerHostSocket) {
      platformerHostSocket = null;
      platformerGameState = null;
      clearInterval(gameInterval);  // Clear the interval when the host disconnects
      gameInterval = null;  // Reset the game interval variable
      console.log('Platformer Host disconnected');
    }
  });

  socket.on('setInitialGameState', (initialState) => {
    if (socket === alienHostSocket) {
      alienGameState = {
        spaceshipPosition: 50,
        aliens: [],
        bullets: [],
        specialEntities: [],
        timeLeft: 100,
        ...initialState,
      };
      console.log('Alien Shooting initial game state set by host');
    } else if (socket === platformerHostSocket) {
      platformerGameState = {
        rockets: [],
        balls: platformerGameState.balls,
        platforms: platforms,
        ladders: ladders,
        portal: portal,
        timeLeft: platformerGameState.timeLeft,
        isGameOver: false,
        ...initialState,
      };
      console.log('Platformer initial game state set by host');
    }
  });

  socket.on('spaceshipPosition', (newPosition) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.spaceshipPosition = newPosition;
      socket.broadcast.emit('spaceshipPosition', newPosition);
    }
  });

  socket.on('newAlien', (newAlien) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.aliens.push(newAlien);
      socket.broadcast.emit('newAlien', newAlien);
    }
  });

  socket.on('newRocket', (newRocket) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.rockets.push(newRocket);
      socket.broadcast.emit('newRocket', newRocket);
    }
  });

  socket.on('newSpecialEntity', (newSpecialEntity) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.specialEntities.push(newSpecialEntity);
      socket.broadcast.emit('newSpecialEntity', newSpecialEntity);
    }
  });

  const startGameTimer = () => {
    if (gameInterval) return;  // Prevent multiple intervals from being set

    gameInterval = setInterval(() => {
      if (!platformerGameState || platformerGameState.isGameOver) return;

      platformerGameState.timeLeft -= 1;

      io.emit('updateTimer', platformerGameState.timeLeft);

      if (platformerGameState.timeLeft <= 0) {
        platformerGameState.isGameOver = true;
        io.emit('gameOver', true); // Emit game over state
        clearInterval(gameInterval);  // Clear the interval when the game is over
        gameInterval = null;  // Reset the game interval variable
        return;
      }

      if (platformerGameState.timeLeft % 5 === 0) {
        // Spawn rockets every 5 seconds
        const rockets = [
          { x: 1200, y: 230, direction: 'left' },
          { x: 0, y: 260, direction: 'right' },
          { x: 0, y: 390, direction: 'right' },
          { x: 1200, y: 450, direction: 'left' },
          { x: 1200, y: 680, direction: 'left' },
          { x: 0, y: 600, direction: 'right' }
        ];
        platformerGameState.rockets.push(...rockets);
        io.emit('updateRockets', platformerGameState.rockets);  // Broadcast the new rockets to all clients
        console.log('Rockets spawned');
      }
    }, 1000);  // Ensure the interval is exactly 1 second
  };

  const updateRocketPositions = () => {
    if (!platformerGameState || !platformerGameState.rockets) return;

    platformerGameState.rockets = platformerGameState.rockets.map((rocket) => {
      const newX = rocket.x + (rocket.direction === 'left' ? -1.3 : 1.3);
      return { ...rocket, x: newX };
    });
    io.emit('updateRockets', platformerGameState.rockets); // Broadcast the updated positions to all clients
  };

  const updateBallPositions = () => {
    if (!platformerGameState || !platformerGameState.balls) return;

    platformerGameState.balls = platformerGameState.balls.map((ball) => {
      let newY = ball.y + ball.velY;
      if (newY <= ball.initialY - 150 || newY >= ball.initialY) {
        ball.velY = -ball.velY;
      }
      return { ...ball, y: newY };
    });
    io.emit('updateBalls', platformerGameState.balls);
  };

  socket.on('startGame', () => {
    if (platformerHostSocket && !platformerGameState.isGameOver) {
      startGameTimer();  // Start the timer when the game starts
    }
  });

  socket.on('requestInitialGameState', () => {
    if (platformerHostSocket && platformerGameState) {
      socket.emit('initialGameState', platformerGameState);
      console.log('gave init state');
    }
  });

  socket.on('updateBalls', (newBalls) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.balls = newBalls;
      socket.broadcast.emit('updateBalls', newBalls);
    }
  });

  socket.on('playerPosition', (newPlayerState) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.player = newPlayerState;
      socket.broadcast.emit('playerPosition', newPlayerState);
    }
  });

  setInterval(() => {
    updateBallPositions();
    updateRocketPositions();
  }, 1000 / 60); // Update positions 60 times per second
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});

