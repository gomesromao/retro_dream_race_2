import React, { useState } from 'react';
import { TRACKS } from './TrackConfig';

interface TrackSelectScreenProps {
  onSelectTrack: (trackIndex: number) => void;
  onBack: () => void;
}

const TRACK_DESCRIPTIONS = [
  'Endless sand, scorching heat. The classic desert run.',
  'Purple skies and swamp mist. Watch the curves.',
  'Deep underground tunnels and narrow shafts.',
  'Rocky terrain, sharp turns. Only the tough survive.',
  'Rusted pipes and toxic fumes. The final frontier.',
];

const TRACK_EMOJIS = ['🏜️', '🌅', '⛏️', '🪨', '🏭'];

const TrackSelectScreen: React.FC<TrackSelectScreenProps> = ({ onSelectTrack, onBack }) => {
  const [selected, setSelected] = useState(0);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{
        background: 'linear-gradient(180deg, #0a0808 0%, #1a1210 50%, #0a0808 100%)',
      }}
    >
      <h1
        className="font-pixel text-lg sm:text-xl mb-2 text-center animate-fade-in"
        style={{ color: '#e8c49a', textShadow: '3px 3px 0 #000' }}
      >
        CHOOSE YOUR TRACK
      </h1>
      <p className="font-retro text-xs mb-8 animate-fade-in" style={{ color: '#8b6f47' }}>
        Pick your battleground
      </p>

      <div className="flex flex-col gap-3 animate-fade-in w-full max-w-[420px]">
        {TRACKS.map((track, i) => (
          <button
            key={track.id}
            className="flex items-center gap-4 transition-all duration-150 active:scale-[0.98]"
            style={{
              padding: '14px 18px',
              background: selected === i
                ? `linear-gradient(90deg, ${track.sky[2]}88, ${track.sky[3]}44)`
                : 'rgba(20,18,15,0.8)',
              border: selected === i ? `2px solid ${track.sunColor}` : '2px solid #2a2218',
              boxShadow: selected === i ? `0 0 12px ${track.sunColor}33` : 'none',
            }}
            onClick={() => setSelected(i)}
            onDoubleClick={() => onSelectTrack(i)}
          >
            {/* Track preview - mini sky gradient */}
            <div
              style={{
                width: 48,
                height: 36,
                borderRadius: 2,
                background: `linear-gradient(180deg, ${track.sky[0]}, ${track.sky[2]}, ${track.sky[4]})`,
                border: '1px solid #333',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 18 }}>{TRACK_EMOJIS[i]}</span>
            </div>
            <div className="text-left flex-1">
              <div className="font-pixel text-xs" style={{ color: selected === i ? track.sunColor : '#888' }}>
                {track.name}
              </div>
              <div className="font-retro text-[10px] mt-1" style={{ color: '#6a5a4a' }}>
                {TRACK_DESCRIPTIONS[i]}
              </div>
            </div>
            {selected === i && (
              <span className="font-pixel text-xs" style={{ color: track.sunColor }}>►</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mt-8 animate-fade-in">
        <button
          className="font-pixel text-xs px-6 py-3 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #666 0%, #333 100%)',
            color: '#ccc',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
          onClick={onBack}
        >
          BACK
        </button>
        <button
          className="font-pixel text-xs px-8 py-3 transition-all active:scale-95"
          style={{
            background: `linear-gradient(180deg, ${TRACKS[selected].sunColor}, ${TRACKS[selected].sky[3]})`,
            color: '#fff',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
            textShadow: '1px 1px 0 #000',
          }}
          onClick={() => onSelectTrack(selected)}
        >
          RACE!
        </button>
      </div>
    </div>
  );
};

export default TrackSelectScreen;
