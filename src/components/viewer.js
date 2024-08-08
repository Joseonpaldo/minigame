import React, { useState, useEffect } from 'react';
import './Game.css';

const Viewer = ({ socket }) => {
  const [player, setPlayer] = useState(null);
  const [rockets, setRockets] = useState([]);
  const [balls, setBalls] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [ladders, setLadders] = useState([]);
  const [portal, setPortal] = useState({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    console.log('Viewer connecting to WebSocket server...');

    // Request the initial game state
    socket.emit('requestInitialGameState');

    socket.on('initialGameState', (initialState) => {
      console.log('Received initial game state:', initialState);
      setPlayer(initialState.player);
      setRockets(initialState.rockets);
      setBalls(initialState.balls);
      setPlatforms(initialState.platforms);
      setLadders(initialState.ladders);
      setPortal(initialState.portal);
      setTimeLeft(initialState.timeLeft);
      setIsGameOver(initialState.isGameOver);
    });

    socket.on('playerPosition', (newPlayerState) => {
      console.log('Received player position:', newPlayerState);
      setPlayer(newPlayerState);
    });

    socket.on('updatePlatformerGameState', (newGameState) => {
      console.log('Received partial game state:', newGameState);
      setPlayer(newGameState.player);
      setRockets(newGameState.rockets);
      setBalls(newGameState.balls);
      setPlatforms(newGameState.platforms);
      setLadders(newGameState.ladders);
      setPortal(newGameState.portal);
      setTimeLeft(newGameState.timeLeft);
      setIsGameOver(newGameState.isGameOver);
    });

    return () => {
      console.log('Viewer disconnecting from WebSocket server...');
      socket.off('initialGameState');
      socket.off('playerPosition');
      socket.off('updatePlatformerGameState');
    };
  }, [socket]);

  useEffect(() => {
    if (isGameOver) return;

    // Update rockets and balls movements based on game logic
    const interval = setInterval(() => {
      setRockets((prevRockets) =>
        prevRockets.map((rocket) => ({
          ...rocket,
          x: rocket.x + (rocket.direction === 'left' ? -3 : 3),
        })).filter(rocket => rocket.x > 0 && rocket.x < 1200)
      );

      setBalls((prevBalls) =>
        prevBalls.map((ball) => {
          let newY = ball.y + ball.velY;
          if (newY <= ball.initialY - 100 || newY >= ball.initialY) {
            return { ...ball, y: newY, velY: -ball.velY };
          }
          return { ...ball, y: newY };
        })
      );
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(interval);
  }, [isGameOver]);

  if (!player) {
    return <div>Loading...</div>;
  }

  const gameContainerStyle = {
    transform: `scale(2)`,
    transformOrigin: `${player.x + 20}px ${player.y + 20}px`,
    transition: 'transform 0.1s ease-out', // Smooth transition for zoom
  };

  if (isGameOver) {
    return <div className="game-over">Game Over</div>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="game" style={{ width: 1200, height: 800 }}>
          <div className="timer">Time Left: {timeLeft}</div>
          <div className="viewport" style={gameContainerStyle}>
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
              <div key={index} className="ball" style={{ left: ball.x, top: ball.y, width: 50, height: 50 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer;
