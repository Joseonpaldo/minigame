import React, { useState, useEffect } from 'react';
import './AlienShooter.css';

const AlienViewer = ({ socket }) => {
  const [gameState, setGameState] = useState({
    aliens: [],
    bullets: [],
    spaceshipPosition: 50,
    gameOver: false,
    timeLeft: 100,
    shotsLeft: 5,
    reloading: false,
    specialEntities: [],
  });

  useEffect(() => {
    console.log('Viewer connecting to WebSocket server...');
    
    socket.on('role', (role) => {
      console.log(`Assigned role: ${role}`);
    });

    socket.on('gameState', (newGameState) => {
      console.log('Received new game state:', newGameState); // Add this line
      setGameState(newGameState);
    });

    return () => {
      console.log('Viewer disconnecting from WebSocket server...');
      socket.off('gameState');
    };
  }, [socket]);

  return (
    <div className="alien-shooter">
      <div className="ammo">Shots Left: {gameState.shotsLeft}</div>
      <div className="timer">Time Left: {gameState.timeLeft}s</div>
      <div className="game-area">
        {gameState.aliens.map(alien => (
          <div
            key={alien.id}
            className={`${alien.type === 'strong' ? 'strong-alien' : 'normal-alien'} ${alien.flash ? 'flash' : ''}`}
            style={{ left: `${alien.left}%`, top: `${alien.top}%`, opacity: alien.flash ? 0.5 : 1 }}
          >
            <img src={alien.type === 'strong' ? '/strong-alien.png' : '/normal-alien.png'} alt="Alien" />
          </div>
        ))}
        {gameState.specialEntities.map(entity => (
          <div
            key={entity.id}
            className="special-entity"
            style={{ left: `${entity.left}%`, top: `${entity.top}%` }}
          >
            <img src="/barrel.png" alt="Special Entity" />
          </div>
        ))}
        {gameState.bullets.map(bullet => (
          <div key={bullet.id} className="bullet" style={{ left: `${bullet.left}%`, top: `${bullet.top}%` }} />
        ))}
        <div className="spaceship" style={{ left: `${gameState.spaceshipPosition}%` }}>
          <img src="/turtle.png" alt="Spaceship" />
        </div>
        {gameState.reloading && <div className="reloading">Reloading...</div>}
      </div>
      {gameState.gameOver && <div className="game-over">Game Over</div>}
    </div>
  );
};

export default AlienViewer;
