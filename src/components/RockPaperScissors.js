import React, { useState, useEffect } from 'react';
import './css/RockPaperScissors.css'; // Add custom styles here

const RockPaperScissors = ({ socket }) => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState('');
  const [animateResult, setAnimateResult] = useState(false);
  const [round, setRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3); // Timer starts at 3 seconds

  const choices = ['바위', '보', '가위'];

  // Timer logic for each round
  useEffect(() => {
    if (gameOver || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        if (prevTimeLeft > 0) {
          return prevTimeLeft - 1;
        } else {
          playGame(null); // Auto-play if the player doesn't choose
          clearInterval(timer);
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameOver]); // Adding timeLeft ensures the timer gets reset

  const playGame = (choice) => {
    if (gameOver) return;

    setPlayerChoice(choice);
    socket.emit('rpsPlayerChoice', choice);

    const computerChoice = choices[Math.floor(Math.random() * 3)];
    setComputerChoice(computerChoice);
    socket.emit('rpsComputerChoice', computerChoice);

    let outcome;
    if (choice === computerChoice) {
      outcome = 'Draw';
    } else if (
      (choice === '바위' && computerChoice === '가위') ||
      (choice === '보' && computerChoice === '바위') ||
      (choice === '가위' && computerChoice === '보')
    ) {
      outcome = 'You Win';
      setPlayerScore(playerScore + 1);
      socket.emit('rpsScore', { playerScore: playerScore + 1, computerScore });
    } else {
      outcome = 'You Lose';
      setComputerScore(computerScore + 1);
      socket.emit('rpsScore', { playerScore, computerScore: computerScore + 1 });
    }
    setResult(outcome);
    socket.emit('rpsResult', outcome);

    // Check if game is over (3 rounds)
    if (round === 3) {
      setGameOver(true);

      // Determine final result
      let finalOutcome;
      if (playerScore > computerScore) {
        finalOutcome = 'You Win the Game!';
      } else if (playerScore < computerScore) {
        finalOutcome = 'You Lose the Game!';
      } else {
        finalOutcome = 'The Game is a Draw!';
      }

      // Send final result to the server
      socket.emit('rpsFinalResult', finalOutcome);

      // Trigger alert with final result
      alert(finalOutcome);
    } else {
      setRound(round + 1);
      setTimeLeft(3); // Reset the timer for the next round
    }

    setAnimateResult(true);
    setTimeout(() => setAnimateResult(false), 1000);
  };

  useEffect(() => {
    socket.on('rpsPlayerChoice', (choice) => {
      setPlayerChoice(choice);
    });

    socket.on('rpsComputerChoice', (choice) => {
      setComputerChoice(choice);
    });

    socket.on('rpsResult', (outcome) => {
      setResult(outcome);
      setAnimateResult(true);
      setTimeout(() => setAnimateResult(false), 1000);
    });

    socket.on('rpsScore', ({ playerScore, computerScore }) => {
      setPlayerScore(playerScore);
      setComputerScore(computerScore);
    });

    return () => {
      socket.off('rpsPlayerChoice');
      socket.off('rpsComputerChoice');
      socket.off('rpsResult');
      socket.off('rpsScore');
    };
  }, [socket]);

  const getImage = (choice) => {
    switch (choice) {
      case '바위':
        return '/rock.png';
      case '보':
        return '/paper.png';
      case '가위':
        return '/scissor.png';
      default:
        return '';
    }
  };

  return (
    <div className="App">
      <h2>Rock Paper Scissors - Round {round}</h2>
      <div>Player Score: {playerScore} | Computer Score: {computerScore}</div>

      {/* Timer Box Animation */}
      <div className="timer-box">
        <div
          className="timer-fill"
          style={{ width: `${(timeLeft / 3) * 100}%` }} // Shrinking towards center
        />
      </div>
      <div className="choices-container">
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
          {gameOver && (
            <h3>
              {playerScore > computerScore
                ? 'You Win the Game!'
                : playerScore < computerScore
                ? 'You Lose the Game!'
                : 'The Game is a Draw!'}
            </h3>
          )}
        </div>
      )}
    </div>
  );
};

export default RockPaperScissors;
