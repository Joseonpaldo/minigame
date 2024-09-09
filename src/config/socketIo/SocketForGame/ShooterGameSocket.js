module.exports = (io) => {
    const shooterNamespace = io.of('/shooter');

    shooterNamespace.on('connection', (socket) => {
        console.log('Conntections to shooter game');

        // Join Game Action
        socket.on('joinRoom', ({ roomNum }) => {
            socket.join(roomNum);
            console.log(`User joined room: ${roomNum} for shooter game`);

            socket.to(roomNum).emit('msg', `Player joined room: ${roomNum}`);
        });

        // Disconnect Action
        socket.on('disconnect', () => {
            console.log('User disconnected from shooter game');
        });
    });
}