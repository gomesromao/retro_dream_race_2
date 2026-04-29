import React, { useState, useEffect } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleStart = () => {
    if (phase >= 3) onComplete();
  };

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #2c1810 0%, #4a2c17 30%, #6b4423 60%, #c9956c 100%)',
      }}
    >
      {/* Desert sun */}
      <div
        className="absolute"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffd93d 0%, #ff9500 60%, transparent 70%)',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Distant mesa silhouettes */}
      <svg 
        className="absolute w-full" 
        viewBox="0 0 1200 200" 
        preserveAspectRatio="none"
        style={{ bottom: '40%', height: '20%' }}
      >
        <polygon 
          points="0,200 0,120 80,100 150,120 200,80 280,100 350,60 400,90 500,70 600,100 700,50 800,80 900,90 1000,60 1100,100 1200,80 1200,200" 
          fill="#3d2317"
        />
      </svg>

      {/* Ground */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '40%',
          background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2817 100%)',
        }}
      />

      {/* Dirt road center */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: '30%',
          height: '40%',
          background: 'linear-gradient(180deg, #4a3728 0%, #3a2a1d 100%)',
          clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center h-full px-4">
        
        {/* Top section - Studio */}
        <div className="pt-8 sm:pt-12">
          {phase >= 1 && (
            <div className="text-center animate-fade-in">
              <p className="font-pixel text-[10px] sm:text-xs tracking-widest" style={{ color: '#d4a574' }}>
                DUST ROAD GAMES
              </p>
              <p className="font-pixel text-[8px] mt-1" style={{ color: '#8b6f47' }}>
                PRESENTS
              </p>
            </div>
          )}
        </div>

        {/* Story text */}
        {phase >= 2 && phase < 3 && (
          <div className="text-center animate-fade-in mt-8">
            <p className="font-retro text-xl sm:text-2xl" style={{ color: '#f5deb3' }}>
              The desert awaits...
            </p>
            <p className="font-retro text-lg mt-2" style={{ color: '#d4a574' }}>
              Drive until the dust settles.
            </p>
          </div>
        )}

        {/* Main title section */}
        {phase >= 3 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-zoom-in">
            {/* Title */}
            <h1 
              className="font-pixel text-3xl sm:text-5xl md:text-6xl text-center"
              style={{
                color: '#e8c49a',
                textShadow: '4px 4px 0 #2a1a0f, 2px 2px 0 #4a2c17',
                letterSpacing: '2px',
              }}
            >
              NORCO RALLY
            </h1>
            <h2 
              className="font-pixel text-lg sm:text-xl md:text-2xl mt-3"
              style={{
                color: '#b8956c',
                textShadow: '2px 2px 0 #2a1a0f',
              }}
            >
              DESERT RUN
            </h2>

            {/* Start button */}
            <button 
              onClick={handleStart}
              className="font-pixel text-sm sm:text-base px-10 py-4 mt-10
                transition-transform duration-100 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #8b5a2b 0%, #5c3317 100%)',
                color: '#f5deb3',
                border: '4px solid #3d2314',
                boxShadow: '0 4px 0 #2a1a0f, inset 0 2px 0 rgba(255,255,255,0.1)',
              }}
            >
              START RACE
            </button>

            {/* Instructions */}
            <p className="font-retro text-sm mt-8" style={{ color: '#8b6f47' }}>
              ← → to steer • ↑ to accelerate
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroScreen;
