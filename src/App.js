import React, { useState, useEffect } from 'react';
import AlienShooter from './components/AlienShooter';
import AlienViewer from './components/AlienViewer';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

const App = () => {
  const [role, setRole] = useState(null);

  useEffect(() => {
    socket.on('role', (assignedRole) => {
      console.log('Assigned role:', assignedRole);
      setRole(assignedRole);
    });

    return () => {
      socket.off('role');
    };
  }, []);

  if (role === null) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      {role === 'host' && <AlienShooter socket={socket} />}
      {role === 'viewer' && <AlienViewer socket={socket} />}
    </div>
  );
};

export default App;
