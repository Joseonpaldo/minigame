module.exports = (io, roomNum) => {
    const platformerNamespace = io.of(`/nws/platformer/${roomNum}`);

    platformerNamespace.on('connection', (socket) => {
        console.log('Conntections to platformer game');

        // Join Game Action
        socket.on('joinRoom', ({ room_num }) => {
            socket.join(room_num);
            console.log(`User joined room: ${room_num} for shooter game`);
        });

        // Disconnect Action
        socket.on('disconnect', () => {
            console.log('User disconnected from platformer game');
        });
    });
}