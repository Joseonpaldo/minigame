import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Game.css'; // Include your CSS for styling

const GRAVITY = 0.2;
const JUMP_STRENGTH = 6;
const KNOCKBACK = 30;
const PLAYER_WIDTH = 40; // Adjusted player width
const PLAYER_HEIGHT = 40; // Adjusted player height
const GAME_WIDTH = 1200;  // Example game width
const GAME_HEIGHT = 800; // Example game height
const BALL_SIZE = 50; // Size of the bouncing ball
const BALL_JUMP_HEIGHT = 100; // Ball jump height
const ZOOM_LEVEL = 2; // Zoom level

const Game = ({ socket, gameType }) => {
    const [player, setPlayer] = useState({
        x: 0, // Character spawn location X
        y: 600, // Character spawn location Y
        velY: 0, // Initial vertical velocity
        isJumping: false,
        onLadder: false,
        direction: 0,
        isImmune: false,
        isFlashing: false,
        isWalking: false,
    });
    const [rockets, setRockets] = useState([]);
    const [balls, setBalls] = useState([
        { x: 850, y: 650, initialY: 650, velY: -1 }, // Ball 1
        { x: 400, y: 450, initialY: 450, velY: -1 }, // Ball 2
        { x: 400, y: 250, initialY: 250, velY: -0.8 }, // Ball 3
        { x: 800, y: 250, initialY: 250, velY: -1 }, // Ball 4
        { x: 600, y: 250, initialY: 250, velY: -0.5 }, // Ball 5
    ]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [role, setRole] = useState(null);

    const [platforms] = useState([
        //1층
        { x: 0, y: 700, width: 300, height: 20 },
        { x: 400, y: 700, width: 300, height: 20 },
        { x: 800, y: 700, width: 300, height: 20 },
        //2층
        { x: 0, y: 500, width: 100, height: 20 },
        { x: 150, y: 500, width: 70, height: 20 },
        { x: 300, y: 500, width: 200, height: 20 },
        { x: 400, y: 500, width: 100, height: 20 },
        { x: 600, y: 500, width: 100, height: 20 },
        { x: 800, y: 500, width: 100, height: 20 },
        { x: 1000, y: 500, width: 100, height: 20 },
        //3층
        { x: 0, y: 300, width: 100, height: 20 },
        { x: 170, y: 300, width: 100, height: 20 },
        { x: 350, y: 300, width: 130, height: 20 },
        { x: 400, y: 300, width: 50, height: 20 },
        { x: 600, y: 300, width: 100, height: 20 },
        { x: 800, y: 300, width: 50, height: 20 },
        { x: 900, y: 280, width: 50, height: 20 },
        { x: 1000, y: 250, width: 100, height: 20 },
        // Add more platforms as needed
    ]);
    const [ladders] = useState([
        { x: 1000, y: 500, height: 200 },
        { x: 0, y: 300, height: 200 },
        // Add more ladders as needed
    ]);
    const [portal] = useState({ x: 1110, y: 200, width: 10, height: 60 });

    const gameRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        e.preventDefault(); // Prevent the default action to stop the whole screen from scrolling
        setPlayer((prev) => {
            if (!prev || prev.isImmune) return prev; // Ensure prev is defined and not immune

            let isWalking = false;

            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                    return prev; // Block up and down arrow keys
                case 'ArrowLeft':
                    isWalking = true;
                    return { ...prev, x: prev.x - 10, direction: -1, isWalking };
                case 'ArrowRight':
                    isWalking = true;
                    return { ...prev, x: prev.x + 10, direction: 1, isWalking };
                case ' ':
                    if (!prev.isJumping) {
                        return { ...prev, velY: -JUMP_STRENGTH, isJumping: true, isWalking };
                    }
                    break;
                case 'g':
                    if (prev.onLadder) {
                        let targetY;
                        ladders.forEach((ladder) => {
                            if (
                                prev.x + PLAYER_WIDTH > ladder.x &&
                                prev.x < ladder.x + 20 &&
                                prev.y + PLAYER_HEIGHT > ladder.y &&
                                prev.y < ladder.y + ladder.height
                            ) {
                                // Move the player to the top of the ladder
                                targetY = ladder.y - PLAYER_HEIGHT;
                            }
                        });
                        if (targetY !== undefined) {
                            return { ...prev, y: targetY, velY: 0, onLadder: false };
                        }
                    }
                    break;
                default:
                    return prev;
            }
            return { ...prev, isWalking };
        });
    }, [ladders]);

    const handleKeyUp = useCallback((e) => {
        e.preventDefault();
        setPlayer((prev) => {
            if (!prev) return prev; // Ensure prev is defined
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                return { ...prev, isWalking: false };
            }
            return prev;
        });
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    useEffect(() => {
        if (!gameStarted) return;

        // Timer interval
        const timerInterval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerInterval);
                    setIsGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [gameStarted]);

    useEffect(() => {
        if (!gameStarted) return;

        // Rocket shooting interval (every 5 seconds)
        const rocketInterval = setInterval(() => {
            setRockets((prev) => [
                ...prev,
                { x: GAME_WIDTH, y: 230, direction: 'left' },
                { x: 0, y: 260, direction: 'right' },
                { x: 0, y: 390, direction: 'right' },
                { x: GAME_WIDTH, y: 450, direction: 'left' },
                { x: GAME_WIDTH, y: 680, direction: 'left' },
                { x: 0, y: 600, direction: 'right' }
            ]);
        }, 5000); // Spawn rockets every 5 seconds

        return () => clearInterval(rocketInterval);
    }, [gameStarted]);

    useEffect(() => {
        if (!gameStarted) return;

        // Game logic interval (144 FPS)
        const gameInterval = setInterval(() => {
            // Gravity and jump mechanics
            setPlayer((prev) => {
                if (!prev) return prev; // Ensure prev is defined

                let newY = prev.y + prev.velY;
                let newVelY = prev.velY + GRAVITY;
                let isJumping = prev.isJumping;

                // Move the player forward if jumping
                let newX = prev.x;
                if (prev.isJumping) {
                    newX = prev.x + 1 * prev.direction;
                }

                // Collision detection with platforms
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

                // Kill player if they fall to the ground
                if (newY + PLAYER_HEIGHT > GAME_HEIGHT) {
                    setIsGameOver(true);
                }

                // Collision detection with ladders
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

                return { ...prev, x: newX, y: newY, velY: newVelY, isJumping, onLadder, isOnPlatform, isWalking: false };
            });

            // Move rockets
            setRockets((prev) => prev.map((rocket) => ({
                ...rocket,
                x: rocket.x + (rocket.direction === 'left' ? -3 : 3),
            })).filter(rocket => rocket.x > 0 && rocket.x < GAME_WIDTH));

            // Move balls
            setBalls((prevBalls) =>
                prevBalls.map((ball) => {
                    let newY = ball.y + ball.velY;
                    if (newY <= ball.initialY - BALL_JUMP_HEIGHT || newY >= ball.initialY) {
                        return { ...ball, y: newY, velY: -ball.velY };
                    }
                    return { ...ball, y: newY };
                })
            );

            // Check for collisions with rockets and balls
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

                // Check for collisions with balls
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

            // Check if player reaches the portal
            setPlayer((prev) => {
                if (!prev) return prev;
                if (
                    prev.x < portal.x + portal.width &&
                    prev.x + PLAYER_WIDTH > portal.x &&
                    prev.y < portal.y + portal.height &&
                    prev.y + PLAYER_HEIGHT > portal.y
                ) {
                    setIsGameOver(true);
                    alert('You Win!');
                }
                return prev;
            });

            // Send player position update if role is host
            if (role === 'host') {
                socket.emit('playerPosition', player);
            }

        }, 1000 / 144); // 144 FPS

        return () => clearInterval(gameInterval);
    }, [gameStarted, rockets, platforms, portal, ladders, balls, player, role,socket]);

    useEffect(() => {
        socket.emit('joinGame', gameType);

        socket.on('role', (assignedRole) => {
            setRole(assignedRole);
            if (assignedRole === 'host') {
                // Send initial game state to the server
                socket.emit('setInitialGameState', {
                    player,
                    rockets,
                    balls,
                    platforms,
                    ladders,
                    portal,
                    timeLeft,
                    isGameOver
                });
            }
        });

        socket.on('initialGameState', (initialState) => {
            setPlayer(initialState.player);
            setRockets(initialState.rockets);
            setBalls(initialState.balls);
            setTimeLeft(initialState.timeLeft);
            setIsGameOver(initialState.isGameOver);
        });

        socket.on('playerPosition', (newPlayerState) => {
            if (role !== 'host') {
                setPlayer(newPlayerState);
            }
        });

        socket.on('updatePlatformerGameState', (newGameState) => {
            if (role !== 'host') {
                setPlayer(newGameState.player);
                setRockets(newGameState.rockets);
                setBalls(newGameState.balls);
                setTimeLeft(newGameState.timeLeft);
                setIsGameOver(newGameState.isGameOver);
            }
        });
    }, [role, gameType,socket,balls,isGameOver,ladders,platforms,player,portal,rockets,timeLeft]);

    const gameContainerStyle = {
        transform: `scale(${ZOOM_LEVEL})`,
        transformOrigin: `${player.x + PLAYER_WIDTH / 2}px ${player.y + PLAYER_HEIGHT / 2}px`,
        transition: 'transform 0.1s ease-out', // Smooth transition for zoom
    };

    if (isGameOver) {
        return <div className="game-over">Game Over</div>;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-button" onClick={() => setGameStarted(false)}>X</button>
                <div className="game" ref={gameRef} style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
                    <div className="timer">Time Left: {timeLeft}</div>
                    {!gameStarted && (
                        <button onClick={() => setGameStarted(true)}>Start Game</button>
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
