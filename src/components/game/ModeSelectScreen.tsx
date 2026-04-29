import React, { useState } from 'react';

interface ModeSelectScreenProps {
  onSelectMode: (mode: 'tournament' | 'arcade') => void;
}

const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({ onSelectMode }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{
        background: 'linear-gradient(180deg, #1a0f0a 0%, #2c1810 30%, #4a2c17 60%, #3d2317 100%)',
      }}
    >
      {/* Desert sun bg */}
      <div
        className="absolute"
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffd93d 0%, #ff9500 50%, transparent 70%)',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(3px)',
          opacity: 0.5,
        }}
      />

      <h1
        className="font-pixel text-xl sm:text-2xl mb-2 text-center animate-fade-in"
        style={{ color: '#e8c49a', textShadow: '3px 3px 0 #1a0f0a' }}
      >
        CHOOSE YOUR PATH
      </h1>
      <p
        className="font-retro text-xs mb-10 animate-fade-in"
        style={{ color: '#8b6f47' }}
      >
        Every road leads to dust
      </p>

      <div className="flex flex-col sm:flex-row gap-6 animate-fade-in">
        {/* Tournament Mode */}
        <button
          className="relative transition-all duration-200 active:scale-95"
          style={{
            width: 260,
            padding: '28px 20px',
            background: hovered === 'tournament'
              ? 'linear-gradient(180deg, #5a3a1a 0%, #3d2314 100%)'
              : 'linear-gradient(180deg, #4a2c17 0%, #2a1a0f 100%)',
            border: hovered === 'tournament' ? '3px solid #ffd93d' : '3px solid #5c3d2e',
            boxShadow: hovered === 'tournament'
              ? '0 0 20px rgba(255,217,61,0.2), 4px 4px 0 #1a0f0a'
              : '4px 4px 0 #1a0f0a',
          }}
          onMouseEnter={() => setHovered('tournament')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectMode('tournament')}
        >
          <div className="font-pixel text-lg mb-3" style={{ color: '#ffd93d', textShadow: '2px 2px 0 #000' }}>
            🏆 TOURNAMENT
          </div>
          <div className="font-retro text-xs leading-relaxed" style={{ color: '#c9956c' }}>
            5 tracks • Championship points
          </div>
          <div className="font-retro text-xs mt-2" style={{ color: '#8b6f47' }}>
            Race through all circuits and prove you're the last champion standing
          </div>
          <div
            className="absolute top-2 right-2 font-pixel text-[8px] px-2 py-1"
            style={{ background: '#ffd93d', color: '#1a0f0a' }}
          >
            FULL
          </div>
        </button>

        {/* Arcade Mode */}
        <button
          className="relative transition-all duration-200 active:scale-95"
          style={{
            width: 260,
            padding: '28px 20px',
            background: hovered === 'arcade'
              ? 'linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%)'
              : 'linear-gradient(180deg, #152535 0%, #0a1018 100%)',
            border: hovered === 'arcade' ? '3px solid #4a9aff' : '3px solid #2a3a4a',
            boxShadow: hovered === 'arcade'
              ? '0 0 20px rgba(74,154,255,0.2), 4px 4px 0 #0a0a0a'
              : '4px 4px 0 #0a0a0a',
          }}
          onMouseEnter={() => setHovered('arcade')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelectMode('arcade')}
        >
          <div className="font-pixel text-lg mb-3" style={{ color: '#4a9aff', textShadow: '2px 2px 0 #000' }}>
            ⚡ ARCADE
          </div>
          <div className="font-retro text-xs leading-relaxed" style={{ color: '#7a9ab0' }}>
            1 track • Pick your battleground
          </div>
          <div className="font-retro text-xs mt-2" style={{ color: '#5a7a8a' }}>
            Choose any circuit and race for glory — no points, no pressure, just speed
          </div>
          <div
            className="absolute top-2 right-2 font-pixel text-[8px] px-2 py-1"
            style={{ background: '#4a9aff', color: '#0a1018' }}
          >
            QUICK
          </div>
        </button>
      </div>

      <p className="font-retro text-[10px] mt-10" style={{ color: '#5c3d2e' }}>
        ← → to steer • ↑ to accelerate
      </p>
    </div>
  );
};

export default ModeSelectScreen;
