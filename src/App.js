import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import AlienViewer from './components/AlienViewer';
import Viewer from './components/Viewer';
import AlienShooter from './components/AlienShooter';
import RockPaperScissors from './components/RockPaperScissors';
import RockPaperScissorsViewer from './components/RPSviewer';
import io from 'socket.io-client';
import Bomb from './components/Bomb.js';
import CardUpDown from './components/CardUpDown.js';
import BombViewer from './components/BombViewer.js';

const socket = io('http://192.168.0.52:4000');

const App = () => {
  const [role, setRole] = useState(null);
  const [gameType, setGameType] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');

  useEffect(() => {
    if (gameType && roomNumber) {
      socket.emit('joinGame', { gameType, roomNumber });
    }
  }, [gameType, roomNumber]);

  useEffect(() => {
    socket.on('role', (assignedRole) => {
      console.log('Assigned role:', assignedRole);
      setRole(assignedRole);
    });

    return () => {
      socket.off('role');
    };
  }, []);

  const handleGameSelection = (selectedGameType) => {
    const room = prompt('Enter Room Number:');
    if (room) {
      setRoomNumber(room);
      setGameType(selectedGameType);
    }
  };

  if (!gameType) {
    return (
      <div>
        <button onClick={() => handleGameSelection('alienShooting')}>Join Alien Shooting Game</button>
        <button onClick={() => handleGameSelection('platformer')}>Join Platformer Game</button>
        <button onClick={() => handleGameSelection('bomb')}>Join Bomb Defuse</button>
        <button onClick={() => handleGameSelection('RPS')}>Join RockPaperScissors Game</button>
        <button onClick={() => handleGameSelection('Card Up Down')}>Join Card UpDOWN</button>
      </div>
    );
  }

  if (role === null) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      {role === 'host' && gameType === 'alienShooting' && <AlienShooter socket={socket} gameType="alienShooting" />}
      {role === 'viewer' && gameType === 'alienShooting' && <AlienViewer socket={socket} />}
      {role === 'host' && gameType === 'platformer' && <Game socket={socket} gameType="platformer" />}
      {role === 'viewer' && gameType === 'platformer' && <Viewer socket={socket} />}
      {role === 'host' && gameType === 'RPS' && <RockPaperScissors socket={socket} />}
      {role === 'viewer' && gameType === 'RPS' && <RockPaperScissorsViewer socket={socket} />}
      {role === 'host' && gameType === 'bomb' && <Bomb socket={socket} />}
      {role === 'viewer' && gameType === 'bomb' && <BombViewer socket={socket} />}
      {gameType === 'Card Up Down' && <CardUpDown />}
    </div>
  );
};

export default App;
