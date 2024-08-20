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
let alienGameState = null; // Initial state will be set by the host
let platformerGameState = null; // Initial state will be set by the host

io.on('connection', (socket) => {
  console.log('New client connected');

  let roleAssigned = false;

  socket.on('joinGame', (gameType) => {
    if (roleAssigned) return;
    if (gameType === 'alienShooting') {
      if (!alienHostSocket) {
        alienHostSocket = socket;
        alienGameState = { // Initialize default game state for Alien Shooting
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
        platformerGameState = { // Initialize default game state for Platformer
          player: { x: 0, y: 0 },
          rockets: [],
          balls: [],
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
      console.log('Platformer Host disconnected');
    }
  });

  // Alien Shooting Game events
  socket.on('setInitialGameState', (initialState) => {
    if (socket === alienHostSocket) {
      alienGameState = {
        spaceshipPosition: 50,
        aliens: [],
        bullets: [],
        specialEntities: [],
        timeLeft: 100,
        ...initialState,  // Use the initialState provided by the host to override defaults
      };
      console.log('Alien Shooting initial game state set by host');
    } else if (socket === platformerHostSocket) {
      console.log('Platformer Host Initial');
      platformerGameState = {
        player: { x: 0, y: 0 },
        rockets: [],
        timeLeft: 60,
        isGameOver: false,
        ladders: [],
        portal: [],
        
        ...initialState,  // Use the initialState provided by the host to override defaults
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

  socket.on('newBullet', (newBullet) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.bullets.push(newBullet);
      socket.broadcast.emit('newBullet', newBullet);
    } else if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.bullets.push(newBullet);
      socket.broadcast.emit('newBullet', newBullet);
    }
  });

  socket.on('newSpecialEntity', (newSpecialEntity) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.specialEntities.push(newSpecialEntity);
      socket.broadcast.emit('newSpecialEntity', newSpecialEntity);
    }
  });

  socket.on('updateTimer', (newTime) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.timeLeft = newTime;
      socket.broadcast.emit('updateTimer', newTime);
      console.log("time updated");
    } else if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.timeLeft = newTime;
      socket.broadcast.emit('updateTimer', newTime);
      console.log("time updated");
    }
  });

  socket.on('updatePositions', ({ aliens, specialEntities }) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.aliens = aliens;
      alienGameState.specialEntities = specialEntities;
      socket.broadcast.emit('updatePositions', { aliens, specialEntities });
    }
  });

  socket.on('updateBullets', (bullets) => {
    if (socket === alienHostSocket && alienGameState) {
      alienGameState.bullets = bullets;
      socket.broadcast.emit('updateBullets', bullets);
    } else if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.bullets = bullets;
      socket.broadcast.emit('updateBullets', bullets);
    }
  });

  // Platformer Game events
  socket.on('playerPosition', (newPlayerState) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.player = newPlayerState;
      socket.broadcast.emit('playerPosition', newPlayerState);
    }
  });

  socket.on('requestInitialGameState', () => {
    console.log('Initial game state requested by viewer');
    if (platformerHostSocket && platformerGameState) {
      // Send the current game state to the newly connected viewer
      socket.emit('initialGameState', platformerGameState);
      console.log(platformerGameState);
    }
  });

  socket.on('updateBalls', (newBalls) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState.balls = newBalls;
      socket.broadcast.emit('updateBalls', newBalls);
    }
  });

  socket.on('updatePlatformerGameState', (newGameState) => {
    if (socket === platformerHostSocket && platformerGameState) {
      platformerGameState = { ...platformerGameState, ...newGameState };
      socket.broadcast.emit('updatePlatformerGameState', newGameState);
    }
  });
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  console.log("in");
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
