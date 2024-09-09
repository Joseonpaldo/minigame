module.exports = (io) => {
    const shooterNamespace = io.of('/platformer');

    shooterNamespace.on('connection', (socket) => {
        console.log('Conntections to platformer game');

        // Join Game Action
        socket.on('joinRoom', ({ roomNum }) => {
            socket.join(roomNum);
            console.log(`User joined room: ${roomNum} for platfornmer game`);

            socket.to(roomNum).emit('msg', `Player joined room: ${roomNum}`);
        });

        // Disconnect Action
        socket.on('disconnect', () => {
            console.log('User disconnected from platformer game');
        });
    });
}