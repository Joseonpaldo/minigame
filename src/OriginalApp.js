// src/App.js
import React from 'react';
import GameSelector from './components/GameSelector';
import './App.css';

function App() {
  return (
    <div
      className="App"
      style={{
        backgroundImage: `url(${process.env.PUBLIC_URL + '/background.jpg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      <GameSelector />
    </div>
  );
}

export default App;
