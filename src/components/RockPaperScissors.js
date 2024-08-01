import React, { useState } from 'react';


const RockPaperScissors = () => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState('');
  const [animateResult, setAnimateResult] = useState(false);

  const choices = ['바위', '보', '가위'];

  const playGame = (choice) => {
    setPlayerChoice(choice);
    const computerChoice = choices[Math.floor(Math.random() * 3)];
    setComputerChoice(computerChoice);

    let outcome;
    if (choice === computerChoice) {
      outcome = 'Draw';
    } else if (
      (choice === '바위' && computerChoice === '가위') ||
      (choice === '보' && computerChoice === '바위') ||
      (choice === '가위' && computerChoice === '보')
    ) {
      outcome = 'You Win';
    } else {
      outcome = 'You Lose';
    }
    setResult(outcome);

    // Trigger result animation
    setAnimateResult(true);
    setTimeout(() => setAnimateResult(false), 1000); // Reset animation after 1 second
  };

  const getImage = (choice) => {
    switch (choice) {
      case '바위':
        return '/rock (1).png';
      case '보':
        return '/paper (1).png';
      case '가위':
        return '/scissor (1).png';
      default:
        return '';
    }
  };

  return (
    <div className="App">
      <h2>Rock Paper Scissors</h2>
      <div>
        {choices.map((choice) => (
          <button
            key={choice}
            className={`choice ${playerChoice === choice ? 'selected' : ''}`}
            onClick={() => playGame(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      {playerChoice && (
        <div>
          <div className="hands">
            <div className={`hand ${result === 'You Win' ? 'jump' : ''}`}>
              <p>Your choice:</p>
              <img src={getImage(playerChoice)} alt={playerChoice} />
            </div>
            <div className={`hand ${result === 'You Lose' ? 'jump' : ''}`}>
              <p>Computer's choice:</p>
              <img src={getImage(computerChoice)} alt={computerChoice} />
            </div>
          </div>
          <h3 className={`result ${animateResult ? 'fadeIn' : ''}`}>{result}</h3>
        </div>
      )}
    </div>
  );
};

export default RockPaperScissors;
