const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

let gameState = {
  aliens: [],
  bullets: [],
  spaceshipPosition: 50,
  gameOver: false,
  timeLeft: 100,
  shotsLeft: 5,
  reloading: false,
  specialEntities: [],
};

let hostSocket = null;

io.on('connection', (socket) => {
  console.log('New client connected');

  if (!hostSocket) {
    hostSocket = socket;
    socket.emit('role', 'host');
    console.log('Host assigned');
  } else {
    socket.emit('role', 'viewer');
    console.log('Viewer assigned');
    socket.emit('initialGameState', gameState);
  }

  socket.on('requestInitialGameState', () => {
    socket.emit('initialGameState', gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (socket === hostSocket) {
      hostSocket = null;
      console.log('Host disconnected');
    }
  });

  socket.on('playerPosition', (newPosition) => {
    if (socket === hostSocket) {
      gameState.spaceshipPosition = newPosition;
      socket.broadcast.emit('playerPosition', newPosition);
    }
  });

  socket.on('newAlien', (newAlien) => {
    if (socket === hostSocket) {
      gameState.aliens.push(newAlien);
      socket.broadcast.emit('newAlien', newAlien);
    }
  });

  socket.on('newBullet', (newBullet) => {
    if (socket === hostSocket) {
      gameState.bullets.push(newBullet);
      socket.broadcast.emit('newBullet', newBullet);
    }
  });

  socket.on('newSpecialEntity', (newSpecialEntity) => {
    if (socket === hostSocket) {
      gameState.specialEntities.push(newSpecialEntity);
      socket.broadcast.emit('newSpecialEntity', newSpecialEntity);
    }
  });

  socket.on('updateTimer', (newTime) => {
    if (socket === hostSocket) {
      gameState.timeLeft = newTime;
      socket.broadcast.emit('updateTimer', newTime);
    }
  });

  socket.on('updatePositions', ({ aliens, specialEntities }) => {
    if (socket === hostSocket) {
      gameState.aliens = aliens;
      gameState.specialEntities = specialEntities;
      socket.broadcast.emit('updatePositions', { aliens, specialEntities });
    }
  });

  socket.on('updateBullets', (bullets) => {
    if (socket === hostSocket) {
      gameState.bullets = bullets;
      socket.broadcast.emit('updateBullets', bullets);
    }
  });
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
