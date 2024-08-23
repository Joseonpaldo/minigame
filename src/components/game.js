import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Game.css';

const GRAVITY = 0.003;
const JUMP_STRENGTH = 0.6;
const KNOCKBACK = 50;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const BALL_SIZE = 50;
const BALL_JUMP_HEIGHT = 150;
const ZOOM_LEVEL = 2;

const Game = ({ socket }) => {
    const [player, setPlayer] = useState({
        x: 0,
        y: 600,
        velY: 0,
        isJumping: false,
        onLadder: false,
        direction: 0,
        isImmune: false,
        isFlashing: false,
        isWalking: false,
    });
    const [rockets, setRockets] = useState([]);
    const [balls, setBalls] = useState([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [platforms, setPlatforms] = useState([]);
    const [ladders, setLadders] = useState([]);
    const [portal, setPortal] = useState(null);
    const startGame = () => {
        setGameStarted(true);
        socket.emit('startGame');
        console.log('startgame');  // Trigger the game start on the server
      };

    // Fetch map, balls, and rockets data from the server
    useEffect(() => {
        socket.emit('requestInitialGameState');

        socket.on('initialGameState', (gameState) => {
            setPlatforms(gameState.platforms);
            setLadders(gameState.ladders);
            setBalls(gameState.balls);
            setRockets(gameState.rockets);
            setPortal(gameState.portal);
            setTimeLeft(gameState.timeLeft || 60);
            setIsGameOver(gameState.isGameOver);
        });

        

        socket.on('updateRockets', (newRockets) => {
            setRockets(newRockets);
        });

        socket.on('updateBalls', (newBalls) => {
            setBalls(newBalls);
        });

        socket.on('updateTimer', (newTime) => {
            setTimeLeft(newTime);
        });

        socket.on('gameOver', (gameOverState) => {
            setIsGameOver(gameOverState);
        });

        return () => {
            socket.off('initialGameState');
            socket.off('updateRockets');
            socket.off('updateBalls');
            socket.off('updateTimer');
            socket.off('gameOver');
        };
    }, [socket]);

    const handleKeyDown = useCallback((e) => {
        e.preventDefault();
        setPlayer((prev) => {
            if (!prev || prev.isImmune) return prev;

            let isWalking = false;

            switch (e.key) {
                case 'ArrowLeft':
                    isWalking = true;
                    const newPosLeft = { ...prev, x: prev.x - 10, direction: -1, isWalking };
                    socket.emit('playerPosition', newPosLeft);
                    return newPosLeft;
                case 'ArrowRight':
                    isWalking = true;
                    const newPosRight = { ...prev, x: prev.x + 10, direction: 1, isWalking };
                    socket.emit('playerPosition', newPosRight);
                    return newPosRight;
                case ' ':
                    if (!prev.isJumping) {
                        const jumpPos = { ...prev, velY: -JUMP_STRENGTH, isJumping: true };
                        socket.emit('playerPosition', jumpPos);
                        return jumpPos;
                    }
                    return prev;
                case 'g': // Handle ladder interaction with the 'g' key
                    if (prev.onLadder) {
                        let targetY;
                        ladders.forEach((ladder) => {
                            if (
                                prev.x + PLAYER_WIDTH > ladder.x &&
                                prev.x < ladder.x + 20 &&
                                prev.y + PLAYER_HEIGHT > ladder.y &&
                                prev.y < ladder.y + ladder.height
                            ) {
                                targetY = ladder.y - PLAYER_HEIGHT;
                            }
                        });
                        if (targetY !== undefined) {
                            const ladderPos = { ...prev, y: targetY, velY: 0, onLadder: false };
                            socket.emit('playerPosition', ladderPos);
                            return ladderPos;
                        }
                    }
                    return prev;
                default:
                    return prev;
            }
        });
    }, [socket, ladders]);

    const handleKeyUp = useCallback((e) => {
        e.preventDefault();
        setPlayer((prev) => {
            if (!prev) return prev;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const stopWalkingPos = { ...prev, isWalking: false };
                socket.emit('playerPosition', stopWalkingPos);
                return stopWalkingPos;
            }
            return prev;
        });
    }, [socket]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    useEffect(() => {
        const handleShootRocket = () => {
            const newRockets = [
                { x: GAME_WIDTH, y: 230, direction: 'left' },
                { x: 0, y: 260, direction: 'right' },
                { x: 0, y: 390, direction: 'right' },
                { x: GAME_WIDTH, y: 450, direction: 'left' },
                { x: GAME_WIDTH, y: 680, direction: 'left' },
                { x: 0, y: 600, direction: 'right' }
            ];
            setRockets(prev => [...prev, ...newRockets]);
        };
    
        socket.on('shoot', handleShootRocket);
    
        return () => {
            socket.off('shoot', handleShootRocket);
        };
    }, [socket]);

    useEffect(() => {
        if (!gameStarted) return;
        let animationFrameId;

        const gameInterval = () => {
            setPlayer((prev) => {
                if (!prev) return prev;

                let newY = prev.y + prev.velY;
                let newVelY = prev.velY + GRAVITY;
                let isJumping = prev.isJumping;

                let newX = prev.x;
                if (prev.isJumping) {
                    newX = prev.x + 0.3 * prev.direction;
                }

                let isOnPlatform = false;
                platforms.forEach((platform) => {
                    if (
                        newY + PLAYER_HEIGHT > platform.y &&
                        prev.y + PLAYER_HEIGHT <= platform.y &&
                        newX + PLAYER_WIDTH > platform.x &&
                        newX < platform.x + platform.width
                    ) {
                        newY = platform.y - PLAYER_HEIGHT;
                        newVelY = 0;
                        isJumping = false;
                        isOnPlatform = true;
                    }
                });

                if (newY + PLAYER_HEIGHT > GAME_HEIGHT) {
                    setIsGameOver(true);
                    socket.emit('gameOver', true);
                }

                let onLadder = false;
                ladders.forEach((ladder) => {
                    if (
                        prev.x + PLAYER_WIDTH > ladder.x &&
                        prev.x < ladder.x + 20 &&
                        prev.y + PLAYER_HEIGHT > ladder.y &&
                        prev.y < ladder.y + ladder.height
                    ) {
                        onLadder = true;
                    }
                });

                const updatedPlayer = {
                    ...prev,
                    x: newX,
                    y: newY,
                    velY: newVelY,
                    isJumping,
                    onLadder,
                    isOnPlatform,
                    isWalking: false
                };

                socket.emit('playerPosition', updatedPlayer);

                return updatedPlayer;
            });

            setRockets((prev) => prev.map((rocket) => ({
                ...rocket,
                x: rocket.x + (rocket.direction === 'left' ? -0.3 : 0.3),
            })).filter(rocket => rocket.x > 0 && rocket.x < GAME_WIDTH));

            setPlayer((prev) => {
                if (!prev || prev.isImmune) return prev;

                let newX = prev.x;
                let newY = prev.y;
                let knockedBack = false;

                rockets.forEach((rocket) => {
                    if (
                        prev.x < rocket.x + 20 &&
                        prev.x + PLAYER_WIDTH > rocket.x &&
                        prev.y < rocket.y + 20 &&
                        prev.y + PLAYER_HEIGHT > rocket.y
                    ) {
                        newX += rocket.direction === 'left' ? -KNOCKBACK : KNOCKBACK;
                        knockedBack = true;
                    }
                });

                balls.forEach((ball) => {
                    if (
                        prev.x < ball.x + BALL_SIZE &&
                        prev.x + PLAYER_WIDTH > ball.x &&
                        prev.y < ball.y + BALL_SIZE &&
                        prev.y + PLAYER_HEIGHT > ball.y
                    ) {
                        newX += ball.velY > 0 ? KNOCKBACK : -KNOCKBACK;
                        knockedBack = true;
                    }
                });

                if (knockedBack) {
                    setPlayer(prev => ({
                        ...prev,
                        isImmune: true,
                        isFlashing: true,
                        velY: 0,
                    }));

                    setTimeout(() => {
                        setPlayer(prev => ({
                            ...prev,
                            isImmune: false,
                            isFlashing: false,
                        }));
                    }, 1000);
                }

                return { ...prev, x: newX, y: newY };
            });

            setPlayer((prev) => {
                if (!prev) return prev;
                if (
                    prev.x < portal.x + portal.width &&
                    prev.x + PLAYER_WIDTH > portal.x &&
                    prev.y < portal.y + portal.height &&
                    prev.y + PLAYER_HEIGHT > portal.y
                ) {
                    setIsGameOver(true);
                    socket.emit('gameOver', true);
                    alert('You Win!');
                }
                return prev;
            });

            animationFrameId = requestAnimationFrame(gameInterval);
        };

        gameInterval();

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameStarted, rockets, platforms, portal, ladders, balls, player, socket]);

    const gameContainerStyle = {
        transform: `scale(${ZOOM_LEVEL})`,
        transformOrigin: `${player.x + PLAYER_WIDTH / 2}px ${player.y + PLAYER_HEIGHT / 2}px`,
        transition: 'transform 0.1s ease-out',
    };

    if (isGameOver) {
        return <div className="game-over">Game Over</div>;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-button" onClick={() => setGameStarted(false)}>X</button>
                <div className="game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
                    <div className="timer">Time Left: {timeLeft}</div>
                    {!gameStarted && (
    <button
        onClick={() => {
            setGameStarted(true);
            startGame(); // This will start the timer and the game logic
        }}
        style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100%",
            border: "white",
            background: "none",
            cursor: "pointer",
            color: "red"
        }}
    >
        Start Game
    </button>
)}

                    {gameStarted && (
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
                                <div key={index} className="ball" style={{ left: ball.x, top: ball.y, width: BALL_SIZE, height: BALL_SIZE }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Game;
