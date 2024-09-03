import React, { useState, useEffect } from 'react';
import Wire from './Wire';

const Bomb = ({ socket }) => {
    const [status, setStatus] = useState('active');
    const [defuseWire, setDefuseWire] = useState('');

    useEffect(() => {
        const randomWire = Math.random() < 0.5 ? 'blue' : 'red';
        setDefuseWire(randomWire);
        socket.emit('setDefuseWire', randomWire); // Send the defuse wire to the server
    }, [socket]);

    const handleCutWire = (color) => {
        const newStatus = color === defuseWire ? 'defused' : 'exploded';
        setStatus(newStatus);
        socket.emit('bombStatus', newStatus); // Send the bomb status to the server
    };

    return (
        <div className="bomb-container">
            <h1>Bomb Status: {status}</h1>
            <div className="bomb">
                {status === 'exploded' ? (
                    <img src={process.env.PUBLIC_URL + '/explosion.png'} alt="Explosion" className="explosion-image" />
                ) : (
                    <img src={process.env.PUBLIC_URL + '/bomb.png'} alt="Bomb" className="bomb-image" />
                )}
                {status === 'active' && (
                    <div className="wires">
                        <Wire color="blue" onCut={handleCutWire} />
                        <Wire color="red" onCut={handleCutWire} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bomb;
