import React, { useState, useEffect } from 'react';
import './Game.css';

const Viewer = ({ socket }) => {
  const [player, setPlayer] = useState(null); // No default state, will be set on receiving initial state
  const [rockets, setRockets] = useState([]);
  const [balls, setBalls] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null); // Initially null, will be set on receiving initial game state
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    console.log('Viewer connecting to WebSocket server...');

    // Request the initial game state
    socket.emit('requestInitialGameState');
    console.log('requestInit')

    // Listen for the initial game state from the server
    socket.on('initialGameState', (initialState) => {
      console.log('Received initial game state:', initialState);
      setPlayer(initialState.player); // No fallback default, rely on server to send correct data
      setRockets(initialState.rockets || []);
      setBalls(initialState.balls || []);
      setTimeLeft(initialState.timeLeft);
      setIsGameOver(initialState.isGameOver);
    });

    // Listen for subsequent updates
    socket.on('playerPosition', (newPlayerState) => {
      console.log('Received player position:', newPlayerState);
      setPlayer(newPlayerState);
    });

    socket.on('updateRockets', (newRockets) => {
      console.log('Received updated rockets:', newRockets);
      setRockets(newRockets);
    });

    socket.on('updateBalls', (newBalls) => {
      console.log('Received updated balls:', newBalls);
      setBalls(newBalls);
    });

    socket.on('updateTimer', (newTime) => {
      console.log('Received timer update:', newTime);
      setTimeLeft(newTime);
    });

    return () => {
      console.log('Viewer disconnecting from WebSocket server...');
      socket.off('initialGameState');
      socket.off('playerPosition');
      socket.off('updateRockets');
      socket.off('updateBalls');
      socket.off('updateTimer');
    };
  }, [socket]);

  if (isGameOver) {
    return <div className="game-over">Game Over</div>;
  }

  if (!player) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="game" style={{ width: 1200, height: 800 }}>
          <div className="timer">Time Left: {timeLeft}</div>
          <div className="viewport">
            <div
              className={`player ${player?.isFlashing ? 'flashing' : ''} ${player?.isWalking ? 'moving' : 'still'} ${player?.direction === -1 ? 'left' : 'right'}`}
              style={{ left: player?.x, top: player?.y }}
            />
            {rockets.map((rocket, index) => (
              <div key={index} className="rocket" style={{ left: rocket.x, top: rocket.y }} />
            ))}
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
