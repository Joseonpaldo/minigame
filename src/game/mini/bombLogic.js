// Bomb game logic (host and viewer sync)
const startBombGame = (currentSession, socket, role) => {
    if(role === 'host') {
        currentSession.host = socket;
    }

    // Add the player to the room
    currentSession.players.push(socket);
    socket.join(currentSession.id);
};

module.exports = {
    startBombGame
};