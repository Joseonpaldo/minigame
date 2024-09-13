const timerLoop = {};

const rpsTimerLoop = (currentSession, io) => {
    timerLoop[currentSession.id] = setInterval(() => {
        if (currentSession.timeLeft < 0) {
            stopRpsTimerLoop(currentSession);
            currentSession.timeLeft = 3;
            currentSession.gameState.win = 2;
            currentSession.gameState.computerScore++;
            currentSession.gameState.round++;

            if(currentSession.gameState.round > 3) {
                currentSession.gameState.isGameOver = true;
            }else {
                rpsTimerLoop(currentSession, io);
            }

            io.to(currentSession.id).emit('rpsState', null, null, currentSession.gameState);
        } else {
            io.to(currentSession.id).emit('rpsTimeLeft', currentSession.timeLeft);
            currentSession.timeLeft -= 1 / 60;
        }
    }, 1000 / 60);
};

const stopRpsTimerLoop = (currentSession) => {
    clearInterval(timerLoop[currentSession.id]);
}; 

// Rock Paper Scissors (RPS) game logic
const startRPSGame = (currentSession, socket) => {
    // Host setup
    if (!currentSession.host) {
        currentSession.host = socket;
    }

    // Add the player to the room
    currentSession.players.push(socket);
    socket.join(currentSession.id);
};

const getComputerChoice = () => {
    const choices = ['바위', '보', '가위'];
    const randomIndex = Math.floor(Math.random() * 3);

    return choices[randomIndex];
};

// 1 for win 2 for lose 0 for draw
const checkWinner = (playerChoice, computerChoice) => {
    if (playerChoice === computerChoice) {
        return 0;
    }

    if (
        (playerChoice === '바위' && computerChoice === '가위') ||
        (playerChoice === '가위' && computerChoice === '보') ||
        (playerChoice === '보' && computerChoice === '바위')
    ) {
        return 1;
    }

    return 2;
};

module.exports = {
    startRPSGame,
    getComputerChoice,
    checkWinner,
    rpsTimerLoop,
    stopRpsTimerLoop
};