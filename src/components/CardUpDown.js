import React, { useState, useEffect } from 'react';

const cardNames = {
  1: 'Ace',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Jack',
  12: 'Queen',
  13: 'King'
};

const CardUpDown = () => {
  const [currentCard, setCurrentCard] = useState(null);
  const [nextCard, setNextCard] = useState(null);
  const [results, setResults] = useState([]);
  const [gameStatus, setGameStatus] = useState('');
  const [bonusMoney, setBonusMoney] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (results.length === 3) {
      const correctCount = results.filter(result => result).length;
      let finalResult;
      let bonus;

      if (correctCount === 3) {
        finalResult = '맞췄습니다!';
        bonus = 27;
      } else if (correctCount === 2) {
        finalResult = '맞췄습니다!';
        bonus = 9;
      } else if (correctCount === 1) {
        finalResult = '맞췄습니다!';
        bonus = 3;
      } else {
        finalResult = '틀렸습니다!';
        bonus = 0;
      }

      setGameStatus(finalResult);
      setBonusMoney(bonus);
      setShowResults(true);

      setTimeout(() => {
        setShowResults(false);
        setCurrentCard(null);
        setNextCard(null);
        setResults([]);
        setGameStatus('');
        setBonusMoney(0);
      }, 5000);
    }
  }, [results]);

  const generateCard = () => Math.floor(Math.random() * 13) + 1;

  const startGame = () => {
    setCurrentCard(generateCard());
    setNextCard(null);
    setResults([]);
    setGameStatus('');
    setBonusMoney(0);
  };

  const guess = (guess) => {
    const next = generateCard();
    const correct = (guess === 'up' && next > currentCard) || (guess === 'down' && next < currentCard);
    setNextCard(next);
    setResults([...results, correct]);
    setCurrentCard(next);
    alert(correct ? '맞췄습니다!' : '틀렸습니다!');
  };

  const getIndicator = () => {
    return results.map(result => (result ? 'O' : 'X')).join('') + 'X'.repeat(3 - results.length);
  };

  return (
    <div className="card-up-down">
      <h2 className="title">업 다운</h2>
      <button className="start-button" onClick={startGame}>Start Game</button>
      {currentCard && !nextCard && results.length < 3 && (
        <div>
          <div className="indicator">{getIndicator()}</div>
          <p className="current-card">현재 카드: {cardNames[currentCard]}</p>
          <img src={`/cards/${currentCard}.png`} alt={cardNames[currentCard]} className="card-image" />
          <button className="guess-button" onClick={() => guess('up')} disabled={gameStatus !== ''}>Up</button>
          <button className="guess-button" onClick={() => guess('down')} disabled={gameStatus !== ''}>Down</button>
        </div>
      )}
      {nextCard && results.length < 3 && (
        <div>
          <div className="indicator">{getIndicator()}</div>
          <p className="next-card">다음 카드: {cardNames[nextCard]}</p>
          <img src={`/cards/${nextCard}.png`} alt={cardNames[nextCard]} className="card-image" />
          {results.length < 3 && setNextCard(null)}
        </div>
      )}
      {showResults && (
        <div className="results-modal">
          <div className="indicator">{getIndicator()}</div>
          <h3 className="game-status">{gameStatus}</h3>
          <h3 className="bonus-money">보너스 머니: {bonusMoney}X</h3>
        </div>
      )}
    </div>
  );
};

export default CardUpDown;
