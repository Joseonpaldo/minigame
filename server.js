const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://192.168.0.52:3000',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://192.168.0.52:3000'
  },
});

const MAX_PLAYERS_PER_SESSION = 4;
let gameSessions = {};  // Object to store game sessions by gameType and roomNumber

io.on('connection', (socket) => {
  console.log('New client connected');

  let currentSession = null;
  let roleAssigned = false;
  let timerInterval;
  let rocketInterval;

  const startPlatformerGame = () => {
    if (timerInterval) clearInterval(timerInterval);
    if (rocketInterval) clearInterval(rocketInterval);

    timerInterval = setInterval(() => {
      if (currentSession && currentSession.gameState && currentSession.gameState.timeLeft <= 0) {
        clearInterval(timerInterval);
        clearInterval(rocketInterval);
        io.to(currentSession.id).emit('gameOver');
        return;
      }
      if (currentSession && currentSession.gameState) {
        currentSession.gameState.timeLeft -= 1;
        io.to(currentSession.id).emit('updateTimer', currentSession.gameState.timeLeft);
        console.log(currentSession.gameState.timeLeft);
      }
    }, 1000);

    rocketInterval = setInterval(() => {
      io.to(currentSession.id).emit('updateRockets');
      console.log('updateRockets');
    }, 5000);
  };

  socket.on('joinGame', ({ gameType, roomNumber }) => {
    if (roleAssigned) return;

    const sessionKey = `${gameType}-${roomNumber}`;

    if (!gameSessions[sessionKey]) {
      gameSessions[sessionKey] = [];
    }

    let session = gameSessions[sessionKey].find(s => s.players.length < MAX_PLAYERS_PER_SESSION);

    if (!session) {
      session = {
        id: sessionKey,
        gameType: gameType,
        roomNumber: roomNumber,
        players: [],
        host: null,
        gameState: null,
      };
      gameSessions[sessionKey].push(session);
    }

    currentSession = session;
    currentSession.players.push(socket);
    socket.join(currentSession.id);
    console.log(`Client joined session ${currentSession.id} for game type ${gameType} in room ${roomNumber}`);

    if (currentSession.players.length === 1) {
      // First player becomes the host
      currentSession.host = socket;
      setupNewGameState(currentSession, gameType);
      roleAssigned = true;
      socket.emit('role', 'host');
      console.log(`${gameType} Host assigned`);
      if (gameType === 'platformer') {
        startPlatformerGame();
      }
    } else {
      socket.emit('role', 'viewer');
      roleAssigned = true;
      console.log(`${gameType} Viewer assigned`);
      if (currentSession.gameState) {
        socket.emit('initialGameState', currentSession.gameState);
      }
    }

    io.to(currentSession.id).emit('playerCount', currentSession.players.length);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentSession) {
        // Remove the disconnected socket from the session's player list
        currentSession.players = currentSession.players.filter(player => player !== socket);

        if (socket === currentSession.host) {
            console.log(`Host disconnected from session ${currentSession.id}`);

            // Clear intervals if the host disconnects
            clearInterval(timerInterval);
            clearInterval(rocketInterval);

            // Notify all remaining players that the game is over
            io.to(currentSession.id).emit('gameOver');
            io.to(currentSession.id).emit('sessionClosed');

            // Disconnect all players from the session
            currentSession.players.forEach(player => player.disconnect(true));

            // Remove the session from the gameSessions object
            if (gameSessions[currentSession.gameType]) {
                gameSessions[currentSession.gameType] = gameSessions[currentSession.gameType].filter(session => session.id !== currentSession.id);
                
                if (gameSessions[currentSession.gameType].length === 0) {
                    delete gameSessions[currentSession.gameType];
                }
            }

        } else {
            // If a non-host player disconnects
            io.to(currentSession.id).emit('playerCount', currentSession.players.length);

            // If no players are left in the session, clean it up
            if (currentSession.players.length === 0) {
                console.log(`All players disconnected from session ${currentSession.id}`);

                // Clean up session data
                clearInterval(timerInterval);
                clearInterval(rocketInterval);

                if (gameSessions[currentSession.gameType]) {
                    gameSessions[currentSession.gameType] = gameSessions[currentSession.gameType].filter(session => session.id !== currentSession.id);
                    
                    if (gameSessions[currentSession.gameType].length === 0) {
                        delete gameSessions[currentSession.gameType];
                    }
                }
            }
        }
    }
});
/***********위쪽은 공통로직***************** */
  // Bomb Game events
  socket.on('setDefuseWire', (wire) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.defuseWire = wire;
      io.to(currentSession.id).emit('defuseWire', wire);
    }
  });

  socket.on('bombStatus', (status) => {
    if (currentSession && currentSession.gameType === 'bomb') {
      io.to(currentSession.id).emit('bombStatusUpdate', status);
    }
  });
