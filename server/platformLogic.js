// Game constants
const GRAVITY = 0.2;
const JUMP_STRENGTH = 6;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 40;
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const BALL_SIZE = 50;
const BALL_MOVE_AMOUNT = 2.5;
const KNOCKBACK = 50;
const ROCKET_SPEED = 2.4;
const ROCKET_SPAWN_INTERVAL = 5000;
const IMMUNITY_DURATION = 1000;  // Immunity duration in milliseconds
const BOUNCE_HEIGHT = 2;  // Factor to increase the bounce height

// Initialize game state
const initGameState = () => ({
    player: {
        x: 0,
        y: 600,
        velY: 0,
        isJumping: false,
        direction: 0,
        isWalking: false,
        onLadder: false,  // Indicates if the player is currently climbing
        isImmune: false,
        isFlashing: false,
        immunityStartTime: 0,  // Track when immunity started
    },
    platforms: [
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
    ],
    ladders: [
        { x: 1000, y: 500, height: 200 },
        { x: 0, y: 300, height: 200 },
    ],
    rockets: [],
    balls: [
        { x: 850, y: 150, initialY: 650, velY: -1.5 },
        { x: 400, y: 100, initialY: 450, velY: -1.5 },
        { x: 400, y: 100, initialY: 250, velY: -1.5 },
        { x: 800, y: 100, initialY: 250, velY: -1.0 },
    ],
    portal: { x: 1100, y: 200, width: 10, height: 60 },
    timeLeft: 60,
    isGameOver: false,
    winState: false, // Added win state
});

// Update rocket positions
const updateRockets = (rockets) => {
    return rockets.map((rocket) => ({
        ...rocket,
        x: rocket.direction === 'left' ? rocket.x - ROCKET_SPEED : rocket.x + ROCKET_SPEED,
    })).filter(rocket => rocket.x > 0 && rocket.x < GAME_WIDTH);
};

// Handle player movement, jumping, and collision detection
const handlePlayerMovement = (player, input, ladders, platforms) => {
    let { x, y, velY, isJumping, direction, onLadder } = player;

    // Only apply movement input if the player is not flashing (immune)
    if (!player.isFlashing) {
        switch (input) {
            case 'ArrowLeft':
                direction = -1;
                x -= 10;  // Move left
                break;
            case 'ArrowRight':
                direction = 1;
                x += 10;  // Move right
                break;
            case ' ':
                if (!isJumping) {
                    velY = -JUMP_STRENGTH;  // Jump
                    isJumping = true;
                }
                break;
            case 'g':  // Climb ladders using the 'g' key
                ladders.forEach(ladder => {
                    if (x + PLAYER_WIDTH > ladder.x && x < ladder.x + 20 && y + PLAYER_HEIGHT > ladder.y && y < ladder.y + ladder.height - 20) {
                        // Teleport player to the top of the ladder
                        y = ladder.y - PLAYER_HEIGHT;
                        isJumping = false;  // Ensure player can jump after climbing
                        onLadder = true;
                    }
                });
                break;
            default:
                break;
        }
    }

    // Apply gravity if not climbing a ladder
    velY += GRAVITY;
    y += velY;

    // Allow horizontal movement during jumping
    if (isJumping) {
        x = player.x + 2 * player.direction;
    }

    // Check for collisions with platforms
    let isOnPlatform = false;
    platforms.forEach(platform => {
        if (y + PLAYER_HEIGHT > platform.y && y <= platform.y && x + PLAYER_WIDTH > platform.x && x < platform.x + platform.width) {
            y = platform.y - PLAYER_HEIGHT;
            velY = 0;
            isJumping = false;  // Player lands on the platform
            isOnPlatform = true;
        }
    });

    // Ensure the player doesn't fall out of the game area
    if (y + PLAYER_HEIGHT > GAME_HEIGHT) {
        player.isGameOver = true;
    }

    return { ...player, x, y, velY, isJumping, direction, onLadder, isOnPlatform };
};

