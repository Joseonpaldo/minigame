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
}

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
}

module.exports = {
    startRPSGame
};