import React, { useState, useEffect } from 'react';
import './AlienShooter.css';

const AlienShooter = ({ socket }) => {
  const [aliens, setAliens] = useState([]);
  const [bullets, setBullets] = useState([]);
  const [spaceshipPosition, setSpaceshipPosition] = useState(50);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100); // Set game duration to 100 seconds
  const [shotsLeft, setShotsLeft] = useState(5);
  const [reloading, setReloading] = useState(false);
  const [specialEntities, setSpecialEntities] = useState([]);

  const restartGame = () => {
    setAliens([]);
    setBullets([]);
    setSpaceshipPosition(50);
    setGameOver(false);
    setTimeLeft(100);
    setShotsLeft(5);
    setReloading(false);
    setSpecialEntities([]);
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timerId = setInterval(() => setTimeLeft((prevTime) => prevTime - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0) {
      setGameOver(true);
    }
  }, [timeLeft, gameOver]);

  // Game state update effect
  useEffect(() => {
    if (gameOver) return; // Stop sending game state after game over

    const interval = setInterval(() => {
      const gameState = {
        aliens,
        bullets,
        spaceshipPosition,
        gameOver,
        timeLeft,
        shotsLeft,
        reloading,
        specialEntities,
      };
      socket.emit('updateGameState', gameState);
    }, 100); // Send updates every 100ms

    return () => clearInterval(interval);
  }, [socket, aliens, bullets, spaceshipPosition, gameOver, timeLeft, shotsLeft, reloading, specialEntities]);

  // Aliens generation effect
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      const isStrongAlien = Math.random() < 0.2; // 20% chance to spawn a strong alien
      const isSpecialEntity = Math.random() < 0.05; // 5% chance to spawn a special entity
      if (isSpecialEntity) {
        setSpecialEntities((prevEntities) => [
          ...prevEntities,
          {
            id: Date.now(),
            left: Math.random() * 90,
            top: 0,
            speed: 0.2,
          },
        ]);
      } else {
        setAliens((prevAliens) => [
          ...prevAliens,
          {
            id: Date.now(),
            left: Math.random() * 90,
            top: 0,
            speed: isStrongAlien ? 0.5 : 0.1, // Strong alien is slower
            type: isStrongAlien ? 'strong' : 'normal',
            hits: isStrongAlien ? 3 : 2, // Strong alien takes 3 hits, normal takes 2 hits
            flash: false, // Flash effect
          },
        ]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Aliens and special entities movement effect
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setAliens((prevAliens) =>
        prevAliens.map((alien) => ({
          ...alien,
          top: alien.top + alien.speed,
        }))
      );
      setSpecialEntities((prevEntities) =>
        prevEntities.map((entity) => ({
          ...entity,
          top: entity.top + entity.speed,
        }))
      );
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Bullets movement effect
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setBullets((prevBullets) =>
        prevBullets.map((bullet) => ({
          ...bullet,
          top: bullet.top - 5,
        }))
      );
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Keyboard controls effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!gameOver) {
        if (event.key === 'ArrowLeft' || event.key === 'a') {
          setSpaceshipPosition((prev) => Math.max(prev - 2, 0)); // Smooth left movement
        }
        if (event.key === 'ArrowRight' || event.key === 'd') {
          setSpaceshipPosition((prev) => Math.min(prev + 2, 90)); // Smooth right movement
        }
        if (event.key === ' ' && !reloading) {
          if (shotsLeft > 0) {
            setBullets((prevBullets) => [
              ...prevBullets,
              { id: Date.now(), left: spaceshipPosition + 0.5, top: 80 }, // Align bullet with spaceship
            ]);
            setShotsLeft((prevShots) => prevShots - 1);
          } else {
            setReloading(true);
            setTimeout(() => {
              setShotsLeft(5);
              setReloading(false);
            }, 2000);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, spaceshipPosition, shotsLeft, reloading]);

  // Collision detection effect
  useEffect(() => {
    const updateAliens = () => {
      setAliens((prevAliens) => prevAliens.filter((alien) => alien.top < 100));
      setBullets((prevBullets) => prevBullets.filter((bullet) => bullet.top > 0));
      setSpecialEntities((prevEntities) => prevEntities.filter((entity) => entity.top < 100));

      aliens.forEach((alien) => {
        bullets.forEach((bullet) => {
          if (
            Math.abs(alien.top - bullet.top) < 10 && // Increased hitbox size
            Math.abs(alien.left - bullet.left) < 10 // Increased hitbox size
          ) {
            setAliens((prevAliens) =>
              prevAliens.map((a) =>
                a.id === alien.id ? { ...a, flash: true } : a
              )
            );
            setTimeout(() => {
              setAliens((prevAliens) =>
                prevAliens.map((a) =>
                  a.id === alien.id ? { ...a, flash: false } : a
                )
              );
            }, 100);
            if (alien.hits === 1) {
              setAliens((prevAliens) => prevAliens.filter((a) => a.id !== alien.id));
            } else {
              setAliens((prevAliens) =>
                prevAliens.map((a) =>
                  a.id === alien.id ? { ...a, hits: a.hits - 1 } : a
                )
              );
            }
            setBullets((prevBullets) => prevBullets.filter((b) => b.id !== bullet.id));
          }
        });

        if (alien.top >= 90) {
          setGameOver(true);
        }
      });

      specialEntities.forEach((entity) => {
        bullets.forEach((bullet) => {
          if (
            Math.abs(entity.top - bullet.top) < 10 && // Increased hitbox size
            Math.abs(entity.left - bullet.left) < 10 // Increased hitbox size
          ) {
            setAliens([]);
            setSpecialEntities((prevEntities) => prevEntities.filter((e) => e.id !== entity.id));
            setBullets((prevBullets) => prevBullets.filter((b) => b.id !== bullet.id));
          }
        });

        if (entity.top >= 90) {
          setSpecialEntities((prevEntities) => prevEntities.filter((e) => e.id !== entity.id));
        }
      });
    };

    const interval = setInterval(updateAliens, 100);
    return () => clearInterval(interval);
  }, [aliens, bullets, specialEntities]);

  return (
    <div className="alien-shooter">
      <div className="ammo">Shots Left: {shotsLeft}</div>
      <div className="timer">Time Left: {timeLeft}s</div>
      <div className="game-area">
        {aliens.map((alien) => (
          <div
            key={alien.id}
            className={`${alien.type === 'strong' ? 'strong-alien' : 'normal-alien'} ${alien.flash ? 'flash' : ''}`}
            style={{ left: `${alien.left}%`, top: `${alien.top}%`, opacity: alien.flash ? 0.5 : 1 }}
          >
            <img src={alien.type === 'strong' ? '/strong-alien.png' : '/normal-alien.png'} alt="Alien" />
          </div>
        ))}
        {specialEntities.map((entity) => (
          <div
            key={entity.id}
            className="special-entity"
            style={{ left: `${entity.left}%`, top: `${entity.top}%` }}
          >
            <img src="/barrel.png" alt="Special Entity" />
          </div>
        ))}
        {bullets.map((bullet) => (
          <div key={bullet.id} className="bullet" style={{ left: `${bullet.left}%`, top: `${bullet.top}%` }} />
        ))}
        <div className="spaceship" style={{ left: `${spaceshipPosition}%` }}>
          <img src="/turtle.png" alt="Spaceship" />
        </div>
        {reloading && <div className="reloading">Reloading...</div>}
      </div>
      {gameOver && (
        <div>
          <div className="game-over">Game Over</div>
          <button onClick={restartGame} className="restart-button">Restart</button>
        </div>
      )}
    </div>
  );
};

export default AlienShooter;
