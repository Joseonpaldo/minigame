import React, { useState, useEffect, useRef, useCallback } from 'react';
import './css/Game.css';

const GRAVITY = 0.2;
const JUMP_STRENGTH = 6;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const ZOOM_LEVEL = 2;

const Game = ({ socket, gameType }) => {
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
    
    const [timeLeft, setTimeLeft] = useState(60);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [role, setRole] = useState(null);

    const [platforms] = useState([
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
    ]);

    const [ladders] = useState([
        { x: 1000, y: 500, height: 200 },
        { x: 0, y: 300, height: 200 },
    ]);

    const [portal] = useState({ x: 1110, y: 200, width: 10, height: 60 });

    const gameRef = useRef(null);

    const handleKeyDown = useCallback((e) => {
        e.preventDefault();
        setPlayer((prev) => {
            if (!prev || prev.isImmune) return prev;

            let isWalking = false;

            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                    return prev;
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
                        const jumpPos = { ...prev, velY: -JUMP_STRENGTH, isJumping: true, isWalking };
                        socket.emit('playerPosition', jumpPos);
                        return jumpPos;
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
                                targetY = ladder.y - PLAYER_HEIGHT;
                            }
                        });
                        if (targetY !== undefined) {
                            const ladderPos = { ...prev, y: targetY, velY: 0, onLadder: false };
                            socket.emit('playerPosition', ladderPos);
                            return ladderPos;
                        }
                    }
                    break;
                default:
                    return prev;
            }
            return { ...prev, isWalking };
        });
    }, [ladders, socket]);

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
        socket.emit('joinGame', gameType);

        socket.on('role', (assignedRole) => {
            setRole(assignedRole);
            if (assignedRole === 'host') {
                socket.emit('setInitialGameState', {
                    player,
                    timeLeft,
                    isGameOver
                });
            }
        });

        socket.on('initialGameState', (initialState) => {
            setPlayer(initialState.player || {});
            setTimeLeft(initialState.timeLeft || 60);
            setIsGameOver(initialState.isGameOver || false);
        });

        // Update timer based on server-sent time
        socket.on('updateTimer', (newTime) => {
            setTimeLeft(newTime);
        });

    }, [isGameOver,role, gameType, socket]);

    useEffect(() => {
        const gameInterval = setInterval(() => {
            // Update player, platform, and other game logic here as needed...
            setPlayer((prev) => {
                if (!prev) return prev;

                let newY = prev.y + prev.velY;
                let newVelY = prev.velY + GRAVITY;
                let isJumping = prev.isJumping;

                let newX = prev.x;
                if (prev.isJumping) {
                    newX = prev.x + 2 * prev.direction;
                }

                // Collision with platforms
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
                }

                // Collision with ladders
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

        }, 1000 / 144);

        return () => clearInterval(gameInterval);
    }, [gameStarted, platforms, portal, ladders, player, socket]);

    useEffect(() => {
        if (timeLeft === 0) {
            setIsGameOver(true);
            alert('Game Over!');
        }
    }, [timeLeft]);

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
                <div className="game" ref={gameRef} style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
                    <div className="timer">Time Left: {timeLeft}</div>
                    {!gameStarted && (
                        <button 
                            onClick={() => setGameStarted(true)}
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
                            {platforms.map((platform, index) => (
                                <div key={index} className="platform" style={{ left: platform.x, top: platform.y, width: platform.width, height: platform.height }} />
                            ))}
                            {ladders.map((ladder, index) => (
                                <div key={index} className="ladder" style={{ left: ladder.x, top: ladder.y, height: ladder.height }} />
                            ))}
                            <div className="portal" style={{ left: portal.x, top: portal.y, width: portal.width, height: portal.height }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Game;
