import React, { useState } from 'react';
import CRTOverlay from '@/components/game/CRTOverlay';
import IntroScreen from '@/components/game/IntroScreen';
import ModeSelectScreen from '@/components/game/ModeSelectScreen';
import CarSelectScreen from '@/components/game/CarSelectScreen';
import TrackSelectScreen from '@/components/game/TrackSelectScreen';
import PreRaceScreen from '@/components/game/PreRaceScreen';
import RacingGame from '@/components/game/RacingGame';
import RaceResultsScreen from '@/components/game/RaceResultsScreen';
import TournamentEndScreen from '@/components/game/TournamentEndScreen';
import { TRACKS, POINTS_BY_POSITION, OPPONENT_NAMES, RaceResult } from '@/components/game/TrackConfig';

type GameState = 'intro' | 'mode_select' | 'select' | 'track_select' | 'prerace' | 'playing' | 'results' | 'tournament_end';
type GameMode = 'tournament' | 'arcade';

interface Car {
  id: string;
  name: string;
  speed: number;
  handling: number;
  acceleration: number;
  color: string;
  emoji: string;
}

const OPP_COLORS = ['#c0392b', '#2980b9', '#8e44ad', '#16a085'];

const Index: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [gameMode, setGameMode] = useState<GameMode>('tournament');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [championship, setChampionship] = useState<{ name: string; color: string; totalPoints: number; isPlayer: boolean }[]>([]);

  const handleIntroComplete = () => setGameState('mode_select');

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    setGameState('select');
  };

  const handleCarSelect = (car: Car) => {
    setSelectedCar(car);
    if (gameMode === 'arcade') {
      setGameState('track_select');
    } else {
      setCurrentTrack(0);
      const standings = [
        { name: car.name, color: car.color, totalPoints: 0, isPlayer: true },
        ...OPPONENT_NAMES.map((n, i) => ({ name: n, color: OPP_COLORS[i], totalPoints: 0, isPlayer: false })),
      ];
      setChampionship(standings);
      setGameState('prerace');
    }
  };

  const handleTrackSelect = (trackIndex: number) => {
    setCurrentTrack(trackIndex);
    setGameState('prerace');
  };

  const handlePreRaceReady = () => {
    setGameState('playing');
  };

  const handleRaceFinish = (results: RaceResult[]) => {
    setRaceResults(results);
    if (gameMode === 'tournament') {
      setChampionship(prev => {
        const updated = prev.map(s => {
          const r = results.find(r => r.name === s.name);
          return r ? { ...s, totalPoints: s.totalPoints + r.points } : s;
        });
        return updated;
      });
      setGameState('results');
    } else {
      // Arcade: show results then back to mode select
      setGameState('results');
    }
  };

  const handleNextTrack = () => {
    if (gameMode === 'arcade') {
      // Arcade: go back to mode selection
      setGameState('mode_select');
      return;
    }
    if (currentTrack < TRACKS.length - 1) {
      setCurrentTrack(currentTrack + 1);
      setGameState('prerace');
    } else {
      setGameState('tournament_end');
    }
  };

  const handleMenu = () => {
    setGameState('select');
    setCurrentTrack(0);
    setChampionship([]);
  };

  const handleMainMenu = () => {
    setGameState('mode_select');
    setCurrentTrack(0);
    setChampionship([]);
    setSelectedCar(null);
  };

  const playerFinalPosition = () => {
    const sorted = [...championship].sort((a, b) => b.totalPoints - a.totalPoints);
    return sorted.findIndex(s => s.isPlayer) + 1;
  };

  const arcadeNextLabel = gameMode === 'arcade' ? 'MENU' : undefined;

  return (
    <div className="min-h-screen bg-background animate-flicker">
      <CRTOverlay />
      
      {gameState === 'intro' && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {gameState === 'mode_select' && (
        <ModeSelectScreen onSelectMode={handleModeSelect} />
      )}
      
      {gameState === 'select' && (
        <CarSelectScreen onSelect={handleCarSelect} />
      )}

      {gameState === 'track_select' && selectedCar && (
        <TrackSelectScreen
          onSelectTrack={handleTrackSelect}
          onBack={() => setGameState('select')}
        />
      )}
      
      {gameState === 'prerace' && selectedCar && (
        <PreRaceScreen
          trackIndex={currentTrack}
          playerName={selectedCar.name}
          playerColor={selectedCar.color}
          onReady={handlePreRaceReady}
        />
      )}
      
      {gameState === 'playing' && selectedCar && (
        <RacingGame
          car={selectedCar}
          trackIndex={currentTrack}
          onRaceFinish={handleRaceFinish}
        />
      )}
      
      {gameState === 'results' && (
        <RaceResultsScreen
          trackIndex={currentTrack}
          results={raceResults}
          standings={gameMode === 'tournament' ? championship : []}
          onNextTrack={handleNextTrack}
          nextLabel={arcadeNextLabel}
        />
      )}
      
      {gameState === 'tournament_end' && (
        <TournamentEndScreen
          standings={championship}
          playerPosition={playerFinalPosition()}
          playerCarId={selectedCar?.id}
          onMenu={handleMenu}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
};

export default Index;
