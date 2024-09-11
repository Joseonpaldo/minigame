import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import AlienViewer from './components/AlienViewer';
import Viewer from './components/Viewer';
import AlienShooter from './components/AlienShooter';
import RockPaperScissors from './components/RockPaperScissors';
import RockPaperScissorsViewer from './components/RPSviewer';
import io from 'socket.io-client';
import Bomb from './components/Bomb.js';
import BombViewer from './components/BombViewer.js';

const socket = io('http://192.168.0.52:4000');

const App = () => {
  const [role, setRole] = useState(null);
  const [gameType, setGameType] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [waitingForRole, setWaitingForRole] = useState(false);

  // Emit joinGame event when gameType, roomNumber, and role are selected
  useEffect(() => {
    if (gameType && roomNumber && selectedRole) {
      console.log(`Joining game with role: ${selectedRole}, gameType: ${gameType}, room: ${roomNumber}`);
      socket.emit('joinGame', { gameType, roomNumber, role: selectedRole });
    }
  }, [gameType, roomNumber, selectedRole]);

  useEffect(() => {
    socket.on('role', (assignedRole) => {
      console.log('Assigned role:', assignedRole);
      setRole(assignedRole);
    });

    return () => {
      socket.off('role');
    };
  }, []);

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    setWaitingForRole(false);
  };

  const handleGameSelection = (selectedGameType) => {
    const room = prompt('Enter Room Number:');
    if (room) {
      setRoomNumber(room);
      setGameType(selectedGameType);
      setWaitingForRole(true); // Wait for role selection
    }
  };

  if (waitingForRole) {
    return (
      <div>
        <button onClick={() => handleRoleSelection('host')}>Choose Host</button>
        <button onClick={() => handleRoleSelection('viewer')}>Choose Viewer</button>
      </div>
    );
  }

  if (!gameType) {
    return (
      <div>
        <button onClick={() => handleGameSelection('alienShooting')}>Join Alien Shooting Game</button>
        <button onClick={() => handleGameSelection('platformer')}>Join Platformer Game</button>
        <button onClick={() => handleGameSelection('bomb')}>Join Bomb Defuse</button>
        <button onClick={() => handleGameSelection('RPS')}>Join Rock Paper Scissors Game</button>
        <button onClick={() => handleGameSelection('Card Up Down')}>Join Card Up Down</button>
      </div>
    );
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
    </div>
  );
};

export default App;
