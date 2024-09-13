// Bomb game logic (host and viewer sync)
const startBombGame = (sessionKey, socket, role) => {
    // Initialize the session if it doesn't exist
    if (!gameSessions[sessionKey]) {
        gameSessions[sessionKey] = {
            id: sessionKey,
            players: [],
            host: null,
            bombState: { status: 'active', defuseWire: Math.random() < 0.5 ? 'blue' : 'red' },  // Initialize bombState here
        };
    }

    if(role === 'host') {
        gameSessions[sessionKey].host = socket;
    }

    // Add the player to the room
    gameSessions[sessionKey].players.push(socket);
    socket.join(currentSession.id);
};

module.exports = {
    startBombGame
};