import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameAudio } from '@/hooks/useGameAudio';
import { TRACKS, POINTS_BY_POSITION, OPPONENT_NAMES, RaceResult } from './TrackConfig';

interface Car {
  id: string;
  name: string;
  speed: number;
  handling: number;
  acceleration: number;
  color: string;
  emoji: string;
}

interface RacingGameProps {
  car: Car;
  trackIndex: number;
  onRaceFinish: (results: RaceResult[]) => void;
}

// Desert palette
const COLORS = {
  sky: ['#1a0f0a', '#2c1810', '#4a2c17', '#8b5a2b', '#c9956c'],
  ground: '#5c4033',
  road: '#3d2817',
  roadLight: '#4a3425',
  rumble: '#8b7355',
  rumbleDark: '#5c4033',
  sand: '#c9956c',
  sandDark: '#b8956c',
  mesa: '#3d2317',
};

// Desert rally scenery - earthy tones matching the Norco aesthetic
const SCENERY = {
  barrel: '#8b4513',
  barrelBand: '#5c2e0a',
  sign: '#6b5d4d',
  signPost: '#4a3525',
  signText: '#c9956c',
  tumbleweed: '#c4a55a',
  tumbleweedDark: '#8b7340',
  bush: '#6b6b3a',
  bushDark: '#4a4a28',
  tire: '#2a2a2a',
  tireTread: '#444',
  milestone: '#c9b090',
  milestoneDark: '#8b7355',
};

interface Segment {
  z: number;
  curve: number;
}

interface Opponent {
  x: number;
  distance: number; // Absolute distance traveled
  speed: number;
  maxSpeed: number;
  targetX: number;
  color: string;
  carType: string;
  name: string;
  skillLevel: number;
  acceleration: number;
  style: 'aggressive' | 'defensive' | 'neutral'; // driving style per race
  launchReaction: number; // 0-1 random reaction delay at start
  tilt: number; // visual lean angle in degrees (smoothed)
  prevX: number; // last frame x — used to derive lateral velocity for tilt
}

interface Scenery {
  x: number;
  z: number;
  type: number;
  side: number;
}

interface WeatherEvent {
  type: 'none' | 'rain' | 'wind';
  active: boolean;
  intensity: number; // 0-1
  windDirection: number; // -1 left, 1 right
  startDistance: number;
  endDistance: number;
  cloudBuildup: number; // 0-1, pre-rain cloud darkening
  rainDrops: { x: number; y: number; speed: number; length: number }[];
  tumbleweeds: { x: number; y: number; speed: number; size: number; rotation: number }[];
  decided: boolean; // whether we've decided the event for this race
}

// Mid-race taunts in Portuguese
const MID_RACE_TAUNTS = [
  "Sai da frente!",
  "Tá dormindo, é?",
  "Acelera, tartaruga!",
  "Isso é tudo que tem?",
  "Cuidado que eu tô chegando!",
  "Vai chorar?",
  "Come poeira!",
  "Essa vaga é minha!",
  "Nem tenta me ultrapassar!",
  "Desiste, novato!",
  "Meu retrovisor tá limpo!",
  "Tchau, perdedor!",
  "Tá com medo?",
  "Aprendeu a dirigir onde?",
  "Fica aí atrás mesmo!",
  "Hoje não é seu dia!",
  "Passa se for capaz!",
  "Tô nem suando!",
  "Isso aqui é corrida de verdade!",
  "Volta pro kart, amigo!",
  "Que carrinho fraco hein!",
  "Pensei que ia ser difícil...",
  "Manda mais que tá pouco!",
  "Tô só aquecendo!",
  "Pode ir se acostumando com a minha traseira!",
];

interface TauntBubble {
  oppIndex: number;
  text: string;
  startTime: number;
  duration: number; // ms
}

const RACE_DISTANCE = 60000; // Race length in units

// Normalize car stats (60-95 range) to tight competitive ranges
const normalizeSpeed = (stat: number) => 195 + (stat - 60) * 0.7;  // 195-220
const normalizeAccel = (stat: number) => 120 + (stat - 60) * 0.9;  // 120-148
const normalizeHandling = (stat: number) => 0.8 + (stat - 50) * 0.012; // 0.8-1.34

