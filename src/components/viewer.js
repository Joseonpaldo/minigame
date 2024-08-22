import React, { useState, useEffect } from 'react';
import './Game.css';

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const BALL_SIZE = 50;

const Viewer = ({ socket }) => {
  const [player, setPlayer] = useState(null);
  const [rockets, setRockets] = useState([]);
  const [balls, setBalls] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);

  // Define the map platforms, ladders, and portal
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

  useEffect(() => {
    console.log('Viewer connecting to WebSocket server...');

    // Request the initial game state
    socket.emit('requestInitialGameState');
    console.log('Requested initial game state');

    // Listen for the initial game state from the server
    socket.on('initialGameState', (initialState) => {
      console.log('Received initial game state:', initialState);
      setPlayer(initialState.player);
      setRockets(initialState.rockets || []);
      setBalls(initialState.balls || []);
      setTimeLeft(initialState.timeLeft);
      setIsGameOver(initialState.isGameOver);
    });

    // Listen for updates to player position
    socket.on('playerPosition', (newPlayerState) => {
  
      setPlayer(newPlayerState);
    });

    // Listen for new rockets
    socket.on('updateRockets', () => {
      console.log('Received spawnRocket signal');
      spawnRocket();
    });

    // Listen for ball updates
    socket.on('updateBalls', (newBalls) => {
      console.log('Received updated balls:', newBalls);
      setBalls(newBalls);
    });

    // Listen for timer updates
    socket.on('updateTimer', (newTime) => {
      console.log('Received timer update:', newTime);
      setTimeLeft(newTime);
    });

    // Listen for game over state
    socket.on('gameOver', (gameOverState) => {
      console.log('Received game over state:', gameOverState);
      setIsGameOver(gameOverState);
    });

    return () => {
      console.log('Viewer disconnecting from WebSocket server...');
      socket.off('initialGameState');
      socket.off('playerPosition');
      socket.off('spawnRocket');
      socket.off('updateBalls');
      socket.off('updateTimer');
      socket.off('gameOver');
    };
  }, [socket]);

  // Function to spawn a rocket
  const spawnRocket = () => {
    const newRockets = [
      { x: GAME_WIDTH, y: 230, direction: 'left' },
      { x: 0, y: 260, direction: 'right' },
      { x: 0, y: 390, direction: 'right' },
      { x: GAME_WIDTH, y: 450, direction: 'left' },
      { x: GAME_WIDTH, y: 680, direction: 'left' },
      { x: 0, y: 600, direction: 'right' }
    ];
    setRockets((prevRockets) => [...prevRockets, ...newRockets]);
  };

  useEffect(() => {
    let animationFrameId;
    const gameInterval = () => {
      setRockets((prevRockets) =>
        prevRockets.map((rocket) => ({
          ...rocket,
          x: rocket.x + (rocket.direction === 'left' ? -6 : 6),
        })).filter(rocket => rocket.x > 0 && rocket.x < GAME_WIDTH)
      );
      animationFrameId = requestAnimationFrame(gameInterval);
    }
    gameInterval();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (isGameOver) {
    return <div className="game-over">Game Over</div>;
  }

  if (!player) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <div className="timer">Time Left: {timeLeft}</div>
          <div className="viewport">
            <div
              className={`player ${player?.isFlashing ? 'flashing' : ''} ${player?.isWalking ? 'moving' : 'still'} ${player?.direction === -1 ? 'left' : 'right'}`}
              style={{ left: player?.x, top: player?.y }}
            />
            {rockets.map((rocket, index) => (
              <div key={index} className="rocket" style={{ left: rocket.x, top: rocket.y }} />
            ))}
            {platforms.map((platform, index) => (
              <div key={index} className="platform" style={{ left: platform.x, top: platform.y, width: platform.width, height: platform.height }} />
            ))}
            {ladders.map((ladder, index) => (
              <div key={index} className="ladder" style={{ left: ladder.x, top: ladder.y, height: ladder.height }} />
            ))}
            <div className="portal" style={{ left: portal.x, top: portal.y, width: portal.width, height: portal.height }} />
            {balls.map((ball, index) => (
              <div key={index} className="ball" style={{ left: ball.x, top: ball.y, width: BALL_SIZE, height: BALL_SIZE }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer;
