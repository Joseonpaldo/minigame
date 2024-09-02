import React, { useState, useEffect } from 'react';
import Wire from './Wire';


const Bomb = () => {
    const [status, setStatus] = useState('active');
    const [defuseWire, setDefuseWire] = useState('');

    useEffect(() => {
        // Randomly choose a wire to be the defuse wire
        const randomWire = Math.random() < 0.5 ? 'blue' : 'red';
        setDefuseWire(randomWire);
    }, []);

    const handleCutWire = (color) => {
        if (color === defuseWire) {
            setStatus('defused');
        } else {
            setStatus('exploded');
        }
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