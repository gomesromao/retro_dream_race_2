import React, { useEffect, useState } from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  onMenu: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart, onMenu }) => {
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('dirtRallyHighScore');
    const previousHigh = stored ? parseInt(stored, 10) : 0;
    
    if (score > previousHigh) {
      setHighScore(score);
      setIsNewHighScore(true);
      localStorage.setItem('dirtRallyHighScore', score.toString());
    } else {
      setHighScore(previousHigh);
    }
  }, [score]);

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, #1a0a0a 0%, #2a1515 100%)',
      }}
    >
      {/* Checkered pattern */}
      <div className="flex mb-6">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i}
            className="w-5 h-5"
            style={{ background: i % 2 === 0 ? '#fff' : '#000' }}
          />
        ))}
      </div>

      <h1 
        className="font-pixel text-2xl sm:text-3xl mb-6"
        style={{
          color: '#e74c3c',
          textShadow: '3px 3px 0 #000',
        }}
      >
        RACE OVER
      </h1>

      <div 
        className="rounded p-6 mb-6 min-w-[280px] text-center"
        style={{
          background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a2a 100%)',
          border: '3px solid #333',
        }}
      >
        <p className="font-retro text-lg mb-2" style={{ color: '#888' }}>DISTANCE</p>
        <p 
          className="font-pixel text-3xl mb-4"
          style={{ color: '#f39c12' }}
        >
          {score}m
        </p>

        {isNewHighScore && (
          <p 
            className="font-pixel text-xs mb-4 animate-pulse"
            style={{ color: '#e74c3c' }}
          >
            ★ NEW RECORD! ★
          </p>
        )}

        <div 
          className="border-t pt-4"
          style={{ borderColor: '#333' }}
        >
          <p className="font-retro text-sm" style={{ color: '#666' }}>BEST</p>
          <p className="font-pixel text-lg" style={{ color: '#27ae60' }}>
            {highScore}m
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          className="font-pixel text-xs px-6 py-3 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #27ae60 0%, #1e8449 100%)',
            color: '#fff',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
          onClick={onRestart}
        >
          RACE AGAIN
        </button>
        <button
          className="font-pixel text-xs px-6 py-3 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #555 0%, #333 100%)',
            color: '#fff',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
          onClick={onMenu}
        >
          MENU
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
