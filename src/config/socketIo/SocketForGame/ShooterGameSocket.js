module.exports = (io, roomNum) => {
    const shooterNamespace = io.of(`/nws/shooter/${roomNum}`);

    shooterNamespace.on('connection', (socket) => {
        console.log('Conntections to platformer game');

        // Join Game Action
        socket.on('joinRoom', ({ room_num }) => {
            socket.join(room_num);
            console.log(`User joined room: ${room_num} for shooter game`);
        });

        // Disconnect Action
        socket.on('disconnect', () => {
            console.log('User disconnected from shooter game');
        });
    });
}