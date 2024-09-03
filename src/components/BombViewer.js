import React, { useState, useEffect } from 'react';

const BombViewer = ({ socket }) => {
    const [status, setStatus] = useState('active');
    const [defuseWire, setDefuseWire] = useState('');

    useEffect(() => {
        socket.on('bombStatusUpdate', (newStatus) => {
            setStatus(newStatus);
        });

        socket.on('defuseWire', (wire) => {
            setDefuseWire(wire);
        });

        return () => {
            socket.off('bombStatusUpdate');
            socket.off('defuseWire');
        };
    }, [socket]);

    return (
        <div className="bomb-viewer-container">
            <h1>Bomb Status: {status}</h1>
            {status !== 'active' && <p>The defuse wire was: {defuseWire}</p>}
            <div className="bomb">
                {status === 'exploded' ? (
                    <img src={process.env.PUBLIC_URL + '/explosion.png'} alt="Explosion" className="explosion-image" />
                ) : (
                    <img src={process.env.PUBLIC_URL + '/bomb.png'} alt="Bomb" className="bomb-image" />
                )}
            </div>
        </div>
    );
};

export default BombViewer;
