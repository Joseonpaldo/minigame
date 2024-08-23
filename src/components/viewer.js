import React, { useState, useEffect } from 'react';
import './Game.css';

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const BALL_SIZE = 50;
const ZOOM_LEVEL = 2;

const Viewer = ({ socket }) => {
    const [player, setPlayer] = useState(null);
    const [rockets, setRockets] = useState([]);
    const [balls, setBalls] = useState([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [platforms, setPlatforms] = useState([]);
    const [ladders, setLadders] = useState([]);
    const [portal, setPortal] = useState(null);

    useEffect(() => {
        socket.emit('requestInitialGameState');

        socket.on('initialGameState', (gameState) => {
            setPlayer(gameState.player);
            setPlatforms(gameState.platforms);
            setLadders(gameState.ladders);
            setBalls(gameState.balls);
            setRockets(gameState.rockets);
            setPortal(gameState.portal);
            setTimeLeft(gameState.timeLeft || null);
            setIsGameOver(gameState.isGameOver);
            setGameStarted(true);
        });

        socket.on('playerPosition', (newPlayerState) => {
            setPlayer(newPlayerState);
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
            socket.off('playerPosition');
            socket.off('updateRockets');
            socket.off('updateBalls');
            socket.off('updateTimer');
            socket.off('gameOver');
        };
    }, [socket]);

    useEffect(() => {
        if (!gameStarted) return;

        let animationFrameId;

        const gameInterval = () => {
            if (player) {
                // Check if player falls off the screen
                if (player.y + PLAYER_HEIGHT > GAME_HEIGHT) {
                    setIsGameOver(true);
                    socket.emit('gameOver', true);
                }

                // Check if player reaches the portal
                if (
                    player.x < portal.x + portal.width &&
                    player.x + PLAYER_WIDTH > portal.x &&
                    player.y < portal.y + portal.height &&
                    player.y + PLAYER_HEIGHT > portal.y
                ) {
                    setIsGameOver(true);
                    socket.emit('gameOver', true);
                    alert('You Win!');
                }
            }

            animationFrameId = requestAnimationFrame(gameInterval);
        };

        gameInterval();

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameStarted, player, portal, socket]);

    const gameContainerStyle = {
        transform: `scale(${ZOOM_LEVEL})`,
        transformOrigin: `${player?.x + PLAYER_WIDTH / 2}px ${player?.y + PLAYER_HEIGHT / 2}px`,
        transition: 'transform 0.1s ease-out',
    };

    if (isGameOver) {
        return <div className="game-over">Game Over</div>;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="game" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
                    <div className="timer">Time Left: {timeLeft}</div>
                    <div className="viewport" style={gameContainerStyle}>
                        {player && (
                            <div
                                className={`player ${player.isFlashing ? 'flashing' : ''} ${player.isWalking ? 'moving' : 'still'} ${player.direction === -1 ? 'left' : 'right'}`}
                                style={{ left: player.x, top: player.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}
                            />
                        )}
                        {rockets.map((rocket, index) => (
                            <div key={index} className="rocket" style={{ left: rocket.x, top: rocket.y }} />
                        ))}
                        {platforms.map((platform, index) => (
                            <div key={index} className="platform" style={{ left: platform.x, top: platform.y, width: platform.width, height: platform.height }} />
                        ))}
                        {ladders.map((ladder, index) => (
                            <div key={index} className="ladder" style={{ left: ladder.x, top: ladder.y, height: ladder.height }} />
                        ))}
                        {portal && (
                            <div className="portal" style={{ left: portal.x, top: portal.y, width: portal.width, height: portal.height }} />
                        )}
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