/***********플랫폼 로직***************** */
  // Platformer Game events
  socket.on('playerPosition', (newPlayerState) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.player = newPlayerState;
      socket.broadcast.to(currentSession.id).emit('playerPosition', newPlayerState);
    }
  });

  // Alien Shooting Game events
  socket.on('spaceshipPosition', (newPosition) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.spaceshipPosition = newPosition;
      socket.broadcast.to(currentSession.id).emit('spaceshipPosition', newPosition);
    }
  });

  socket.on('newAlien', (newAlien) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.aliens.push(newAlien);
      socket.broadcast.to(currentSession.id).emit('newAlien', newAlien);
    }
  });

  socket.on('newBullet', (newBullet) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.bullets.push(newBullet);
      socket.broadcast.to(currentSession.id).emit('newBullet', newBullet);
    }
  });

  socket.on('newSpecialEntity', (newSpecialEntity) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.specialEntities.push(newSpecialEntity);
      socket.broadcast.to(currentSession.id).emit('newSpecialEntity', newSpecialEntity);
    }
  });

  socket.on('updateTimer', (newTime) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.timeLeft = newTime;
      socket.broadcast.to(currentSession.id).emit('updateTimer', newTime);
    }
  });

  socket.on('updatePositions', ({ aliens, specialEntities }) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.aliens = aliens;
      currentSession.gameState.specialEntities = specialEntities;
      socket.broadcast.to(currentSession.id).emit('updatePositions', { aliens, specialEntities });
    }
  });

  socket.on('updateBullets', (bullets) => {
    if (currentSession && socket === currentSession.host && currentSession.gameState) {
      currentSession.gameState.bullets = bullets;
      socket.broadcast.to(currentSession.id).emit('updateBullets', bullets);
    }
  });

  // Rock Paper Scissors Game events
  socket.on('rpsPlayerChoice', (choice) => {
    if (currentSession && currentSession.gameType === 'RPS') {
      currentSession.gameState.playerChoice = choice;
      socket.broadcast.to(currentSession.id).emit('rpsPlayerChoice', choice);
    }
  });

  socket.on('rpsComputerChoice', (choice) => {
    if (currentSession && currentSession.gameType === 'RPS') {
      currentSession.gameState.computerChoice = choice;
      socket.broadcast.to(currentSession.id).emit('rpsComputerChoice', choice);
    }
  });

  socket.on('rpsResult', (result) => {
    if (currentSession && currentSession.gameType === 'RPS') {
      currentSession.gameState.result = result;
      socket.broadcast.to(currentSession.id).emit('rpsResult', result);
    }
  });

  socket.on('rpsScore', ({ playerScore, computerScore }) => {
    if (currentSession && currentSession.gameType === 'RPS') {
      currentSession.gameState.playerScore = playerScore;
      currentSession.gameState.computerScore = computerScore;
      currentSession.gameState.round += 1;

      io.to(currentSession.id).emit('rpsScore', {
        playerScore,
        computerScore,
      });

      io.to(currentSession.id).emit('rpsRound', currentSession.gameState.round);

      if (currentSession.gameState.round > 3) {
        io.to(currentSession.id).emit('rpsGameOver');
      }
    }
  });
});

function setupNewGameState(session, gameType) {
  if (gameType === 'alienShooting') {
    session.gameState = {
      spaceshipPosition: 50,
      aliens: [],
      bullets: [],
      specialEntities: [],
      timeLeft: 100,
    };
  } else if (gameType === 'platformer') {
    session.gameState = {
      player: { x: 0, y: 600 },
      rockets: [],
      balls: [
        { x: 850, y: 650, initialY: 650, velY: -1.5 },
        { x: 400, y: 450, initialY: 450, velY: -1.5 },
        { x: 400, y: 250, initialY: 250, velY: -1.5 },
        { x: 800, y: 250, initialY: 250, velY: -1 },
        { x: 600, y: 250, initialY: 250, velY: -0.5 },
      ],
      timeLeft: 60,
      isGameOver: false,
    };
  } else if (gameType === 'RPS') {
    session.gameState = {
      playerChoice: null,
      computerChoice: null,
      result: null,
      playerScore: 0,
      computerScore: 0,
      round: 1,
    };
  } else if (gameType === 'bomb') {
    session.gameState = {
      defuseWire: null,
    };
  }
}

app.use(express.static(path.join(__dirname, 'build')));

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
