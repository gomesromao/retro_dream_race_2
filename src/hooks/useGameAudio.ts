import { useRef, useEffect, useCallback } from 'react';

// Simple oscillator-based retro sounds
export const useGameAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicIntervalRef = useRef<number | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Start engine sound
  const startEngine = useCallback(() => {
    const ctx = initAudio();
    if (engineOscRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.value = 80;
    gain.gain.value = 0.003;
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    
    engineOscRef.current = osc;
    engineGainRef.current = gain;
  }, [initAudio]);

  // Update engine pitch based on speed
  const updateEngine = useCallback((speed: number, maxSpeed: number) => {
    if (engineOscRef.current && engineGainRef.current) {
      const ratio = speed / maxSpeed;
      engineOscRef.current.frequency.value = 60 + ratio * 140;
      engineGainRef.current.gain.value = 0.002 + ratio * 0.004;
    }
  }, []);

  // Stop engine
  const stopEngine = useCallback(() => {
    if (engineOscRef.current) {
      engineOscRef.current.stop();
      engineOscRef.current = null;
      engineGainRef.current = null;
    }
  }, []);

  // Play crash sound
  const playCrash = useCallback(() => {
    const ctx = initAudio();
    
    // White noise burst
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }, [initAudio]);

  // Western desert music - simple melody loop
  const startMusic = useCallback(() => {
    const ctx = initAudio();
    
    // Western pentatonic scale notes (desert/spaghetti western vibe)
    const notes = [
      196, 220, 262, 294, 330, // G3, A3, C4, D4, E4
      294, 262, 220, 196, 165, // going down
      220, 262, 330, 392, 330, // up again
      294, 262, 220, 196, 147  // resolve
    ];
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.05;
    masterGain.connect(ctx.destination);
    musicGainRef.current = masterGain;

    let noteIndex = 0;
    
    const playNote = () => {
      if (!audioCtxRef.current) return;
      
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      
      // Mix of triangle and square for retro western twang
      osc.type = noteIndex % 3 === 0 ? 'square' : 'triangle';
      osc.frequency.value = notes[noteIndex % notes.length];
      
      noteGain.gain.setValueAtTime(0.3, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      osc.connect(noteGain);
      noteGain.connect(masterGain);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      
      noteIndex++;
    };

    // Play bass drone
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 98; // G2
    bassGain.gain.value = 0.04;
    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start();

    // Melody interval
    musicIntervalRef.current = window.setInterval(playNote, 280);
    playNote();

    return bassOsc;
  }, [initAudio]);

  // Stop music
  const stopMusic = useCallback(() => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, []);

  // Play pickup/score sound
  const playScore = useCallback(() => {
    const ctx = initAudio();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, [initAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEngine();
      stopMusic();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopEngine, stopMusic]);

  return {
    initAudio,
    startEngine,
    updateEngine,
    stopEngine,
    playCrash,
    startMusic,
    stopMusic,
    playScore,
  };
};
