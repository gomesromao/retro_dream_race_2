import React, { useState, useEffect } from 'react';
import { RaceResult, TRACKS } from './TrackConfig';

interface RaceResultsScreenProps {
  trackIndex: number;
  results: RaceResult[];
  standings: { name: string; color: string; totalPoints: number; isPlayer: boolean }[];
  onNextTrack: () => void;
  nextLabel?: string;
}

const RaceResultsScreen: React.FC<RaceResultsScreenProps> = ({ trackIndex, results, standings, onNextTrack, nextLabel }) => {
  const [showStandings, setShowStandings] = useState(false);
  const track = TRACKS[trackIndex];

  useEffect(() => {
    const t = setTimeout(() => setShowStandings(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const sorted = [...results].sort((a, b) => a.position - b.position);
  const standingSorted = [...standings].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #1a1a2a 100%)' }}
    >
      <h1
        className="font-pixel text-xl sm:text-2xl mb-2"
        style={{ color: '#c9956c', textShadow: '2px 2px 0 #000' }}
      >
        {track.name}
      </h1>
      <p className="font-retro text-xs mb-6" style={{ color: '#666' }}>
        TRACK {trackIndex + 1} OF {TRACKS.length} — RESULTS
      </p>

      {/* Race results table */}
      <div
        className="rounded p-4 mb-4 min-w-[300px]"
        style={{ background: 'rgba(30,30,50,0.9)', border: '2px solid #333' }}
      >
        {sorted.map((r, i) => (
          <div
            key={r.name}
            className="flex items-center justify-between py-2 px-3 mb-1 rounded"
            style={{
              background: r.isPlayer ? 'rgba(200,150,100,0.15)' : 'transparent',
              borderLeft: `3px solid ${r.color}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="font-pixel text-lg" style={{ color: i === 0 ? '#ffd93d' : i === 1 ? '#c0c0c0' : '#8b6914', width: 28 }}>
                {r.position}º
              </span>
              <span className="font-retro text-sm" style={{ color: r.isPlayer ? '#c9956c' : '#999' }}>
                {r.name} {r.isPlayer ? '(YOU)' : ''}
              </span>
            </div>
            <span className="font-pixel text-sm" style={{ color: '#f39c12' }}>
              +{r.points}pts
            </span>
          </div>
        ))}
      </div>

      {/* Championship standings */}
      {showStandings && standings.length > 0 && (
        <div
          className="rounded p-4 mb-6 min-w-[280px] animate-fade-in"
          style={{ background: 'rgba(20,18,15,0.9)', border: '2px solid #3a3020' }}
        >
          <p className="font-retro text-xs mb-3 text-center" style={{ color: '#666' }}>
            CHAMPIONSHIP STANDINGS
          </p>
          {[...standings].sort((a, b) => b.totalPoints - a.totalPoints).map((s, i) => (
            <div
              key={s.name}
              className="flex items-center justify-between py-1 px-2"
              style={{
                background: s.isPlayer ? 'rgba(200,150,100,0.1)' : 'transparent',
                borderLeft: `3px solid ${s.color}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-pixel text-sm" style={{ color: i === 0 ? '#ffd93d' : '#888', width: 24 }}>
                  {i + 1}º
                </span>
                <span className="font-retro text-xs" style={{ color: s.isPlayer ? '#c9956c' : '#888' }}>
                  {s.name}
                </span>
              </div>
              <span className="font-pixel text-sm" style={{ color: '#f39c12' }}>
                {s.totalPoints}pts
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        className="font-pixel text-xs px-8 py-3 transition-all active:scale-95"
        style={{
          background: 'linear-gradient(180deg, #c9956c 0%, #8b5a2b 100%)',
          color: '#fff',
          border: '3px solid #000',
          boxShadow: '3px 3px 0 #000',
        }}
        onClick={onNextTrack}
      >
        {nextLabel || (trackIndex < TRACKS.length - 1 ? 'NEXT TRACK →' : 'FINAL RESULTS')}
      </button>
    </div>
  );
};

export default RaceResultsScreen;