// Main game update loop (server-side logic)
const gameUpdate = (gameState, input) => {
    // Handle player movement and update player state
    gameState.player = handlePlayerMovement(
        gameState.player,
        input,
        gameState.ladders,
        gameState.platforms
    );

    // Update rockets
    gameState.rockets = updateRockets(gameState.rockets);

    // Handle player knockback
    let { player, rockets, balls, portal } = gameState;
    let newX = player.x;
    let newY = player.y;
    let knockedBack = false;

    // Only apply knockback if the player is not immune
    if (!player.isImmune) {
        rockets.forEach((rocket) => {
            if (
                player.x < rocket.x + 20 &&
                player.x + PLAYER_WIDTH > rocket.x &&
                player.y < rocket.y + 20 &&
                player.y + PLAYER_HEIGHT > rocket.y
            ) {
                newX += rocket.direction === 'left' ? -KNOCKBACK : KNOCKBACK;
                knockedBack = true;
            }
        });

        balls.forEach((ball) => {
            if (
                player.x < ball.x + BALL_SIZE &&
                player.x + PLAYER_WIDTH > ball.x &&
                player.y < ball.y + BALL_SIZE &&
                player.y + PLAYER_HEIGHT > ball.y
            ) {
                newX += ball.velY > 0 ? KNOCKBACK : -KNOCKBACK;
                knockedBack = true;
            }
        });

        // Apply knockback and manage immunity
        if (knockedBack) {
            player = {
                ...player,
                isImmune: true,
                isFlashing: true,
                immunityStartTime: Date.now(),  // Track when immunity started
            };
        }
    }

    // Handle immunity duration
    if (player.isImmune && Date.now() - player.immunityStartTime > IMMUNITY_DURATION) {
        player = {
            ...player,
            isImmune: false,
            isFlashing: false,
        };
    }

    // Update player position after knockback
    player = { ...player, x: newX, y: newY };

    // Check portal collision
    if (
        player.x < portal.x + portal.width &&
        player.x + PLAYER_WIDTH > portal.x &&
        player.y < portal.y + portal.height &&
        player.y + PLAYER_HEIGHT > portal.y
    ) {
        gameState.isGameOver = true;
        gameState.winState = true;  // Player wins if they reach the portal
    }

    // Update game state
    gameState.player = player;

    return gameState;
};

// Function to start the game timer
const startTimer = (gameState, updateTimerCallback) => {
    const timerInterval = setInterval(() => {
        if (gameState.timeLeft > 0) {
            gameState.timeLeft -= 1;  // Decrease the timer
            updateTimerCallback(gameState.timeLeft);  // Send updated time to the client

            if (gameState.timeLeft <= 0) {
                gameState.isGameOver = true;  // End the game if the timer hits 0
                clearInterval(timerInterval);  // Stop the timer
            }
        }
    }, 1000);  // Decrease every second

    return timerInterval;  // Return the interval ID to be cleared if needed
};

// Spawn rockets at an interval
const spawnRockets = (gameState) => {
    const newRockets = [
        { x: GAME_WIDTH, y: 230, direction: 'left' },
        { x: GAME_WIDTH, y: 450, direction: 'left' },
        { x: GAME_WIDTH, y: 680, direction: 'left' },
    ];
    gameState.rockets = gameState.rockets.concat(newRockets);
};

// Update other game entities (balls, timer, etc.)
const updateGameEntities = (gameState) => {
    // Update ball movement
    const updatedBalls = gameState.balls.map((ball) => {
        let newY = ball.y + ball.velY;

        // Check if the ball hits the top or bottom bounds and reverse direction if so
        if (newY <= ball.initialY - BALL_SIZE * BOUNCE_HEIGHT || newY >= ball.initialY) {
            newY = Math.max(ball.initialY - BALL_SIZE * BOUNCE_HEIGHT, Math.min(newY, ball.initialY));
            return { ...ball, y: newY, velY: -ball.velY };
        }

        return { ...ball, y: newY };
    });

    // Update game state
    return {
        ...gameState,
        balls: updatedBalls,
    };
};

module.exports = {
    initGameState,
    startTimer,  // Export startTimer so it can be called independently
    gameUpdate,
    spawnRockets,
    updateGameEntities,
};