const RacingGame: React.FC<RacingGameProps> = ({ car, trackIndex, onRaceFinish }) => {
  const track = TRACKS[trackIndex];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [position, setPosition] = useState(1);
  const [raceFinished, setRaceFinished] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [raceStarted, setRaceStarted] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 400 });
  const [audioStarted, setAudioStarted] = useState(false);
  
  const audio = useGameAudio();
  
  const playerMaxSpeed = normalizeSpeed(car.speed);
  const playerAccel = normalizeAccel(car.acceleration);
  const playerHandling = normalizeHandling(car.handling);
  
  const gameRef = useRef({
    playerX: 0,
    position: 0,
    speed: 0,
    maxSpeed: playerMaxSpeed,
    playerTilt: 0, // smoothed visual lean angle in degrees
    skidTrails: [] as { x: number; y: number; alpha: number; size: number }[],
    keys: { left: false, right: false, up: false, down: false },
    opponents: [] as Opponent[],
    scenery: [] as Scenery[],
    segments: [] as Segment[],
    running: true,
    raceStarted: false,
    taunts: [] as TauntBubble[],
    lastTauntDistance: 0,
    usedTaunts: new Set<string>(),
    // Surprise event
    ufo: {
      active: false,
      triggered: false,
      startTime: 0,
      x: 0,
      phase: 0, // 0=approach, 1=hover+beam, 2=depart
      triggerDistance: 15000 + Math.random() * 25000, // random between 25%-66% of race
    },
    shootingStars: [] as { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[],
    potholes: [] as { z: number; x: number; size: number }[], // z = distance, x = lane position (-0.4 to 0.4)
    // Desert animal crossings (purely visual)
    animals: [] as {
      type: 'coyote' | 'snake' | 'roadrunner' | 'scorpion';
      z: number;        // distance along road where it crosses
      xPos: number;     // current x position (-2 to 2, crosses road)
      xSpeed: number;   // crossing speed
      direction: number; // -1 or 1
      startTime: number;
      active: boolean;
    }[],
    nextAnimalDistance: 8000 + Math.random() * 15000, // first animal at random dist
    weather: {
      type: 'none' as 'none' | 'rain' | 'wind',
      active: false,
      intensity: 0,
      windDirection: 0,
      startDistance: 0,
      endDistance: 0,
      cloudBuildup: 0,
      rainDrops: [],
      tumbleweeds: [],
      decided: false,
    } as WeatherEvent,
  });

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 32, 800);
      const h = Math.min(window.innerHeight - 180, 500);
      setCanvasSize({ w: Math.max(w, 320), h: Math.max(h, 240) });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Prevent default on arrow keys
  useEffect(() => {
    const preventDefault = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventDefault);
    return () => window.removeEventListener('keydown', preventDefault);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !raceStarted) {
      setRaceStarted(true);
      gameRef.current.raceStarted = true;
      if (!audioStarted) {
        setAudioStarted(true);
        audio.startEngine();
        audio.startMusic();
      }
    }
  }, [countdown, raceStarted, audioStarted, audio]);

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === 'ArrowLeft') g.keys.left = true;
      if (e.key === 'ArrowRight') g.keys.right = true;
      if (e.key === 'ArrowUp') g.keys.up = true;
      if (e.key === 'ArrowDown') g.keys.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === 'ArrowLeft') g.keys.left = false;
      if (e.key === 'ArrowRight') g.keys.right = false;
      if (e.key === 'ArrowUp') g.keys.up = false;
      if (e.key === 'ArrowDown') g.keys.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Touch handlers
  const handleTouch = useCallback((key: 'left' | 'right' | 'up', pressed: boolean) => {
    gameRef.current.keys[key] = pressed;
  }, []);

  // Initialize game objects
  useEffect(() => {
    const g = gameRef.current;
    
    // Reset arrays to prevent duplication on re-mount
    g.segments = [];
    g.opponents = [];
    g.scenery = [];
    // Create road segments using track config
    const segmentLength = 200;
    const pat = track.segmentPattern;
    for (let i = 0; i < 800; i++) {
      let curve = 0;
      const pos = i % pat.cycleLength;
      const idx = pat.curveAt.indexOf(pos);
      if (idx !== -1) curve = pat.curveValues[idx];
      g.segments.push({ z: i * segmentLength, curve });
    }
    
    // Create 4 opponents (5 cars total including player)
    const oppColors = ['#c0392b', '#2980b9', '#8e44ad', '#16a085'];
    
    // Randomize skills — AI should be genuinely competitive, some FASTER than player
    const baseSkills = [0.99, 1.01, 1.03, 1.05];
    const shuffled = baseSkills.sort(() => Math.random() - 0.5);
    
    // Randomize driving styles each race
    const styles: Array<'aggressive' | 'defensive' | 'neutral'> = ['aggressive', 'defensive', 'neutral', 'neutral'];
    const shuffledStyles = styles.sort(() => Math.random() - 0.5);
    
    // Aligned side by side: 2 left of player, 2 right
    const gridXPositions = [-0.45, -0.22, 0.22, 0.45];

    // Give each opponent a distinct rear-view sprite so the field looks varied.
    // Rendering only has art for these four — keep the list in sync with the if/else below.
    const oppCarTypes = ['thunder', 'viper', 'phantom', 'dirtbeast'].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 4; i++) {
      const skill = shuffled[i];
      const accelVariance = 1.0 + Math.random() * 0.06; // 1.0-1.06 — AI can accelerate faster
      g.opponents.push({
        x: gridXPositions[i],
        distance: 0,
        speed: 0,
        maxSpeed: playerMaxSpeed * skill,
        targetX: gridXPositions[i],
        color: oppColors[i],
        carType: oppCarTypes[i],
        name: OPPONENT_NAMES[i],
        skillLevel: skill,
        acceleration: playerAccel * accelVariance,
        style: shuffledStyles[i],
        launchReaction: 0.6 + Math.random() * 0.4, // faster reactions: 0.6-1.0
        tilt: 0,
        prevX: gridXPositions[i],
      });
    }
    
    // Spawn track-appropriate scenery
    const types = track.sceneryTypes;
    for (let i = 0; i < 20; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const isLarge = types.some(t => t >= 5) && Math.random() < 0.25;
      const largeTypes = types.filter(t => t >= 5 || t >= 10);
      const smallTypes = types.filter(t => t < 5 || (t >= 10 && t <= 13) || (t >= 20 && t <= 23) || (t >= 30 && t <= 33) || (t >= 40 && t <= 43));
      const pickType = isLarge && largeTypes.length > 0
        ? largeTypes[Math.floor(Math.random() * largeTypes.length)]
        : types[Math.floor(Math.random() * types.length)];
      g.scenery.push({
        x: side * (isLarge ? (1.8 + Math.random() * 0.8) : (1.3 + Math.random() * 0.7)),
        z: -200 + i * 900,
        type: pickType,
        side,
      });
    }

    // Spawn potholes on the road — spread across the race, not too many
    const potholeCount = 8 + Math.floor(Math.random() * 5); // 8-12 potholes
    for (let i = 0; i < potholeCount; i++) {
      g.potholes.push({
        z: 3000 + i * (RACE_DISTANCE / potholeCount) + Math.random() * 3000,
        x: -0.35 + Math.random() * 0.7, // random lane position on road
        size: 0.06 + Math.random() * 0.04, // 0.06-0.10 width
      });
    }
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // Shared pixel-art palette used by both the player and opponent rear-view sprites.
    const SPRITE = {
      OUTLINE: '#0a0608',
      WINDOW: '#1a2c4c',
      WIN_HI: '#3c6090',
      TIRE: '#0a0a0a',
      RIM: '#666',
      RIM_HI: '#aaa',
      TAIL: '#ff2010',
      TAIL_HOT: '#ff8060',
      BUMPER: '#1a1a1a',
    };

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;
      const g = gameRef.current;
      const W = canvas.width;
      const H = canvas.height;

      if (!g.running) {
        animId = requestAnimationFrame(render);
        return;
      }

      const segmentLength = 200;
      const currentSegmentIndex = Math.floor(g.position / segmentLength) % g.segments.length;
      const currentCurve = g.segments[currentSegmentIndex]?.curve || 0;

      // Only update physics if race has started
      if (g.raceStarted) {
        // --- PLAYER PHYSICS ---
        // Capture pre-frame X so we can derive lateral velocity for the body lean
        const prevPlayerX = g.playerX;

        // Launch control: tighter ramp so the player's car doesn't jump ahead at the start
        const launchZone = Math.min(1, g.position / 2400);
        const launchCurve = launchZone * launchZone;
        const playerSpeedCap = playerMaxSpeed * (0.12 + launchCurve * 0.88);

        if (g.keys.up) {
          const speedRatio = g.speed / playerMaxSpeed;
          const accelFactor = Math.max(0.3, 1 - speedRatio * 0.55);
          g.speed = Math.min(g.speed + playerAccel * accelFactor * dt, playerSpeedCap);
        } else if (g.keys.down) {
          // Active brake — sharper deceleration than coasting
          g.speed = Math.max(g.speed - 180 * dt, 0);
        } else {
          // Coasting - gradual deceleration but not too punishing
          g.speed = Math.max(g.speed - 40 * dt, 0);
        }

        audio.updateEngine(g.speed, playerMaxSpeed);

        // Steering — snappier base response, still scales with speed but no longer dead at low speeds
        const speedFactor = g.speed / playerMaxSpeed;
        const steer = playerHandling * 0.95 * dt * (0.25 + Math.min(1, speedFactor * 1.8) * 0.85);

        const steeringInputRaw = (g.keys.right ? 1 : 0) - (g.keys.left ? 1 : 0);
        if (g.keys.left) g.playerX -= steer;
        if (g.keys.right) g.playerX += steer;

        // Curve drift — outward push, but reduced when actively counter-steering so the player
        // can fight the curve instead of just being shoved off the racing line.
        const counteringCurve =
          (currentCurve > 0 && g.keys.left) ||
          (currentCurve < 0 && g.keys.right);
        const curvePushMul = counteringCurve ? 0.55 : 1.0;
        const rainDriftBonus = g.weather.active && g.weather.type === 'rain' ? g.weather.intensity * 0.08 : 0;
        g.playerX -= currentCurve * speedFactor * dt * (0.42 + rainDriftBonus) * curvePushMul;
        
        // Wind push on player
        if (g.weather.active && g.weather.type === 'wind') {
          const windPush = g.weather.windDirection * g.weather.intensity * 0.03 * dt;
          g.playerX += windPush;
        }
        
        // Wind steering resistance: harder to steer into the wind
        if (g.weather.active && g.weather.type === 'wind') {
          const steeringIntoWind = 
            (g.keys.left && g.weather.windDirection > 0) || 
            (g.keys.right && g.weather.windDirection < 0);
          if (steeringIntoWind) {
            // Slight push back against steering
            g.playerX += g.weather.windDirection * g.weather.intensity * 0.015 * dt;
          }
        }
        
        g.playerX = Math.max(-2.5, Math.min(2.5, g.playerX));

        // Smoothed body lean: combines steering input + lateral velocity from curves/wind.
        // Lateral velocity reads the *actual* sideways motion (in world units/s), so the car
        // visibly leans during natural curve drift, not only when keys are pressed.
        const lateralVelX = (g.playerX - prevPlayerX) / Math.max(dt, 0.0001);
        const targetTilt = steeringInputRaw * 4.5 - lateralVelX * 8.0;
        const tiltLerp = Math.min(1, dt * 9);
        g.playerTilt += (targetTilt - g.playerTilt) * tiltLerp;
        // Cap so it never rolls absurdly
        g.playerTilt = Math.max(-12, Math.min(12, g.playerTilt));

        // Spawn dust skid puffs when cornering hard at speed (visual feedback for grip)
        if (Math.abs(steeringInputRaw) > 0 && speedFactor > 0.55 && Math.random() < speedFactor * 0.6) {
          const puffSide = steeringInputRaw > 0 ? -1 : 1; // dust kicks out from the inside wheel
          g.skidTrails.push({
            x: W / 2 + puffSide * (18 + Math.random() * 6),
            y: H - 28 + (Math.random() - 0.5) * 6,
            alpha: 0.55,
            size: 4 + Math.random() * 3,
          });
          if (g.skidTrails.length > 40) g.skidTrails.shift();
        }
        // Fade and drift puffs
        for (const puff of g.skidTrails) {
          puff.alpha -= dt * 1.4;
          puff.size += dt * 6;
        }
        g.skidTrails = g.skidTrails.filter(p => p.alpha > 0);

        // Off-road penalty — very gentle
        if (Math.abs(g.playerX) > 0.5) {
          const offRoadAmount = Math.min(1, (Math.abs(g.playerX) - 0.5) / 1.5);
          g.speed *= 1 - offRoadAmount * 0.015;
        }

        // --- PLAYER-OPPONENT COLLISION ---
        for (const opp of g.opponents) {
          const distDiff = Math.abs(opp.distance - g.position);
          const xDiff = g.playerX - opp.x;
          const absX = Math.abs(xDiff);
          const collisionRadiusZ = 160;
          const collisionRadiusX = 0.25;
          
          if (distDiff < collisionRadiusZ && absX < collisionRadiusX) {
            // Overlap amount (0 = edge, 1 = fully overlapping)
            const overlapX = 1 - absX / collisionRadiusX;
            const overlapZ = 1 - distDiff / collisionRadiusZ;
            const overlap = overlapX * overlapZ;
            
            // Strong lateral push - immediate separation
            const pushDir = xDiff > 0 ? 1 : -1;
            const lateralForce = pushDir * (0.8 + overlap * 1.5) * dt;
            g.playerX += lateralForce;
            opp.x -= lateralForce * 0.8;
            
            // Speed penalty based on overlap
            g.speed *= 1 - overlap * 0.02;
            opp.speed *= 1 - overlap * 0.015;
            
            // Longitudinal push - cars can't occupy same Z
            if (distDiff < 80) {
              const zPush = (g.position > opp.distance ? 1 : -1) * overlap * 15 * dt;
              g.position += zPush;
              opp.distance -= zPush * 0.5;
            }
          }
        }

        // Scenery collision - hitting objects slows you down and pushes you back
        for (const scn of g.scenery) {
          const relZ = scn.z - g.position;
          if (relZ > -15 && relZ < 15) {
            const dx = Math.abs(g.playerX - scn.x);
            if (dx < 0.18) {
              g.speed *= 0.7; // Hit penalty
              g.playerX += (g.playerX > scn.x ? 0.15 : -0.15); // Push away
            }
          }
        }

        // Pothole collision - player
        for (const hole of g.potholes) {
          const relZ = hole.z - g.position;
          if (relZ > -20 && relZ < 20) {
            const dx = Math.abs(g.playerX - hole.x);
            if (dx < hole.size + 0.05) {
              g.speed *= 0.88; // significant slowdown
            }
          }
        }

        // Movement - consistent scale for player and AI
        g.position += g.speed * dt * 4;

        // --- OPPONENT AI ---
        for (const opp of g.opponents) {
          // AI acceleration with natural rhythm
          const phase = Date.now() * 0.0005 + opp.skillLevel * 50;
          const speedVariation = 0.99 + Math.sin(phase) * 0.01;
          const targetSpeed = opp.maxSpeed * speedVariation;
          
          const oppSpeedRatio = opp.speed / opp.maxSpeed;
          const oppAccelFactor = Math.max(0.3, 1 - oppSpeedRatio * 0.6);

          // Launch control: fast ramp so AI gets up to speed quickly
          const reactionDelay = (1 - opp.launchReaction) * 300;
          const effectiveDistance = Math.max(0, opp.distance - reactionDelay);
          const oppLaunchZone = Math.min(1, effectiveDistance / 1500);
          const oppLaunchCurve = oppLaunchZone * oppLaunchZone;
          const oppSpeedCap = opp.maxSpeed * (0.20 + oppLaunchCurve * 0.80);
          
          const effectiveAccel = opp.acceleration * oppAccelFactor;
          
          if (opp.speed < targetSpeed) {
            opp.speed = Math.min(opp.speed + effectiveAccel * dt, oppSpeedCap);
          } else {
            opp.speed = Math.max(opp.speed * (1 - 0.5 * dt), targetSpeed * 0.96);
          }

          // AI steering - follow racing line through curves
          const oppSegIdx = Math.floor(opp.distance / segmentLength) % g.segments.length;
          const oppCurve = g.segments[oppSegIdx]?.curve || 0;
          
          // Look ahead for upcoming curves
          const lookAheadIdx = Math.floor((opp.distance + 400) / segmentLength) % g.segments.length;
          const upcomingCurve = g.segments[lookAheadIdx]?.curve || 0;
          
          // Optimal racing line: steer into curves to stay on track
          const optimalX = -(oppCurve * 0.15 + upcomingCurve * 0.08) * opp.skillLevel;
          // Add personality - organic weaving with multiple frequencies
          const weave1 = Math.sin(opp.distance * 0.001 + opp.skillLevel * 20) * 0.06;
          const weave2 = Math.sin(opp.distance * 0.0004 + opp.skillLevel * 7) * 0.12;
          const personality = weave1 + weave2;
          
          // Random lateral drift: occasionally seek wider positions for overtaking angles
          const driftPhase = Math.sin(opp.distance * 0.0006 + opp.skillLevel * 33);
          const seekingOvertake = driftPhase > 0.3; // ~35% of the time they look for side angles
          let lateralSeek = 0;
          if (seekingOvertake) {
            // Pick a side based on where other cars aren't
            const sidePreference = Math.sin(opp.distance * 0.00025 + opp.skillLevel * 11) > 0 ? 1 : -1;
            lateralSeek = sidePreference * (0.15 + Math.abs(driftPhase) * 0.15); // drift 0.15-0.30 to the side
          }
          
          // Occasional small mistakes: slight overcorrection or hesitation
          let mistake = 0;
          const mistakeChance = Math.sin(opp.distance * 0.00013 + opp.skillLevel * 99);
          if (mistakeChance > 0.85) {
            // Slight overcorrection — drifts a bit too far
            mistake = (Math.random() > 0.5 ? 1 : -1) * 0.08;
          }
          
          // Defensive driving: move to block player's position
          let blockingOffset = 0;
          if (opp.style === 'defensive') {
            const distToPlayer = opp.distance - g.position;
            if (distToPlayer > 0 && distToPlayer < 500) {
              blockingOffset = (g.playerX - opp.x) * 0.3;
            }
          } else if (opp.style === 'aggressive') {
            const aggressiveLine = Math.sin(opp.distance * 0.0008) * 0.15;
            blockingOffset = aggressiveLine;
          }
          
          const rawTarget = optimalX + personality + blockingOffset + lateralSeek + mistake;
          opp.targetX = Math.max(-0.45, Math.min(0.45, rawTarget));
          
          // Capture pre-frame X so we can derive a smoothed body lean for the sprite
          const oppPrevX = opp.x;

          // Smooth steering interpolation
          const oppSteerSpeed = 1.5 * opp.skillLevel * dt;
          opp.x += (opp.targetX - opp.x) * oppSteerSpeed;

          // Curve pushes AI too (same physics as player, rain increases drift)
          const oppSpeedFactor = opp.speed / opp.maxSpeed;
          const oppRainDrift = g.weather.active && g.weather.type === 'rain' ? g.weather.intensity * 0.15 : 0;
          opp.x += oppCurve * oppSpeedFactor * dt * (0.5 + oppRainDrift);

          // Wind affects AI too
          if (g.weather.active && g.weather.type === 'wind') {
            opp.x += g.weather.windDirection * g.weather.intensity * 0.025 * dt;
          }

          opp.x = Math.max(-0.5, Math.min(0.5, opp.x));

          // Smooth lean toward lateral velocity. Multiplier tuned so a tight curve
          // gives ~6-9 deg of roll, and small steering corrections give a subtle wobble.
          const oppLateralVel = (opp.x - oppPrevX) / Math.max(dt, 0.0001);
          const oppTargetTilt = -oppLateralVel * 28;
          opp.tilt += (oppTargetTilt - opp.tilt) * Math.min(1, dt * 8);
          opp.tilt = Math.max(-10, Math.min(10, opp.tilt));
          opp.prevX = oppPrevX;

          // Off-road penalty for AI
          if (Math.abs(opp.x) > 0.42) {
            const offRoadAmount = (Math.abs(opp.x) - 0.42) / 0.58;
            opp.speed *= 1 - offRoadAmount * 0.06;
          }

          // Pothole collision for AI
          for (const hole of g.potholes) {
            const relZ = hole.z - opp.distance;
            if (relZ > -20 && relZ < 20) {
              const dx = Math.abs(opp.x - hole.x);
              if (dx < hole.size + 0.05) {
                opp.speed *= 0.88;
              }
            }
          }

          // Same movement scale as player
          opp.distance += opp.speed * dt * 4;

          // Collision avoidance between opponents - solid body
          for (const other of g.opponents) {
            if (other === opp) continue;
            const distDiff = Math.abs(opp.distance - other.distance);
            const relX = opp.x - other.x;
            const absRelX = Math.abs(relX);
            
            if (distDiff < 160 && absRelX < 0.25) {
              const overlapX = 1 - absRelX / 0.25;
              const overlapZ = 1 - distDiff / 160;
              const overlap = overlapX * overlapZ;
              
              // Strong lateral separation
              const pushDir = relX > 0 ? 1 : -1;
              opp.x += pushDir * (0.6 + overlap * 1.2) * dt;
              other.x -= pushDir * (0.6 + overlap * 1.2) * dt;
              
              // Z separation
              if (distDiff < 80) {
                const zDir = opp.distance > other.distance ? 1 : -1;
                opp.distance += zDir * overlap * 10 * dt;
                other.distance -= zDir * overlap * 10 * dt;
              }
              
              // Drafting bonus when behind another car
              if (opp.distance < other.distance && distDiff < 80 && absRelX < 0.15) {
                opp.speed = Math.min(opp.speed * 1.002, opp.maxSpeed * 1.03);
              }
            }
          }
          
          // Rubber-banding - aggressive catch-up, mild slow-down when ahead
          const distFromPlayer = opp.distance - g.position;
          if (distFromPlayer < -400) {
            const behindFactor = Math.min(1, (-distFromPlayer - 400) / 800);
            opp.speed = Math.min(opp.speed * (1 + behindFactor * 0.004), opp.maxSpeed * 1.06);
          } else if (distFromPlayer > 800) {
            // AI only slows when VERY far ahead
            const aheadFactor = Math.min(1, (distFromPlayer - 800) / 2000);
            opp.speed *= 1 - aheadFactor * 0.001;
          }
        }

        // === UFO EVENT ===
        if (!g.ufo.triggered && g.position >= g.ufo.triggerDistance) {
          g.ufo.triggered = true;
          g.ufo.active = true;
          g.ufo.startTime = performance.now();
          g.ufo.x = W * 0.3 + Math.random() * W * 0.4;
          g.ufo.phase = 0;
        }
        if (g.ufo.active) {
          const elapsed = (performance.now() - g.ufo.startTime) / 1000;
          if (elapsed < 1.5) g.ufo.phase = 0;       // approach
          else if (elapsed < 5) g.ufo.phase = 1;     // hover + beam
          else if (elapsed < 6.5) g.ufo.phase = 2;   // depart
          else g.ufo.active = false;
        }

        // === SHOOTING STARS (random, purely cosmetic) ===
        if (Math.random() < 0.003) {
          const skyH = H * 0.4;
          g.shootingStars.push({
            x: Math.random() * W,
            y: Math.random() * skyH * 0.5,
            vx: 3 + Math.random() * 4,
            vy: 1 + Math.random() * 2,
            life: 0,
            maxLife: 30 + Math.random() * 30,
          });
        }
        for (const star of g.shootingStars) {
          star.x += star.vx;
          star.y += star.vy;
          star.life++;
        }
        g.shootingStars = g.shootingStars.filter(s => s.life < s.maxLife);

        // Mid-race taunts: trigger between 20%-80% of race, spaced at least 8000 units apart
        const raceProgress = g.position / RACE_DISTANCE;
        if (raceProgress > 0.2 && raceProgress < 0.8 && g.position - g.lastTauntDistance > 8000) {
          // Random chance each frame check (~every 5000 units after minimum gap)
          if (Math.random() < 0.008) {
            // Pick an opponent that's near the player (visible)
            const nearOpps = g.opponents
              .map((o, i) => ({ opp: o, idx: i }))
              .filter(({ opp }) => {
                const dist = opp.distance - g.position;
                return dist > -300 && dist < 600; // visible range
              });
            if (nearOpps.length > 0) {
              const pick = nearOpps[Math.floor(Math.random() * nearOpps.length)];
              // Pick unused taunt
              const available = MID_RACE_TAUNTS.filter(t => !g.usedTaunts.has(t));
              const pool = available.length > 0 ? available : MID_RACE_TAUNTS;
              const text = pool[Math.floor(Math.random() * pool.length)];
              g.usedTaunts.add(text);
              g.taunts.push({
                oppIndex: pick.idx,
                text,
                startTime: performance.now(),
                duration: 2500,
              });
              g.lastTauntDistance = g.position;
            }
          }
        }
        // Clean expired taunts
        const now = performance.now();
        g.taunts = g.taunts.filter(t => now - t.startTime < t.duration);

        // Check race completion
        if (g.position >= RACE_DISTANCE && !raceFinished) {
          setRaceFinished(true);
          g.running = false;
          audio.stopEngine();
          audio.stopMusic();
          
          // Build race results with positions and points
          const allCars = [
            { name: car.name, color: car.color, distance: g.position, isPlayer: true },
            ...g.opponents.map(o => ({ name: o.name, color: o.color, distance: o.distance, isPlayer: false })),
          ];
          allCars.sort((a, b) => b.distance - a.distance);
          const results: RaceResult[] = allCars.map((c, i) => ({
            name: c.name,
            color: c.color,
            position: i + 1,
            points: POINTS_BY_POSITION[i] || 0,
            isPlayer: c.isPlayer,
          }));
          
          const playerResult = results.find(r => r.isPlayer);
          setPosition(playerResult?.position || 1);
          
          setTimeout(() => onRaceFinish(results), 2500);
        }
      }

      // Spawn more scenery ahead — sparse
      const lastScenery = g.scenery[g.scenery.length - 1];
      if (lastScenery && g.position + 4000 > lastScenery.z) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const types = track.sceneryTypes;
        const pickType = types[Math.floor(Math.random() * types.length)];
        g.scenery.push({
          x: side * (1.3 + Math.random() * 0.7),
          z: lastScenery.z + 800 + Math.random() * 500,
          type: pickType,
          side,
        });
      }

      // Cleanup old scenery
      g.scenery = g.scenery.filter(s => s.z > g.position - 500);

      // --- ANIMAL CROSSING SYSTEM ---
      if (g.position >= g.nextAnimalDistance && g.raceStarted) {
        const animalTypes: Array<'coyote' | 'snake' | 'roadrunner' | 'scorpion'> = ['coyote', 'snake', 'roadrunner', 'scorpion'];
        const type = animalTypes[Math.floor(Math.random() * animalTypes.length)];
        const dir = Math.random() < 0.5 ? -1 : 1;
        const speedMap = { coyote: 0.012, snake: 0.006, roadrunner: 0.018, scorpion: 0.005 };
        g.animals.push({
          type,
          z: g.position + 600 + Math.random() * 400,
          xPos: dir * -1.8, // start off-road
          xSpeed: speedMap[type],
          direction: dir,
          startTime: performance.now(),
          active: true,
        });
        g.nextAnimalDistance = g.position + 10000 + Math.random() * 20000;
      }
      // Update animals
      for (const animal of g.animals) {
        if (!animal.active) continue;
        animal.xPos += animal.xSpeed * animal.direction * 60 * dt;
        if (Math.abs(animal.xPos) > 2.0 && Math.sign(animal.xPos) === animal.direction) {
          animal.active = false;
        }
      }
      g.animals = g.animals.filter(a => a.active || a.z > g.position - 500);
      // --- WEATHER EVENT SYSTEM ---
      const w = g.weather;
      if (!w.decided && g.position > 3000) {
        w.decided = true;
        // 60% chance of a weather event
        if (Math.random() < 0.6) {
          w.type = Math.random() < 0.5 ? 'rain' : 'wind';
          // Event happens between 20%-60% of race
          w.startDistance = RACE_DISTANCE * (0.15 + Math.random() * 0.15);
          w.endDistance = w.startDistance + RACE_DISTANCE * (0.15 + Math.random() * 0.1);
          if (w.type === 'wind') {
            w.windDirection = Math.random() < 0.5 ? -1 : 1;
          }
        }
      }

      // Update weather state
      if (w.type !== 'none') {
        const preRainZone = w.startDistance - 4000; // clouds build 4000 units before rain
        if (g.position >= preRainZone && g.position < w.startDistance && w.type === 'rain') {
          // Cloud buildup phase
          w.cloudBuildup = Math.min(1, (g.position - preRainZone) / 4000);
          w.active = false;
          w.intensity = 0;
        } else if (g.position >= w.startDistance && g.position <= w.endDistance) {
          // Active weather
          w.active = true;
          const fadeIn = Math.min(1, (g.position - w.startDistance) / 2000);
          const fadeOut = Math.min(1, (w.endDistance - g.position) / 2000);
          w.intensity = Math.min(fadeIn, fadeOut);
          if (w.type === 'rain') w.cloudBuildup = 1;
        } else if (g.position > w.endDistance) {
          // Weather ending
          w.active = false;
          w.intensity = Math.max(0, w.intensity - dt * 0.5);
          w.cloudBuildup = Math.max(0, w.cloudBuildup - dt * 0.3);
          if (w.intensity <= 0 && w.cloudBuildup <= 0) w.type = 'none';
        }

        // Update rain drops
        if (w.type === 'rain' && w.active) {
          // Spawn new drops
          const dropCount = Math.floor(w.intensity * 8);
          for (let i = 0; i < dropCount; i++) {
            if (w.rainDrops.length < 120) {
              w.rainDrops.push({
                x: Math.random() * W,
                y: -10 - Math.random() * 20,
                speed: 400 + Math.random() * 300,
                length: 8 + Math.random() * 12,
              });
            }
          }
          // Move drops
          for (const drop of w.rainDrops) {
            drop.y += drop.speed * dt;
            drop.x -= 30 * dt; // slight angle
          }
          w.rainDrops = w.rainDrops.filter(d => d.y < H + 20);
        }

        // Update tumbleweeds (wind event)
        if (w.type === 'wind' && w.active) {
          // Spawn tumbleweeds occasionally
          if (Math.random() < w.intensity * 0.02) {
            const startX = w.windDirection > 0 ? -40 : W + 40;
            w.tumbleweeds.push({
              x: startX,
              y: H * 0.5 + Math.random() * H * 0.4,
              speed: (80 + Math.random() * 60) * w.windDirection,
              size: 8 + Math.random() * 12,
              rotation: Math.random() * Math.PI * 2,
            });
          }
          // Move tumbleweeds
          for (const tw of w.tumbleweeds) {
            tw.x += tw.speed * dt;
            tw.y += Math.sin(tw.rotation * 3) * 15 * dt;
            tw.rotation += dt * 4;
          }
          w.tumbleweeds = w.tumbleweeds.filter(tw => tw.x > -60 && tw.x < W + 60);
        }
      }

      // Calculate race positions based on absolute distance
      const playerDist = g.position;
      let currentPos = 1;
      for (const opp of g.opponents) {
        if (opp.distance > playerDist) currentPos++;
      }
      setPosition(currentPos);

      // --- RENDERING ---
      const horizonY = H * 0.4;
      const cameraHeight = 1000;
      const cameraDepth = 100;
      const baseRoadWidth = 0.4;
      // Road starts wide and narrows over the first 20% of the race
      const raceProgress = Math.min(1, g.position / (RACE_DISTANCE * 0.2));
      const roadWidthMultiplier = 2.0 - raceProgress * 1.0; // 2.0x → 1.0x
      const roadWidth = baseRoadWidth * roadWidthMultiplier;

      // Sky gradient — from track theme
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, track.sky[0]);
      skyGrad.addColorStop(0.3, track.sky[1]);
      skyGrad.addColorStop(0.6, track.sky[2]);
      skyGrad.addColorStop(0.85, track.sky[3]);
      skyGrad.addColorStop(1, track.sky[4]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY);

      // Sun
      const sunX = W * track.sunX;
      const sunY = horizonY * track.sunY;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 35);
      sunGrad.addColorStop(0, track.sunColor);
      sunGrad.addColorStop(0.6, track.sunGlow);
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fill();

      // === SHOOTING STARS ===
      for (const star of g.shootingStars) {
        const alpha = 1 - star.life / star.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#ffffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x - star.vx * 4, star.y - star.vy * 4);
        ctx.stroke();
        // Bright head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // === UFO EVENT ===
      if (g.ufo.active) {
        const elapsed = (performance.now() - g.ufo.startTime) / 1000;
        const ux = g.ufo.x;
        let uy: number;
        let ufoAlpha = 1;
        
        if (g.ufo.phase === 0) {
          // Approach from top
          const t = elapsed / 1.5;
          uy = -30 + t * (horizonY * 0.25 + 30);
          ufoAlpha = t;
        } else if (g.ufo.phase === 1) {
          // Hover
          uy = horizonY * 0.25 + Math.sin(elapsed * 3) * 4;
          // Gentle sway
          g.ufo.x += Math.sin(elapsed * 2) * 0.3;
        } else {
          // Depart upward
          const t = (elapsed - 5) / 1.5;
          uy = horizonY * 0.25 - t * horizonY * 0.5;
          ufoAlpha = 1 - t;
        }
        uy = uy!;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ufoAlpha));

        // Light beam (during hover phase)
        if (g.ufo.phase === 1) {
          const beamAlpha = 0.12 + Math.sin(elapsed * 5) * 0.05;
          ctx.fillStyle = `rgba(180, 255, 200, ${beamAlpha})`;
          ctx.beginPath();
          ctx.moveTo(ux - 12, uy + 8);
          ctx.lineTo(ux - 50, H);
          ctx.lineTo(ux + 50, H);
          ctx.lineTo(ux + 12, uy + 8);
          ctx.closePath();
          ctx.fill();
        }

        // UFO body — metallic disc
        // Glow
        const glowGrad = ctx.createRadialGradient(ux, uy, 0, ux, uy, 30);
        glowGrad.addColorStop(0, 'rgba(120, 255, 180, 0.3)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(ux, uy, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Disc body
        ctx.fillStyle = '#556';
        ctx.beginPath();
        ctx.ellipse(ux, uy, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Top dome
        ctx.fillStyle = '#889';
        ctx.beginPath();
        ctx.ellipse(ux, uy - 3, 10, 8, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Dome glass
        ctx.fillStyle = 'rgba(150, 255, 200, 0.5)';
        ctx.beginPath();
        ctx.ellipse(ux, uy - 4, 6, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Bottom rim lights
        const lightCount = 6;
        for (let i = 0; i < lightCount; i++) {
          const angle = (i / lightCount) * Math.PI * 2 + elapsed * 3;
          const lx = ux + Math.cos(angle) * 18;
          const ly = uy + Math.sin(angle) * 4;
          const flickr = (Math.sin(elapsed * 10 + i * 2) + 1) * 0.5;
          ctx.fillStyle = `rgba(${100 + flickr * 155}, 255, ${150 + flickr * 105}, ${0.6 + flickr * 0.4})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Underside glow
        ctx.fillStyle = 'rgba(100, 255, 180, 0.15)';
        ctx.beginPath();
        ctx.ellipse(ux, uy + 3, 16, 4, 0, 0, Math.PI);
        ctx.fill();

        ctx.restore();
      }

      if (g.weather.cloudBuildup > 0) {
        const cloudAlpha = g.weather.cloudBuildup * 0.55;
        ctx.fillStyle = `rgba(40, 35, 30, ${cloudAlpha})`;
        ctx.fillRect(0, 0, W, horizonY);
        // Draw individual cloud shapes
        ctx.fillStyle = `rgba(60, 55, 50, ${cloudAlpha * 0.7})`;
        const cloudOffset = (g.position * 0.02) % W;
        for (let i = 0; i < 5; i++) {
          const cx = ((i * W / 4) + cloudOffset) % (W + 100) - 50;
          const cy = horizonY * (0.1 + i * 0.06);
          const cw = 80 + i * 30;
          ctx.beginPath();
          ctx.ellipse(cx, cy, cw, 15 + g.weather.cloudBuildup * 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Mesas/mountains
      ctx.fillStyle = track.mesa;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      const mesaOffset = (g.position * 0.01) % 100;
      for (let x = -50; x <= W + 50; x += 80) {
        const mh = 15 + Math.sin((x + mesaOffset) * 0.02) * 20;
        ctx.lineTo(x, horizonY - mh);
      }
      ctx.lineTo(W + 50, horizonY);
      ctx.closePath();
      ctx.fill();

      // Ground fill
      ctx.fillStyle = track.sand;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Road with segments and curves
      let x = 0;
      let dx = 0;
      
      const drawDistance = 150;
      const segLines: { y: number; x: number; w: number; scale: number; segIdx: number }[] = [];
      
      for (let n = 1; n <= drawDistance; n++) {
        const z = n * 8;
        const perspective = cameraDepth / (cameraDepth + z);
        const projY = horizonY + (H - horizonY) * perspective;
        const scale = perspective * 4;
        
        const segIdx = Math.floor((g.position + z * 3) / segmentLength) % g.segments.length;
        const curve = g.segments[segIdx]?.curve || 0;
        
        dx += curve * perspective * 8;
        x = dx - g.playerX * W * perspective * 0.6;
        
        segLines.push({
          y: projY,
          x: W / 2 + x,
          w: roadWidth * W * scale,
          scale,
          segIdx: Math.floor((g.position + z * 3) / 30),
        });
      }

      // Draw segments from far to near
      for (let i = segLines.length - 1; i > 0; i--) {
        const far = segLines[i];
        const near = segLines[i - 1];
        
        const isAlt = far.segIdx % 2 === 0;
        
        // Ground strip
        ctx.fillStyle = isAlt ? track.sand : track.sandDark;
        ctx.beginPath();
        ctx.moveTo(0, far.y);
        ctx.lineTo(W, far.y);
        ctx.lineTo(W, near.y);
        ctx.lineTo(0, near.y);
        ctx.fill();
        
        // Road
        ctx.fillStyle = isAlt ? track.road : track.roadLight;
        ctx.beginPath();
        ctx.moveTo(far.x - far.w / 2, far.y);
        ctx.lineTo(far.x + far.w / 2, far.y);
        ctx.lineTo(near.x + near.w / 2, near.y);
        ctx.lineTo(near.x - near.w / 2, near.y);
        ctx.fill();
        
        // Rumble strips
        const rumbleW = far.w * 0.08;
        ctx.fillStyle = isAlt ? track.rumble : track.rumbleDark;
        ctx.beginPath();
        ctx.moveTo(far.x - far.w / 2 - rumbleW, far.y);
        ctx.lineTo(far.x - far.w / 2, far.y);
        ctx.lineTo(near.x - near.w / 2, near.y);
        ctx.lineTo(near.x - near.w / 2 - rumbleW * (near.scale / far.scale), near.y);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(far.x + far.w / 2, far.y);
        ctx.lineTo(far.x + far.w / 2 + rumbleW, far.y);
        ctx.lineTo(near.x + near.w / 2 + rumbleW * (near.scale / far.scale), near.y);
        ctx.lineTo(near.x + near.w / 2, near.y);
        ctx.fill();
        
        // Center dashes
        if (far.segIdx % 3 === 0) {
          ctx.fillStyle = '#d4c4a8';
          const dashW = far.w * 0.02;
          ctx.fillRect(far.x - dashW, far.y, dashW * 2, near.y - far.y);
        }
      }

      // Draw start/finish lines
      const startZ = 0 - g.position;
      const finishZ = RACE_DISTANCE - g.position;
      
      const drawFinishLine = (relZ: number, label: string) => {
        if (relZ > 10 && relZ < 1500) {
          const perspective = cameraDepth / (cameraDepth + relZ);
          const screenY = horizonY + (H - horizonY) * perspective;
          
          const zStep = 8;
          let roadDx = 0;
          const steps = Math.max(1, Math.floor(Math.min(relZ, drawDistance * zStep) / zStep));
          for (let n = 1; n <= steps; n++) {
            const z = n * zStep;
            const p = cameraDepth / (cameraDepth + z);
            const segIdx = Math.floor((g.position + z * 3) / segmentLength) % g.segments.length;
            const curve = g.segments[segIdx]?.curve || 0;
            roadDx += curve * p * 8;
          }
          const cameraShiftX = roadDx - g.playerX * W * perspective * 0.6;
          const screenX = W / 2 + cameraShiftX;
          const lineW = roadWidth * W * perspective * 4;
          
          // Checkered pattern
          ctx.fillStyle = '#ffffff';
          const checkSize = lineW / 8;
          for (let c = 0; c < 8; c++) {
            if (c % 2 === 0) {
              ctx.fillRect(screenX - lineW / 2 + c * checkSize, screenY - 4 * perspective, checkSize, 8 * perspective);
            }
          }
          ctx.fillStyle = '#000000';
          for (let c = 0; c < 8; c++) {
            if (c % 2 === 1) {
              ctx.fillRect(screenX - lineW / 2 + c * checkSize, screenY - 4 * perspective, checkSize, 8 * perspective);
            }
          }
        }
      };
      
      drawFinishLine(startZ, 'START');
      drawFinishLine(finishZ, 'FINISH');

      // === RENDER POTHOLES ON ROAD ===
      for (const hole of g.potholes) {
        const relZ = hole.z - g.position;
        if (relZ < 10 || relZ > 1200) continue;

        const perspective = cameraDepth / (cameraDepth + relZ);
        const holeY = horizonY + (H - horizonY) * perspective;

        // Calculate road offset for pothole (same curve logic)
        const zStep = 8;
        const zMax = Math.min(relZ, drawDistance * zStep);
        const steps = Math.max(1, Math.floor(zMax / zStep));
        let roadDx = 0;
        for (let n = 1; n <= steps; n++) {
          const z = n * zStep;
          const p = cameraDepth / (cameraDepth + z);
          const segIdx = Math.floor((g.position + z * 3) / segmentLength) % g.segments.length;
          const curve = g.segments[segIdx]?.curve || 0;
          roadDx += curve * p * 8;
        }
        const cameraShiftX = roadDx - g.playerX * W * perspective * 0.6;
        const holeScreenX = W / 2 + cameraShiftX + hole.x * W * perspective * 0.6;
        const holeW = Math.max(3, hole.size * W * perspective * 0.6);
        const holeH = Math.max(1.5, holeW * 0.35);

        // Dark pothole
        ctx.fillStyle = '#0a0805';
        ctx.beginPath();
        ctx.ellipse(holeScreenX, holeY, holeW, holeH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Rim highlight
        ctx.strokeStyle = 'rgba(100,80,60,0.4)';
        ctx.lineWidth = Math.max(0.5, perspective * 2);
        ctx.beginPath();
        ctx.ellipse(holeScreenX, holeY, holeW + 1, holeH + 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Project function for sprites
      const project = (objX: number, objZ: number) => {
        const relZ = objZ - g.position;
        if (relZ < -100) return null; // Allow cars beside/slightly behind player

        const clampedZ = Math.max(10, relZ);
        const perspective = cameraDepth / (cameraDepth + clampedZ);
        const screenY = horizonY + (H - horizonY) * perspective;

        const zStep = 8;
        const zMax = Math.min(Math.max(0, relZ), drawDistance * zStep);
        const steps = Math.max(1, Math.floor(zMax / zStep));

        let roadDx = 0;
        for (let n = 1; n <= steps; n++) {
          const z = n * zStep;
          const p = cameraDepth / (cameraDepth + z);
          const segIdx = Math.floor((g.position + z * 3) / segmentLength) % g.segments.length;
          const curve = g.segments[segIdx]?.curve || 0;
          roadDx += curve * p * 8;
        }

        const cameraShiftX = roadDx - g.playerX * W * perspective * 0.6;
        const objectShiftX = objX * W * perspective * 0.6;

        const screenX = W / 2 + cameraShiftX + objectShiftX;
        const scale = perspective * 3;

        return { x: screenX, y: screenY, scale, z: relZ };
      };

      // Collect and sort sprites
      const sprites: { x: number; y: number; scale: number; z: number; type: 'scenery' | 'opp'; data: any }[] = [];
      
      for (const scn of g.scenery) {
        const proj = project(scn.x, scn.z);
        if (proj && proj.z < 1500) {
          sprites.push({ ...proj, type: 'scenery', data: scn });
        }
      }
      
      for (const opp of g.opponents) {
        // project() already subtracts g.position, so pass absolute distance
        const proj = project(opp.x, opp.distance);
        if (proj && proj.z > -200 && proj.z < 1500) {
          sprites.push({ ...proj, type: 'opp', data: opp });
        }
      }
      
      sprites.sort((a, b) => b.z - a.z);
      
      // Color helpers
      const darkenHex = (hex: string, amt: number) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amt);
        const g = Math.max(0, ((num >> 8) & 0xff) - amt);
        const b = Math.max(0, (num & 0xff) - amt);
        return `rgb(${r},${g},${b})`;
      };
      const lightenHex = (hex: string, amt: number) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, ((num >> 8) & 0xff) + amt);
        const b = Math.min(255, (num & 0xff) + amt);
        return `rgb(${r},${g},${b})`;
      };

      // Draw sprites
      for (const sprite of sprites) {
        if (sprite.type === 'scenery') {
          const size = Math.max(14, 36 * sprite.scale);
          const scnType = sprite.data.type;
          const sx = sprite.x;
          const sy = sprite.y;
          
          // Ground shadow for all objects
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.ellipse(sx, sy + 1, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
          
          if (scnType === 0) {
            // Oil barrel - rusted
            const bw = size * 0.35;
            const bh = size * 0.6;
            ctx.fillStyle = SCENERY.barrel;
            ctx.fillRect(sx - bw / 2, sy - bh, bw, bh);
            // Bands
            ctx.fillStyle = SCENERY.barrelBand;
            ctx.fillRect(sx - bw / 2 - 1, sy - bh * 0.85, bw + 2, bh * 0.08);
            ctx.fillRect(sx - bw / 2 - 1, sy - bh * 0.2, bw + 2, bh * 0.08);
            // Top rim
            ctx.fillStyle = '#6b4226';
            ctx.beginPath();
            ctx.ellipse(sx, sy - bh, bw / 2, bw * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            
          } else if (scnType === 1) {
            // Warning sign - tilted
            const pw = size * 0.06;
            const ph = size * 0.9;
            // Post
            ctx.fillStyle = SCENERY.signPost;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(-0.08);
            ctx.fillRect(-pw / 2, -ph, pw, ph);
            // Sign plate
            const sw = size * 0.45;
            const sh = size * 0.35;
            ctx.fillStyle = SCENERY.sign;
            ctx.fillRect(-sw / 2, -ph - sh * 0.3, sw, sh);
            // Chevron arrow
            ctx.strokeStyle = SCENERY.signText;
            ctx.lineWidth = Math.max(1.5, size * 0.04);
            ctx.beginPath();
            ctx.moveTo(-sw * 0.15, -ph + sh * 0.15);
            ctx.lineTo(sw * 0.1, -ph - sh * 0.05);
            ctx.lineTo(-sw * 0.15, -ph - sh * 0.2);
            ctx.stroke();
            ctx.restore();
            
          } else if (scnType === 2) {
            // Tumbleweed (bola de feno)
            const r = size * 0.22;
            // Main ball
            ctx.fillStyle = SCENERY.tumbleweed;
            ctx.beginPath();
            ctx.arc(sx, sy - r, r, 0, Math.PI * 2);
            ctx.fill();
            // Inner strands
            ctx.strokeStyle = SCENERY.tumbleweedDark;
            ctx.lineWidth = Math.max(1, size * 0.03);
            for (let a = 0; a < 6; a++) {
              const angle = a * Math.PI / 3;
              ctx.beginPath();
              ctx.arc(sx, sy - r, r * 0.6, angle, angle + 0.8);
              ctx.stroke();
            }
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
          } else if (scnType === 3) {
            // Dry desert bush
            const bw = size * 0.5;
            const bh = size * 0.4;
            ctx.fillStyle = SCENERY.bush;
            // Multiple clustered circles for organic bush shape
            for (let i = 0; i < 5; i++) {
              const ox = (i - 2) * bw * 0.2;
              const oy = -bh * (0.4 + Math.sin(i * 1.5) * 0.25);
              const r = bw * (0.2 + Math.sin(i * 2) * 0.06);
              ctx.beginPath();
              ctx.arc(sx + ox, sy + oy, r, 0, Math.PI * 2);
              ctx.fill();
            }
            // Darker inner detail
            ctx.fillStyle = SCENERY.bushDark;
            for (let i = 0; i < 3; i++) {
              const ox = (i - 1) * bw * 0.15;
              ctx.beginPath();
              ctx.arc(sx + ox, sy - bh * 0.45, bw * 0.1, 0, Math.PI * 2);
              ctx.fill();
            }
            
          } else if (scnType === 4) {
            // Stacked tires
            const tw = size * 0.3;
            const th = size * 0.15;
            for (let i = 0; i < 3; i++) {
              const ty = sy - i * th * 0.85;
              const tx = sx + (i === 1 ? tw * 0.1 : i === 2 ? -tw * 0.05 : 0);
              ctx.fillStyle = SCENERY.tire;
              ctx.beginPath();
              ctx.ellipse(tx, ty - th * 0.5, tw * 0.5, th * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = SCENERY.tireTread;
              ctx.beginPath();
              ctx.ellipse(tx, ty - th * 0.5, tw * 0.3, th * 0.25, 0, 0, Math.PI * 2);
              ctx.fill();
            }

          } else if (scnType === 5) {
            // Abandoned refinery / factory — tall with chimney
            const fw = size * 1.8;
            const fh = size * 2.5;
            // Main building
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(sx - fw / 2, sy - fh, fw, fh);
            // Dark windows
            ctx.fillStyle = '#1a1208';
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                ctx.fillRect(sx - fw * 0.35 + c * fw * 0.28, sy - fh * 0.85 + r * fh * 0.28, fw * 0.15, fh * 0.12);
              }
            }
            // Chimney / smokestack
            const cw = fw * 0.15;
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(sx + fw * 0.15, sy - fh - fh * 0.6, cw, fh * 0.6);
            // Chimney top band
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(sx + fw * 0.13, sy - fh - fh * 0.6, cw * 1.3, fh * 0.05);
            // Roof line
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(sx - fw * 0.55, sy - fh, fw * 1.1, fh * 0.04);

          } else if (scnType === 6) {
            // Water tower — Norco style
            const tw = size * 0.9;
            const th = size * 2.0;
            const tankH = th * 0.35;
            // Legs (4 stilts)
            ctx.fillStyle = '#4a3828';
            const legW = tw * 0.06;
            ctx.fillRect(sx - tw * 0.35, sy - th + tankH, legW, th - tankH);
            ctx.fillRect(sx + tw * 0.3, sy - th + tankH, legW, th - tankH);
            ctx.fillRect(sx - tw * 0.15, sy - th + tankH, legW, th - tankH);
            ctx.fillRect(sx + tw * 0.1, sy - th + tankH, legW, th - tankH);
            // Cross braces
            ctx.strokeStyle = '#4a3828';
            ctx.lineWidth = Math.max(1, size * 0.02);
            ctx.beginPath();
            ctx.moveTo(sx - tw * 0.35, sy - th * 0.3);
            ctx.lineTo(sx + tw * 0.35, sy - th * 0.6);
            ctx.moveTo(sx + tw * 0.35, sy - th * 0.3);
            ctx.lineTo(sx - tw * 0.35, sy - th * 0.6);
            ctx.stroke();
            // Tank
            ctx.fillStyle = '#6b5540';
            ctx.beginPath();
            ctx.ellipse(sx, sy - th + tankH * 0.5, tw * 0.45, tankH * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rust streaks
            ctx.fillStyle = '#8b5a30';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(sx - tw * 0.1, sy - th + tankH * 0.4, tw * 0.04, tankH * 0.4);
            ctx.fillRect(sx + tw * 0.15, sy - th + tankH * 0.3, tw * 0.03, tankH * 0.5);
            ctx.globalAlpha = 1;

          } else if (scnType === 7) {
            // Oil derrick / pump jack silhouette
            const dw = size * 1.2;
            const dh = size * 2.2;
            // Main beam (A-frame)
            ctx.fillStyle = '#2a1a0e';
            ctx.beginPath();
            ctx.moveTo(sx - dw * 0.3, sy);
            ctx.lineTo(sx, sy - dh);
            ctx.lineTo(sx + dw * 0.3, sy);
            ctx.closePath();
            ctx.fill();
            // Walking beam (horizontal arm)
            ctx.fillStyle = '#3a2817';
            ctx.save();
            ctx.translate(sx, sy - dh);
            const pumpAngle = Math.sin(Date.now() * 0.001) * 0.15; // Slow pump motion
            ctx.rotate(pumpAngle);
            ctx.fillRect(-dw * 0.6, -dh * 0.02, dw * 1.2, dh * 0.04);
            // Horse head (pump end)
            ctx.fillStyle = '#2a1a0e';
            ctx.fillRect(-dw * 0.65, -dh * 0.06, dw * 0.12, dh * 0.08);
            ctx.restore();
            // Base platform
            ctx.fillStyle = '#3a2817';
            ctx.fillRect(sx - dw * 0.4, sy - dh * 0.04, dw * 0.8, dh * 0.04);

          } else if (scnType === 8) {
            // Ruined silo / grain elevator
            const sw = size * 0.7;
            const sh = size * 2.8;
            // Main cylinder
            ctx.fillStyle = '#5a4a38';
            ctx.fillRect(sx - sw / 2, sy - sh, sw, sh);
            // Rounded top
            ctx.beginPath();
            ctx.ellipse(sx, sy - sh, sw / 2, sw * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Vertical rust lines
            ctx.fillStyle = '#7a5a3a';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(sx - sw * 0.3, sy - sh * 0.9, sw * 0.04, sh * 0.8);
            ctx.fillRect(sx + sw * 0.1, sy - sh * 0.95, sw * 0.05, sh * 0.85);
            ctx.fillRect(sx - sw * 0.05, sy - sh * 0.7, sw * 0.03, sh * 0.6);
            ctx.globalAlpha = 1;
            // Dark opening (broken door)
            ctx.fillStyle = '#1a1008';
            ctx.fillRect(sx - sw * 0.15, sy - sh * 0.15, sw * 0.3, sh * 0.15);
            // Adjacent smaller structure
            const sw2 = sw * 0.5;
            const sh2 = sh * 0.5;
            ctx.fillStyle = '#4a3a28';
            ctx.fillRect(sx + sw * 0.4, sy - sh2, sw2, sh2);
            ctx.fillStyle = '#1a1008';
            ctx.fillRect(sx + sw * 0.48, sy - sh2 * 0.6, sw2 * 0.3, sh2 * 0.2);
          }
          
          // --- TRACK 2: Twilight Bayou scenery (types 10-13) ---
          else if (scnType === 10) {
            // Dead cypress tree
            const tw = size * 0.08;
            const th = size * 1.8;
            ctx.fillStyle = '#2a1828';
            ctx.fillRect(sx - tw / 2, sy - th, tw, th);
            // Bare branches
            ctx.strokeStyle = '#3a2838';
            ctx.lineWidth = Math.max(1, size * 0.03);
            ctx.beginPath();
            ctx.moveTo(sx, sy - th * 0.7);
            ctx.lineTo(sx - size * 0.3, sy - th * 1.1);
            ctx.moveTo(sx, sy - th * 0.5);
            ctx.lineTo(sx + size * 0.25, sy - th * 0.9);
            ctx.moveTo(sx, sy - th * 0.85);
            ctx.lineTo(sx + size * 0.15, sy - th * 1.15);
            ctx.stroke();
          } else if (scnType === 11) {
            // Lake reflection / water patch
            ctx.fillStyle = 'rgba(80, 50, 120, 0.3)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 2, size * 0.8, size * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(180, 100, 200, 0.15)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 1, size * 0.5, size * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (scnType === 12) {
            // Rusted boat hull
            const bw = size * 0.6;
            const bh = size * 0.35;
            ctx.fillStyle = '#4a2830';
            ctx.beginPath();
            ctx.moveTo(sx - bw / 2, sy);
            ctx.lineTo(sx - bw * 0.3, sy - bh);
            ctx.lineTo(sx + bw * 0.3, sy - bh);
            ctx.lineTo(sx + bw / 2, sy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#6a3848';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(sx - bw * 0.15, sy - bh * 0.8, bw * 0.3, bh * 0.3);
            ctx.globalAlpha = 1;
          } else if (scnType === 13) {
            // Glowing lantern post
            const pw = size * 0.04;
            const ph = size * 1.2;
            ctx.fillStyle = '#3a2838';
            ctx.fillRect(sx - pw / 2, sy - ph, pw, ph);
            // Lantern glow
            ctx.fillStyle = 'rgba(255, 150, 200, 0.4)';
            ctx.beginPath();
            ctx.arc(sx, sy - ph, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffaacc';
            ctx.beginPath();
            ctx.arc(sx, sy - ph, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // --- TRACK 3: Mine scenery (types 20-23) ---
          else if (scnType === 20) {
            // Mine entrance / tunnel
            const mw = size * 0.8;
            const mh = size * 0.9;
            ctx.fillStyle = '#1a1508';
            ctx.fillRect(sx - mw / 2, sy - mh, mw, mh);
            // Timber frame
            ctx.fillStyle = '#4a3518';
            ctx.fillRect(sx - mw / 2 - size * 0.04, sy - mh, size * 0.06, mh);
            ctx.fillRect(sx + mw / 2 - size * 0.02, sy - mh, size * 0.06, mh);
            ctx.fillRect(sx - mw / 2, sy - mh - size * 0.05, mw, size * 0.06);
          } else if (scnType === 21) {
            // Mine cart
            const cw = size * 0.4;
            const ch = size * 0.25;
            ctx.fillStyle = '#5a4830';
            ctx.fillRect(sx - cw / 2, sy - ch, cw, ch);
            // Wheels
            ctx.fillStyle = '#2a2018';
            ctx.beginPath();
            ctx.arc(sx - cw * 0.3, sy, size * 0.05, 0, Math.PI * 2);
            ctx.arc(sx + cw * 0.3, sy, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
            // Ore pile
            ctx.fillStyle = '#3a3028';
            ctx.beginPath();
            ctx.arc(sx, sy - ch * 0.8, cw * 0.25, Math.PI, 0);
            ctx.fill();
          } else if (scnType === 22) {
            // Rock pile / cave-in debris
            ctx.fillStyle = '#3a3020';
            for (let r = 0; r < 4; r++) {
              const rx = sx + (r - 1.5) * size * 0.12;
              const ry = sy - r * size * 0.06;
              const rr = size * (0.08 + Math.sin(r * 2) * 0.03);
              ctx.beginPath();
              ctx.arc(rx, ry - rr, rr, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (scnType === 23) {
            // Headframe tower
            const tw = size * 0.5;
            const th = size * 2.0;
            ctx.fillStyle = '#3a2a18';
            ctx.beginPath();
            ctx.moveTo(sx - tw / 2, sy);
            ctx.lineTo(sx - tw * 0.15, sy - th);
            ctx.lineTo(sx + tw * 0.15, sy - th);
            ctx.lineTo(sx + tw / 2, sy);
            ctx.closePath();
            ctx.fill();
            // Pulley wheel at top
            ctx.strokeStyle = '#5a4830';
            ctx.lineWidth = Math.max(1, size * 0.025);
            ctx.beginPath();
            ctx.arc(sx, sy - th, size * 0.08, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // --- TRACK 4: Off-road scenery (types 30-33) ---
          else if (scnType === 30) {
            // Boulder
            ctx.fillStyle = '#5a5040';
            ctx.beginPath();
            ctx.arc(sx, sy - size * 0.15, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a4030';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(sx - size * 0.05, sy - size * 0.18, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          } else if (scnType === 31) {
            // Broken fence
            ctx.fillStyle = '#5a4830';
            const pw = size * 0.03;
            ctx.fillRect(sx - size * 0.15, sy - size * 0.5, pw, size * 0.5);
            ctx.fillRect(sx + size * 0.12, sy - size * 0.35, pw, size * 0.35);
            // Horizontal rail (broken)
            ctx.fillRect(sx - size * 0.15, sy - size * 0.35, size * 0.2, pw);
          } else if (scnType === 32) {
            // Mud puddle
            ctx.fillStyle = 'rgba(60, 45, 20, 0.5)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + 1, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(80, 65, 30, 0.3)';
            ctx.beginPath();
            ctx.ellipse(sx + size * 0.1, sy, size * 0.2, size * 0.05, 0.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (scnType === 33) {
            // Dead tree stump
            const sw = size * 0.12;
            const sh = size * 0.3;
            ctx.fillStyle = '#3a2a18';
            ctx.fillRect(sx - sw / 2, sy - sh, sw, sh);
            ctx.fillStyle = '#2a1a08';
            ctx.beginPath();
            ctx.ellipse(sx, sy - sh, sw / 2, sw * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Broken branch
            ctx.strokeStyle = '#3a2a18';
            ctx.lineWidth = Math.max(1, size * 0.02);
            ctx.beginPath();
            ctx.moveTo(sx, sy - sh * 0.6);
            ctx.lineTo(sx + size * 0.12, sy - sh * 0.85);
            ctx.stroke();
          }
          
          // --- TRACK 5: Wasteland scenery (types 40-43) ---
          else if (scnType === 40) {
            // Broken pipeline
            const pw = size * 1.5;
            const ph = size * 0.15;
            ctx.fillStyle = '#4a4838';
            ctx.fillRect(sx - pw / 2, sy - size * 0.3, pw, ph);
            // Rust spots
            ctx.fillStyle = '#6a4828';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(sx - pw * 0.2, sy - size * 0.3, pw * 0.08, ph);
            ctx.fillRect(sx + pw * 0.15, sy - size * 0.28, pw * 0.06, ph * 0.7);
            ctx.globalAlpha = 1;
          } else if (scnType === 41) {
            // Collapsed building
            const bw = size * 0.9;
            const bh = size * 0.7;
            ctx.fillStyle = '#3a3830';
            ctx.beginPath();
            ctx.moveTo(sx - bw / 2, sy);
            ctx.lineTo(sx - bw * 0.4, sy - bh);
            ctx.lineTo(sx + bw * 0.1, sy - bh * 0.6);
            ctx.lineTo(sx + bw / 2, sy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#1a1818';
            ctx.fillRect(sx - bw * 0.15, sy - bh * 0.4, bw * 0.2, bh * 0.25);
          } else if (scnType === 42) {
            // Rusted car wreck
            const cw = size * 0.5;
            const ch = size * 0.25;
            ctx.fillStyle = '#5a3828';
            ctx.fillRect(sx - cw / 2, sy - ch, cw, ch);
            // Windshield (broken)
            ctx.fillStyle = '#2a2828';
            ctx.beginPath();
            ctx.moveTo(sx - cw * 0.2, sy - ch);
            ctx.lineTo(sx + cw * 0.2, sy - ch);
            ctx.lineTo(sx + cw * 0.15, sy - ch * 1.5);
            ctx.lineTo(sx - cw * 0.15, sy - ch * 1.5);
            ctx.closePath();
            ctx.fill();
          } else if (scnType === 43) {
            // Smoke stack remnant
            const sw = size * 0.15;
            const sh = size * 1.6;
            ctx.fillStyle = '#4a4840';
            ctx.fillRect(sx - sw / 2, sy - sh, sw, sh);
            // Crumbling top
            ctx.fillStyle = '#3a3830';
            ctx.beginPath();
            ctx.moveTo(sx - sw * 0.8, sy - sh);
            ctx.lineTo(sx, sy - sh - size * 0.15);
            ctx.lineTo(sx + sw * 0.6, sy - sh);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Draw opponent car — REAR VIEW (matching player car style)
          const opp = sprite.data;
          const s = sprite.scale;
          const cx = sprite.x;
          const cy = sprite.y;
          const W2 = Math.max(8, 17 * s);
          const H2 = W2 * 0.6;
          const oppDark = darkenHex(opp.color, 70);
          const oppLight = lightenHex(opp.color, 50);

          // Shadow stays flat on the ground (don't rotate with the body)
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + 2, W2 * 0.55, H2 * 0.14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Body lean: rotate the rest of the sprite around its base for a roll feel.
          const oppDrawTilt = (opp.tilt || 0) * Math.min(1, s * 1.2);
          ctx.save();
          if (oppDrawTilt !== 0) {
            ctx.translate(cx, cy);
            ctx.rotate(oppDrawTilt * Math.PI / 180);
            ctx.translate(-cx, -cy);
          }

          // Pixel-art block helper: fillRect with rounding so blocks stay crisp at any scale.
          const op = (dx: number, dy: number, dw: number, dh: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.round(cx + dx),
              Math.round(cy + dy),
              Math.max(1, Math.round(dw)),
              Math.max(1, Math.round(dh)),
            );
          };

          // Wheels — chunky black blocks with rim highlight
          const oww = Math.max(2, W2 * 0.14);
          const owh = Math.max(3, H2 * 0.6);
          op(-W2/2 - oww, -H2*0.25, oww, owh, SPRITE.TIRE);
          op(W2/2, -H2*0.25, oww, owh, SPRITE.TIRE);
          op(-W2/2 - oww + 1, 0, oww - 2, owh * 0.4, SPRITE.RIM);
          op(W2/2 + 1, 0, oww - 2, owh * 0.4, SPRITE.RIM);

          if (opp.carType === 'thunder') {
            // Low sleek sports — outlined block body, cabin, big spoiler
            op(-W2/2, -H2*0.5, W2, H2*0.7, SPRITE.OUTLINE);
            op(-W2/2 + 1, -H2*0.5 + 1, W2 - 2, H2*0.7 - 2, opp.color);
            op(-W2/2 + 2, -H2*0.5, W2 - 4, H2*0.06, oppLight);
            op(-W2/2 + 1, H2*0.05, W2 - 2, H2*0.1, oppDark);
            // Cabin
            op(-W2*0.3, -H2*0.85, W2*0.6, H2*0.4, SPRITE.OUTLINE);
            op(-W2*0.28, -H2*0.83, W2*0.56, H2*0.36, opp.color);
            op(-W2*0.26, -H2*0.8, W2*0.52, H2*0.28, SPRITE.WINDOW);
            op(-W2*0.24, -H2*0.78, W2*0.48, H2*0.05, SPRITE.WIN_HI);
            // Spoiler
            op(-W2/2 + 2, -H2*0.55, W2 - 4, H2*0.06, SPRITE.OUTLINE);
            // Chunky taillights
            op(-W2*0.4, -H2*0.18, W2*0.18, H2*0.14, SPRITE.TAIL);
            op(W2*0.22, -H2*0.18, W2*0.18, H2*0.14, SPRITE.TAIL);
            op(-W2*0.38, -H2*0.16, W2*0.1, H2*0.04, SPRITE.TAIL_HOT);
            op(W2*0.24, -H2*0.16, W2*0.1, H2*0.04, SPRITE.TAIL_HOT);

          } else if (opp.carType === 'viper') {
            // Wide low supercar — full-width tail bar, side intakes
            op(-W2/2 - 1, -H2*0.45, W2 + 2, H2*0.6, SPRITE.OUTLINE);
            op(-W2/2, -H2*0.45 + 1, W2, H2*0.6 - 2, opp.color);
            op(-W2/2 + 1, -H2*0.45, W2 - 2, H2*0.05, oppLight);
            op(-W2/2, H2*0.05, W2, H2*0.1, oppDark);
            // Side intakes
            op(-W2*0.4, -H2*0.25, W2*0.08, H2*0.18, SPRITE.OUTLINE);
            op(W2*0.32, -H2*0.25, W2*0.08, H2*0.18, SPRITE.OUTLINE);
            // Cabin canopy
            op(-W2*0.25, -H2*0.78, W2*0.5, H2*0.36, SPRITE.OUTLINE);
            op(-W2*0.23, -H2*0.76, W2*0.46, H2*0.32, SPRITE.WINDOW);
            op(-W2*0.21, -H2*0.74, W2*0.42, H2*0.05, SPRITE.WIN_HI);
            // Full-width tail light bar
            op(-W2*0.4, -H2*0.18, W2*0.8, H2*0.1, SPRITE.OUTLINE);
            op(-W2*0.38, -H2*0.16, W2*0.76, H2*0.05, SPRITE.TAIL);

          } else if (opp.carType === 'phantom') {
            // Rally hatch — boxy body, tall greenhouse, mud flaps
            op(-W2/2, -H2*0.55, W2, H2*0.7, SPRITE.OUTLINE);
            op(-W2/2 + 1, -H2*0.55 + 1, W2 - 2, H2*0.7 - 2, opp.color);
            op(-W2/2 + 2, -H2*0.55, W2 - 4, H2*0.06, oppLight);
            op(-W2/2, -H2*0.1, W2*0.1, H2*0.25, oppDark);
            op(W2/2 - W2*0.1, -H2*0.1, W2*0.1, H2*0.25, oppDark);
            // Tall hatch greenhouse
            op(-W2*0.4, -H2*1.05, W2*0.8, H2*0.55, SPRITE.OUTLINE);
            op(-W2*0.38, -H2*1.03, W2*0.76, H2*0.5, opp.color);
            op(-W2*0.36, -H2*1.0, W2*0.72, H2*0.4, SPRITE.WINDOW);
            op(-W2*0.34, -H2*0.98, W2*0.68, H2*0.06, SPRITE.WIN_HI);
            // Roof rack
            op(-W2*0.32, -H2*1.1, W2*0.64, H2*0.05, '#666');
            // Taillights
            op(-W2*0.4, -H2*0.2, W2*0.18, H2*0.14, SPRITE.TAIL);
            op(W2*0.22, -H2*0.2, W2*0.18, H2*0.14, SPRITE.TAIL);
            op(-W2*0.4, -H2*0.05, W2*0.18, H2*0.05, '#ffaa30');
            op(W2*0.22, -H2*0.05, W2*0.18, H2*0.05, '#ffaa30');
            // Mud flaps
            op(-W2/2 - 1, H2*0.1, W2*0.1, H2*0.1, '#181818');
            op(W2/2 - W2*0.1 + 1, H2*0.1, W2*0.1, H2*0.1, '#181818');

          } else {
            // Dirt Beast truck — tall cab, exhaust stack, big bumper
            op(-W2/2, -H2*0.55, W2, H2*0.75, SPRITE.OUTLINE);
            op(-W2/2 + 1, -H2*0.55 + 1, W2 - 2, H2*0.75 - 2, opp.color);
            op(-W2/2 + 2, -H2*0.55, W2 - 4, H2*0.06, oppLight);
            op(-W2/2, -H2*0.1, W2*0.1, H2*0.3, oppDark);
            op(W2/2 - W2*0.1, -H2*0.1, W2*0.1, H2*0.3, oppDark);
            // Tall cab roof
            op(-W2*0.42, -H2*1.1, W2*0.84, H2*0.6, SPRITE.OUTLINE);
            op(-W2*0.4, -H2*1.08, W2*0.8, H2*0.55, opp.color);
            op(-W2*0.38, -H2*1.05, W2*0.76, H2*0.4, SPRITE.WINDOW);
            op(-W2*0.36, -H2*1.03, W2*0.72, H2*0.06, SPRITE.WIN_HI);
            // Exhaust stack
            op(W2*0.3, -H2*1.4, W2*0.08, H2*0.55, SPRITE.OUTLINE);
            op(W2*0.32, -H2*1.35, W2*0.05, H2*0.5, '#444');
            // Taillights
            op(-W2*0.42, -H2*0.22, W2*0.2, H2*0.16, SPRITE.TAIL);
            op(W2*0.22, -H2*0.22, W2*0.2, H2*0.16, SPRITE.TAIL);
            op(-W2*0.4, -H2*0.2, W2*0.12, H2*0.05, SPRITE.TAIL_HOT);
            op(W2*0.24, -H2*0.2, W2*0.12, H2*0.05, SPRITE.TAIL_HOT);
          }

          // Bumper across the bottom for all opponents
          op(-W2/2 + 2, H2*0.12, W2 - 4, H2*0.08, SPRITE.BUMPER);

          ctx.restore(); // close body lean
        }
      }

      // Draw taunt speech bubbles above opponents
      for (const taunt of g.taunts) {
        const opp = g.opponents[taunt.oppIndex];
        if (!opp) continue;
        // Find this opponent's sprite to get screen position
        const oppSprite = sprites.find(sp => sp.type === 'opp' && sp.data === opp);
        if (!oppSprite || oppSprite.scale < 0.3) continue; // too far to show

        const bx = oppSprite.x;
        const by = oppSprite.y - 20 * oppSprite.scale - 14;
        const elapsed = performance.now() - taunt.startTime;
        const fadeIn = Math.min(1, elapsed / 300);
        const fadeOut = Math.max(0, 1 - (elapsed - (taunt.duration - 400)) / 400);
        const alpha = Math.min(fadeIn, fadeOut);
        if (alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.max(8, Math.floor(10 * oppSprite.scale))}px monospace`;
        const metrics = ctx.measureText(taunt.text);
        const pw = metrics.width + 12;
        const ph = Math.max(12, 14 * oppSprite.scale);

        // Bubble background
        const radius = 4;
        ctx.fillStyle = '#f5deb3';
        ctx.beginPath();
        ctx.moveTo(bx - pw / 2 + radius, by - ph);
        ctx.lineTo(bx + pw / 2 - radius, by - ph);
        ctx.quadraticCurveTo(bx + pw / 2, by - ph, bx + pw / 2, by - ph + radius);
        ctx.lineTo(bx + pw / 2, by - radius);
        ctx.quadraticCurveTo(bx + pw / 2, by, bx + pw / 2 - radius, by);
        ctx.lineTo(bx + 4, by);
        ctx.lineTo(bx, by + 5);
        ctx.lineTo(bx - 4, by);
        ctx.lineTo(bx - pw / 2 + radius, by);
        ctx.quadraticCurveTo(bx - pw / 2, by, bx - pw / 2, by - radius);
        ctx.lineTo(bx - pw / 2, by - ph + radius);
        ctx.quadraticCurveTo(bx - pw / 2, by - ph, bx - pw / 2 + radius, by - ph);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = opp.color;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#1a0a00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(taunt.text, bx, by - ph / 2);
        ctx.restore();
      }

      // === DRAW ANIMAL CROSSINGS ===
      for (const animal of g.animals) {
        if (!animal.active) continue;
        const proj = project(animal.xPos, animal.z);
        if (!proj || proj.z < 10 || proj.z > 1200) continue;
        const ax = proj.x;
        const ay = proj.y;
        const as = proj.scale;

        ctx.save();
        ctx.translate(ax, ay);
        const flip = animal.direction > 0 ? 1 : -1;
        ctx.scale(flip, 1);

        if (animal.type === 'coyote') {
          // Simple pixel coyote silhouette
          const sz = Math.max(3, 14 * as);
          // Body
          ctx.fillStyle = '#8b6914';
          ctx.fillRect(-sz, -sz * 0.6, sz * 2, sz * 0.5);
          // Head
          ctx.fillRect(sz * 0.7, -sz * 0.9, sz * 0.5, sz * 0.4);
          // Ears
          ctx.fillStyle = '#6b4e0a';
          ctx.fillRect(sz * 0.85, -sz * 1.15, sz * 0.12, sz * 0.3);
          ctx.fillRect(sz * 1.0, -sz * 1.15, sz * 0.12, sz * 0.3);
          // Legs (animated)
          const legPhase = performance.now() * 0.015;
          ctx.fillStyle = '#7a5e12';
          const legOffset = Math.sin(legPhase) * sz * 0.15;
          ctx.fillRect(-sz * 0.6 + legOffset, -sz * 0.1, sz * 0.15, sz * 0.4);
          ctx.fillRect(-sz * 0.1 - legOffset, -sz * 0.1, sz * 0.15, sz * 0.4);
          ctx.fillRect(sz * 0.3 + legOffset, -sz * 0.1, sz * 0.15, sz * 0.4);
          ctx.fillRect(sz * 0.6 - legOffset, -sz * 0.1, sz * 0.15, sz * 0.4);
          // Tail
          ctx.fillStyle = '#8b6914';
          ctx.fillRect(-sz * 1.1, -sz * 0.7, sz * 0.3, sz * 0.15);
        } else if (animal.type === 'snake') {
          const sz = Math.max(2, 10 * as);
          ctx.strokeStyle = '#556b2f';
          ctx.lineWidth = Math.max(1, sz * 0.15);
          ctx.beginPath();
          const t = performance.now() * 0.008;
          for (let i = 0; i < 8; i++) {
            const sx2 = -sz + i * (sz * 0.3);
            const sy2 = Math.sin(t + i * 0.8) * sz * 0.2;
            if (i === 0) ctx.moveTo(sx2, sy2);
            else ctx.lineTo(sx2, sy2);
          }
          ctx.stroke();
          // Head
          ctx.fillStyle = '#3a5a1a';
          ctx.beginPath();
          ctx.arc(sz * 0.5, Math.sin(t + 5.6) * sz * 0.2, sz * 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else if (animal.type === 'roadrunner') {
          const sz = Math.max(3, 12 * as);
          // Body
          ctx.fillStyle = '#4a6a8a';
          ctx.fillRect(-sz * 0.4, -sz * 0.4, sz * 0.9, sz * 0.35);
          // Head + beak
          ctx.fillStyle = '#5a7a9a';
          ctx.fillRect(sz * 0.3, -sz * 0.6, sz * 0.3, sz * 0.25);
          ctx.fillStyle = '#cc8800';
          ctx.fillRect(sz * 0.55, -sz * 0.52, sz * 0.25, sz * 0.08);
          // Tail feathers
          ctx.fillStyle = '#3a5a7a';
          ctx.fillRect(-sz * 0.8, -sz * 0.35, sz * 0.5, sz * 0.12);
          // Legs (fast animated)
          const lp = performance.now() * 0.025;
          ctx.fillStyle = '#cc6600';
          const lo = Math.sin(lp) * sz * 0.2;
          ctx.fillRect(sz * 0.0 + lo, -sz * 0.05, sz * 0.06, sz * 0.35);
          ctx.fillRect(sz * 0.2 - lo, -sz * 0.05, sz * 0.06, sz * 0.35);
          // Crest
          ctx.fillStyle = '#2a4a6a';
          ctx.fillRect(sz * 0.35, -sz * 0.75, sz * 0.08, sz * 0.18);
        } else {
          // Scorpion
          const sz = Math.max(2, 8 * as);
          ctx.fillStyle = '#8b4513';
          // Body
          ctx.fillRect(-sz * 0.3, -sz * 0.15, sz * 0.6, sz * 0.3);
          // Tail (curled up)
          ctx.strokeStyle = '#8b4513';
          ctx.lineWidth = Math.max(1, sz * 0.1);
          ctx.beginPath();
          ctx.moveTo(-sz * 0.3, -sz * 0.1);
          ctx.quadraticCurveTo(-sz * 0.6, -sz * 0.6, -sz * 0.3, -sz * 0.7);
          ctx.stroke();
          // Stinger
          ctx.fillStyle = '#cc0000';
          ctx.beginPath();
          ctx.arc(-sz * 0.3, -sz * 0.7, sz * 0.06, 0, Math.PI * 2);
          ctx.fill();
          // Pincers
          ctx.fillStyle = '#6b3010';
          ctx.fillRect(sz * 0.25, -sz * 0.3, sz * 0.2, sz * 0.08);
          ctx.fillRect(sz * 0.25, sz * 0.05, sz * 0.2, sz * 0.08);
          // Legs
          const lp2 = performance.now() * 0.012;
          ctx.fillStyle = '#7a4015';
          for (let l = 0; l < 3; l++) {
            const lo2 = Math.sin(lp2 + l) * sz * 0.06;
            ctx.fillRect(-sz * 0.15 + l * sz * 0.15, sz * 0.12 + lo2, sz * 0.05, sz * 0.15);
            ctx.fillRect(-sz * 0.15 + l * sz * 0.15, -sz * 0.25 - lo2, sz * 0.05, sz * 0.12);
          }
        }

        ctx.restore();
      }

      // Draw player car
      const playerY = H - 35;
      const playerScreenX = W / 2;

      // Dust skid puffs sit on the ground, drawn before the car so the car overlaps them
      for (const puff of g.skidTrails) {
        ctx.fillStyle = `rgba(190, 165, 130, ${Math.max(0, puff.alpha)})`;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Speed lines at the screen edges when going fast — purely visual, sells the speed feel
      const renderSpeedFactor = g.speed / playerMaxSpeed;
      if (renderSpeedFactor > 0.55) {
        const lineCount = Math.floor((renderSpeedFactor - 0.5) * 18);
        ctx.strokeStyle = `rgba(255, 245, 220, ${(renderSpeedFactor - 0.5) * 0.45})`;
        ctx.lineWidth = 1;
        const tNow = performance.now() * 0.06;
        for (let i = 0; i < lineCount; i++) {
          const seed = i * 73 + 11;
          const sideLeft = (seed % 2) === 0;
          const sx = sideLeft
            ? (seed * 13) % (W * 0.18)
            : W - (seed * 13) % (W * 0.18);
          const sy = ((seed * 31 + tNow * 60) % H);
          const len = 14 + (seed % 12);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + len);
          ctx.stroke();
        }
      }

      // Body roll comes from smoothed physics (steering input + actual lateral velocity),
      // so the car visibly leans during natural curve drift, not only on key press.
      const tilt = g.playerTilt;

      ctx.save();
      ctx.translate(playerScreenX, playerY);
      ctx.scale(0.75, 0.75);
      ctx.rotate(tilt * Math.PI / 180);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 20, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();




      // === PLAYER CAR — pixel-art rear view, 80's-Overdrive / OutRun style ===
      // All shapes are integer-aligned fillRect blocks with hard outlines and a
      // 3-tone flat palette per body color (no alpha blending on the body).
      const body = car.color;
      const dark = darkenHex(car.color, 70);
      const light = lightenHex(car.color, 55);
      const OUTLINE = '#0a0608';
      const WINDOW = '#1a2c4c';
      const WIN_HI = '#3c6090';
      const TIRE = '#0a0a0a';
      const RIM = '#666';
      const RIM_HI = '#aaa';
      const TAIL = '#ff2010';
      const TAIL_HOT = '#ff8060';
      const BUMPER = '#1a1a1a';
      const r = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };

      if (car.id === 'thunder') {
        // Low sleek sports car — wide stance, big spoiler
        // Wheels
        r(-32, -8, 6, 18, TIRE); r(-31, -4, 4, 12, RIM); r(-30, -2, 2, 4, RIM_HI);
        r(26, -8, 6, 18, TIRE); r(27, -4, 4, 12, RIM); r(28, -2, 2, 4, RIM_HI);
        // Body silhouette + outline
        r(-29, -15, 58, 23, OUTLINE);
        r(-27, -13, 54, 19, body);
        // Lower shadow band
        r(-27, 2, 54, 6, dark);
        // Top highlight band along the deck
        r(-25, -13, 50, 2, light);
        // Cabin
        r(-16, -28, 32, 14, OUTLINE);
        r(-14, -26, 28, 12, body);
        // Rear window (chunky pixels)
        r(-13, -25, 26, 9, WINDOW);
        r(-12, -24, 24, 2, WIN_HI);
        // Roof highlight stripe
        r(-13, -28, 26, 2, light);
        // Spoiler — outlined bar with two posts
        r(-28, -19, 56, 4, OUTLINE);
        r(-26, -18, 52, 2, '#222');
        r(-22, -22, 4, 4, OUTLINE);
        r(18, -22, 4, 4, OUTLINE);
        // Taillights — chunky red blocks with hot center
        r(-22, -8, 11, 5, TAIL); r(-20, -7, 7, 2, TAIL_HOT);
        r(11, -8, 11, 5, TAIL); r(13, -7, 7, 2, TAIL_HOT);
        // Bumper
        r(-26, 6, 52, 3, BUMPER);
        // Twin exhausts
        r(-12, 8, 6, 4, BUMPER); r(-11, 9, 4, 2, '#666');
        r(6, 8, 6, 4, BUMPER); r(7, 9, 4, 2, '#666');
        // Center racing stripe (chunky white block)
        r(-2, -28, 4, 36, light);
        r(-1, -28, 2, 36, '#fff');

      } else if (car.id === 'viper') {
        // Exotic supercar — wide, low, full-width tail bar
        // Wheels
        r(-32, -7, 6, 16, TIRE); r(-31, -3, 4, 10, RIM); r(-30, -1, 2, 4, RIM_HI);
        r(26, -7, 6, 16, TIRE); r(27, -3, 4, 10, RIM); r(28, -1, 2, 4, RIM_HI);
        // Body silhouette + outline
        r(-30, -14, 60, 22, OUTLINE);
        r(-28, -12, 56, 18, body);
        // Side intakes
        r(-26, -8, 4, 8, OUTLINE); r(-25, -7, 2, 6, dark);
        r(22, -8, 4, 8, OUTLINE); r(23, -7, 2, 6, dark);
        // Lower shadow band
        r(-28, 2, 56, 4, dark);
        // Top highlight
        r(-26, -12, 52, 2, light);
        // Cabin / canopy
        r(-12, -25, 24, 11, OUTLINE);
        r(-10, -23, 20, 9, body);
        r(-9, -22, 18, 6, WINDOW);
        r(-8, -21, 16, 2, WIN_HI);
        r(-10, -25, 20, 2, light);
        // Full-width tail bar
        r(-26, -8, 52, 4, OUTLINE);
        r(-24, -7, 48, 2, TAIL);
        r(-22, -6, 44, 1, TAIL_HOT);
        // Bumper / diffuser
        r(-26, 6, 52, 4, BUMPER);
        for (let i = 0; i < 5; i++) r(-22 + i * 10, 7, 4, 2, '#444');
        // Quad center exhausts
        r(-10, 10, 4, 4, BUMPER); r(-4, 10, 4, 4, BUMPER); r(2, 10, 4, 4, BUMPER); r(8, 10, 4, 4, BUMPER);
        r(-9, 11, 2, 2, '#888'); r(-3, 11, 2, 2, '#888'); r(3, 11, 2, 2, '#888'); r(9, 11, 2, 2, '#888');

      } else if (car.id === 'phantom') {
        // Rally hatchback — boxy, tall greenhouse, mud flaps
        // Chunky rally tires
        r(-32, -7, 7, 18, TIRE); r(-31, -3, 5, 12, RIM); r(-30, -1, 3, 4, RIM_HI);
        r(25, -7, 7, 18, TIRE); r(26, -3, 5, 12, RIM); r(27, -1, 3, 4, RIM_HI);
        // Body box
        r(-27, -16, 54, 24, OUTLINE);
        r(-25, -14, 50, 20, body);
        // Fender flares
        r(-25, -2, 4, 12, dark);
        r(21, -2, 4, 12, dark);
        // Top highlight
        r(-23, -14, 46, 2, light);
        // Greenhouse / cabin
        r(-19, -34, 38, 18, OUTLINE);
        r(-17, -32, 34, 16, body);
        // Big hatch window
        r(-16, -31, 32, 13, WINDOW);
        r(-15, -30, 30, 2, WIN_HI);
        // Roof
        r(-19, -36, 38, 4, OUTLINE);
        r(-17, -35, 34, 2, body);
        // Roof rack rails
        r(-16, -38, 32, 2, '#666');
        r(-14, -40, 2, 4, '#444'); r(12, -40, 2, 4, '#444');
        // Rally door number disc
        r(-7, -10, 14, 14, OUTLINE);
        r(-6, -9, 12, 12, '#f0e8d8');
        ctx.fillStyle = '#1a0a00';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('3', 0, -3);
        // Taillights
        r(-23, -10, 10, 6, TAIL); r(-21, -9, 6, 2, TAIL_HOT);
        r(13, -10, 10, 6, TAIL); r(15, -9, 6, 2, TAIL_HOT);
        r(-23, -3, 10, 2, '#ffaa30'); r(13, -3, 10, 2, '#ffaa30');
        // Mud flaps
        r(-30, 6, 6, 6, '#181818');
        r(24, 6, 6, 6, '#181818');
        // Bumper
        r(-24, 4, 48, 4, BUMPER);
        // Off-center rally exhaust
        r(15, 8, 5, 4, '#444');
        r(16, 9, 3, 2, '#aaa');

      } else if (car.id === 'batmobile') {
        // Angular stealth car — bat fins, jet exhaust, narrow canopy slit
        // Wheels
        r(-32, -7, 6, 17, TIRE); r(-31, -3, 4, 10, '#222');
        r(26, -7, 6, 17, TIRE); r(27, -3, 4, 10, '#222');
        // Body silhouette
        r(-30, -16, 60, 24, OUTLINE);
        r(-28, -14, 56, 20, body);
        // Fender shadows
        r(-28, -2, 6, 8, dark);
        r(22, -2, 6, 8, dark);
        // Top highlight
        r(-26, -14, 52, 2, light);
        // Bat fins (left)
        r(-32, -22, 4, 6, OUTLINE); r(-30, -28, 4, 6, OUTLINE);
        r(-30, -22, 2, 4, '#222'); r(-28, -28, 2, 4, '#222');
        // Bat fins (right)
        r(28, -22, 4, 6, OUTLINE); r(26, -28, 4, 6, OUTLINE);
        r(28, -22, 2, 4, '#222'); r(26, -28, 2, 4, '#222');
        // Narrow canopy slit
        r(-15, -23, 30, 8, OUTLINE);
        r(-13, -21, 26, 5, '#1a1a3c');
        r(-12, -20, 24, 1, '#3a4a8c');
        // Center jet thruster
        r(-10, 6, 20, 6, OUTLINE);
        r(-8, 7, 16, 4, '#ff4400');
        r(-6, 8, 12, 2, '#ffaa00');
        r(-3, 9, 6, 1, '#ffeecc');
        // Tail strips
        r(-26, -10, 12, 3, TAIL); r(14, -10, 12, 3, TAIL);
        r(-24, -9, 8, 1, TAIL_HOT); r(16, -9, 8, 1, TAIL_HOT);
        // Bumper
        r(-26, 4, 52, 3, '#0a0a0a');

      } else if (car.id === 'ferrari') {
        // Italian supercar — quad taillights, twin exhausts, big spoiler
        // Wheels with gold caps
        r(-32, -7, 6, 17, TIRE); r(-31, -3, 4, 10, RIM); r(-30, 0, 2, 4, '#cc9900');
        r(26, -7, 6, 17, TIRE); r(27, -3, 4, 10, RIM); r(28, 0, 2, 4, '#cc9900');
        // Body silhouette
        r(-30, -15, 60, 23, OUTLINE);
        r(-28, -13, 56, 19, body);
        // Lower shadow
        r(-28, 2, 56, 4, dark);
        // Top highlight
        r(-26, -13, 52, 2, light);
        // Cabin
        r(-15, -29, 30, 14, OUTLINE);
        r(-13, -27, 26, 12, body);
        // Window
        r(-12, -26, 24, 9, WINDOW);
        r(-11, -25, 22, 2, WIN_HI);
        r(-13, -29, 26, 2, light);
        // Quad chunky taillights (4x4 blocks)
        r(-22, -8, 4, 4, TAIL); r(-22, -2, 4, 4, TAIL);
        r(18, -8, 4, 4, TAIL); r(18, -2, 4, 4, TAIL);
        r(-21, -7, 2, 2, TAIL_HOT); r(-21, -1, 2, 2, TAIL_HOT);
        r(19, -7, 2, 2, TAIL_HOT); r(19, -1, 2, 2, TAIL_HOT);
        // Spoiler
        r(-26, -17, 52, 3, OUTLINE);
        r(-22, -20, 4, 3, OUTLINE);
        r(18, -20, 4, 3, OUTLINE);
        // Twin exhausts
        r(-9, 6, 5, 5, BUMPER); r(-8, 7, 3, 3, '#888');
        r(4, 6, 5, 5, BUMPER); r(5, 7, 3, 3, '#888');
        // Bumper
        r(-26, 6, 52, 3, BUMPER);

      } else {
        // Dirt Beast — big chunky 4x4 truck rear view
        // HUGE off-road tires
        r(-34, -10, 9, 22, TIRE);
        r(25, -10, 9, 22, TIRE);
        // Tire tread chunks
        for (let i = 0; i < 5; i++) {
          r(-34, -9 + i * 4, 9, 2, '#1a1a1a');
          r(25, -9 + i * 4, 9, 2, '#1a1a1a');
        }
        r(-32, -2, 5, 12, RIM); r(-31, 0, 3, 4, RIM_HI);
        r(27, -2, 5, 12, RIM); r(28, 0, 3, 4, RIM_HI);
        // Body box (cab + bed unified)
        r(-26, -18, 52, 26, OUTLINE);
        r(-24, -16, 48, 22, body);
        // Tailgate seam
        r(-22, -14, 44, 1, '#202020');
        // Side shading
        r(-24, -16, 4, 22, dark);
        r(20, -16, 4, 22, dark);
        // Top highlight
        r(-22, -16, 44, 2, light);
        // Cab roof box
        r(-22, -38, 44, 14, OUTLINE);
        r(-20, -36, 40, 12, body);
        // Big rear window
        r(-19, -35, 38, 9, WINDOW);
        r(-18, -34, 36, 2, WIN_HI);
        r(-20, -38, 40, 2, light);
        // Exhaust stack
        r(20, -48, 5, 32, OUTLINE);
        r(21, -46, 3, 28, '#444');
        r(21, -50, 3, 4, '#888');
        // Big rectangular taillights
        r(-22, -10, 11, 7, TAIL); r(-20, -9, 7, 3, TAIL_HOT);
        r(11, -10, 11, 7, TAIL); r(13, -9, 7, 3, TAIL_HOT);
        // Heavy bumper
        r(-26, 6, 52, 5, '#1a1a1a');
        r(-24, 7, 48, 2, '#3a3a3a');
        // Tow hitch
        r(-3, 11, 6, 4, '#444');
        r(-2, 14, 4, 2, '#222');
      }

      // Dust particles when moving fast
      if (g.speed > 150) {
        ctx.fillStyle = 'rgba(180,160,140,0.5)';
        for (let i = 0; i < 5; i++) {
          const px = (Math.random() - 0.5) * 50;
          const py = 15 + Math.random() * 15;
          ctx.beginPath();
          ctx.arc(px, py, 3 + Math.random() * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      // --- WEATHER VISUAL OVERLAY ---
      const ww = g.weather;
      
      // Rain drops
      if (ww.type === 'rain' && ww.rainDrops.length > 0) {
        ctx.strokeStyle = `rgba(180, 200, 220, ${ww.intensity * 0.6})`;
        ctx.lineWidth = 1.5;
        for (const drop of ww.rainDrops) {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 3, drop.y + drop.length);
          ctx.stroke();
        }
        // Wet road shimmer
        if (ww.intensity > 0.3) {
          ctx.fillStyle = `rgba(100, 120, 140, ${ww.intensity * 0.15})`;
          ctx.fillRect(0, H * 0.6, W, H * 0.4);
        }
      }

      // Wind tumbleweeds
      if (ww.type === 'wind' && ww.tumbleweeds.length > 0) {
        for (const tw of ww.tumbleweeds) {
          ctx.save();
          ctx.translate(tw.x, tw.y);
          ctx.rotate(tw.rotation);
          // Draw tumbleweed as rough circle
          ctx.fillStyle = '#a08850';
          ctx.beginPath();
          ctx.arc(0, 0, tw.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#7a6535';
          ctx.lineWidth = 1;
          // Inner lines for texture
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * tw.size * 0.8, Math.sin(angle) * tw.size * 0.8);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Wind dust particles — swirling sand/dust blown across the screen
      if (ww.active && ww.type === 'wind' && ww.intensity > 0.1) {
        const time = performance.now() * 0.001;
        const dustCount = Math.floor(ww.intensity * 25);
        
        // Ground-level dust haze
        const hazeAlpha = ww.intensity * 0.12;
        const hazeGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
        hazeGrad.addColorStop(0, `rgba(180, 160, 120, 0)`);
        hazeGrad.addColorStop(0.5, `rgba(180, 160, 120, ${hazeAlpha})`);
        hazeGrad.addColorStop(1, `rgba(160, 140, 100, ${hazeAlpha * 1.5})`);
        ctx.fillStyle = hazeGrad;
        ctx.fillRect(0, H * 0.7, W, H * 0.3);
        
        // Floating dust motes
        for (let i = 0; i < dustCount; i++) {
          const seed = i * 137.5 + 42;
          const dx = ((seed * 0.7 + time * (60 + i * 8) * ww.windDirection) % (W + 80)) - 40;
          const dy = H * 0.3 + Math.sin(time * 1.5 + seed) * H * 0.25 + (seed % (H * 0.4));
          const dustSize = 1 + Math.sin(seed * 0.3) * 1.5;
          const dustAlpha = (0.15 + Math.sin(time * 2 + seed) * 0.1) * ww.intensity;
          
          ctx.fillStyle = `rgba(200, 180, 140, ${Math.max(0, dustAlpha)})`;
          ctx.beginPath();
          ctx.arc(dx, dy, Math.abs(dustSize), 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Wind streaks
        ctx.strokeStyle = `rgba(200, 190, 170, ${ww.intensity * 0.2})`;
        ctx.lineWidth = 1;
        const streakCount = Math.floor(ww.intensity * 6);
        for (let i = 0; i < streakCount; i++) {
          const sy = H * 0.2 + Math.random() * H * 0.6;
          const sx = Math.random() * W;
          const len = 20 + Math.random() * 40;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + len * ww.windDirection, sy - 2);
          ctx.stroke();
        }
      }

      // Overall rain darkening overlay
      if (ww.type === 'rain' && ww.intensity > 0) {
        ctx.fillStyle = `rgba(20, 25, 30, ${ww.intensity * 0.15})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Update UI
      setScore(Math.floor((g.position / RACE_DISTANCE) * 100));
      setSpeed(Math.floor(g.speed * 1.5)); // Display as km/h (visual scale)

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [car, canvasSize, audio, raceFinished, onRaceFinish, track]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex flex-col items-center justify-center p-2 md:p-4"
      style={{ background: track.sky[0] }}
    >
      {/* HUD */}
      <div 
        className="w-full flex justify-between items-center mb-2 px-2"
        style={{ maxWidth: canvasSize.w }}
      >
        <div className="font-pixel text-xs sm:text-sm" style={{ color: '#c9956c' }}>
          POS: <span style={{ color: position <= 3 ? '#f5deb3' : '#ff6b6b' }}>{position}/5</span>
        </div>
        <div className="font-pixel text-xs sm:text-sm" style={{ color: '#aa9070' }}>
          {track.name}
        </div>
        <div className="font-pixel text-xs sm:text-sm" style={{ color: '#8b5a2b' }}>
          {score}% <span style={{ color: '#6b4423' }}>COMPLETE</span>
        </div>
        <div className="font-pixel text-xs sm:text-sm" style={{ color: '#8b5a2b' }}>
          {speed} <span style={{ color: '#6b4423' }}>KM/H</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="rounded"
        style={{ 
          border: `3px solid ${track.road}`,
          imageRendering: 'pixelated',
          maxWidth: '100%',
        }}
      />

      {/* Progress bar */}
      <div 
        className="w-full mt-2 px-1"
        style={{ maxWidth: canvasSize.w }}
      >
        <div 
          className="h-3 rounded-sm overflow-hidden relative" 
          style={{ background: '#2a1a0f', border: '2px solid #3d2817' }}
        >
          <div 
            className="h-full transition-all duration-75"
            style={{ 
              width: `${score}%`,
              background: 'linear-gradient(90deg, #5c4033, #8b5a2b)',
            }}
          />
          <div 
            className="absolute top-0 right-0 h-full w-1"
            style={{ background: '#f5deb3' }}
          />
        </div>
      </div>

      {/* Mobile Controls - ergonomic layout with pointer events for multi-touch */}
      <div 
        className="flex justify-between items-end w-full px-4 mt-2 md:hidden select-none" 
        style={{ maxWidth: canvasSize.w, touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Left side - steering */}
        <div className="flex gap-2">
          <button
            className="w-20 h-20 rounded-2xl text-3xl font-bold active:scale-90 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #4a3425 0%, #3d2817 100%)',
              border: '3px solid #5c4033',
              color: '#c9956c',
              boxShadow: '0 4px 0 #2a1a0f',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); handleTouch('left', true); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouch('left', false); }}
            onPointerCancel={(e) => { e.preventDefault(); handleTouch('left', false); }}
            onPointerLeave={(e) => { e.preventDefault(); handleTouch('left', false); }}
          >
            ◀
          </button>
          <button
            className="w-20 h-20 rounded-2xl text-3xl font-bold active:scale-90 transition-transform"
            style={{
              background: 'linear-gradient(180deg, #4a3425 0%, #3d2817 100%)',
              border: '3px solid #5c4033',
              color: '#c9956c',
              boxShadow: '0 4px 0 #2a1a0f',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); handleTouch('right', true); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouch('right', false); }}
            onPointerCancel={(e) => { e.preventDefault(); handleTouch('right', false); }}
            onPointerLeave={(e) => { e.preventDefault(); handleTouch('right', false); }}
          >
            ▶
          </button>
        </div>

        {/* Right side - gas pedal */}
        <button
          className="w-24 h-24 rounded-full text-3xl font-bold active:scale-90 transition-transform font-pixel"
          style={{
            background: 'linear-gradient(180deg, #8b5a2b 0%, #5c3317 100%)',
            border: '4px solid #c9956c',
            color: '#f5deb3',
            boxShadow: '0 6px 0 #3d2314, 0 0 20px rgba(201,149,108,0.3)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId); handleTouch('up', true); }}
          onPointerUp={(e) => { e.preventDefault(); handleTouch('up', false); }}
          onPointerCancel={(e) => { e.preventDefault(); handleTouch('up', false); }}
          onPointerLeave={(e) => { e.preventDefault(); handleTouch('up', false); }}
        >
          GAS
        </button>
      </div>

      {/* Desktop hint */}
      <p className="hidden md:block font-retro text-sm mt-3" style={{ color: '#5c4033' }}>
        ← → steer • ↑ accelerate
      </p>

      {/* Countdown overlay */}
      {countdown > 0 && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(26,15,10,0.8)' }}
        >
          <div className="text-center">
            <p className="font-pixel text-6xl animate-pulse" style={{ color: '#f5deb3' }}>
              {countdown}
            </p>
            <p className="font-retro text-xl mt-4" style={{ color: '#8b5a2b' }}>
              GET READY!
            </p>
          </div>
        </div>
      )}

      {/* Race finished overlay */}
      {raceFinished && (
        <div 
          className="absolute inset-0 flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(26,15,10,0.92)' }}
        >
          <div className="text-center">
            <p className="font-pixel text-3xl mb-3" style={{ color: position === 1 ? '#f5deb3' : '#c9956c' }}>
              {position === 1 ? '🏆 WINNER!' : `FINISHED ${position}${position === 2 ? 'ND' : position === 3 ? 'RD' : 'TH'}`}
            </p>
            <p className="font-retro text-2xl" style={{ color: '#8b5a2b' }}>
              Position: {position}/{gameRef.current.opponents.length + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RacingGame;
