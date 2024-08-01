const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for all routes
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
  }

  // Send the current game state to the new client
  socket.emit('gameState', gameState);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (socket === hostSocket) {
      hostSocket = null;
      console.log('Host disconnected');
    }
  });

  // Handle game updates from the game host
  socket.on('updateGameState', (newGameState) => {
    if (socket === hostSocket) {
      gameState = newGameState;
      console.log('Received new game state from host:', gameState); // Add this line
      // Broadcast the updated game state to all clients except the sender
      socket.broadcast.emit('gameState', gameState);
    }
  });
});

// Serve the React app from the build directory
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
