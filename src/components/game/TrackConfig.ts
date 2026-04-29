export interface TrackTheme {
  id: string;
  name: string;
  sky: string[];
  ground: string;
  road: string;
  roadLight: string;
  rumble: string;
  rumbleDark: string;
  sand: string;
  sandDark: string;
  mesa: string;
  sunColor: string;
  sunGlow: string;
  sunX: number; // 0-1 fraction of width
  sunY: number; // 0-1 fraction of horizon
  sceneryTypes: number[]; // which scenery types to spawn
  segmentPattern: { curveAt: number[]; curveValues: number[]; cycleLength: number };
}

export const TRACKS: TrackTheme[] = [
  {
    // Track 1: Desert (current)
    id: 'desert',
    name: 'DUSTBOWL FLATS',
    sky: ['#1a0f0a', '#2c1810', '#4a2c17', '#8b5a2b', '#c9956c'],
    ground: '#5c4033',
    road: '#3d2817',
    roadLight: '#4a3425',
    rumble: '#8b7355',
    rumbleDark: '#5c4033',
    sand: '#c9956c',
    sandDark: '#b8956c',
    mesa: '#3d2317',
    sunColor: '#ffd93d',
    sunGlow: '#ff9500',
    sunX: 0.7,
    sunY: 0.4,
    sceneryTypes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    segmentPattern: { curveAt: [18, 19, 20, 21, 38, 39, 40, 41, 42], curveValues: [2.8, 2.8, 2.8, 2.8, -2.5, -2.5, -2.5, -2.5, -2.5], cycleLength: 50 },
  },
  {
    // Track 2: Twilight Lake — purple/pink Norco sky
    id: 'twilight',
    name: 'TWILIGHT BAYOU',
    sky: ['#0a0818', '#1a1040', '#3a1858', '#8a3070', '#d46090'],
    ground: '#2a2038',
    road: '#2a1830',
    roadLight: '#352040',
    rumble: '#6a4878',
    rumbleDark: '#3a2848',
    sand: '#4a3858',
    sandDark: '#3a2848',
    mesa: '#1a1028',
    sunColor: '#ff6090',
    sunGlow: '#d040a0',
    sunX: 0.5,
    sunY: 0.55,
    sceneryTypes: [10, 11, 12, 13],
    segmentPattern: { curveAt: [12, 13, 14, 30, 31, 32, 33], curveValues: [2.2, 2.2, 2.2, -2.8, -2.8, -2.8, -2.8], cycleLength: 45 },
  },
  {
    // Track 3: Abandoned Mine
    id: 'mine',
    name: 'BLACK SHAFT PASS',
    sky: ['#0a0a0a', '#1a1810', '#2a2818', '#3a3520', '#504830'],
    ground: '#2a2218',
    road: '#1a1810',
    roadLight: '#222018',
    rumble: '#5a4830',
    rumbleDark: '#3a3020',
    sand: '#3a3020',
    sandDark: '#2a2218',
    mesa: '#1a1508',
    sunColor: '#aa8840',
    sunGlow: '#886630',
    sunX: 0.3,
    sunY: 0.3,
    sceneryTypes: [20, 21, 22, 23],
    segmentPattern: { curveAt: [8, 9, 10, 22, 23, 24, 25, 36, 37], curveValues: [3.2, 3.2, 3.2, -2.5, -2.5, -2.5, -2.5, 1.8, 1.8], cycleLength: 42 },
  },
  {
    // Track 4: Off-road Badlands — bumpy and rough
    id: 'offroad',
    name: 'BROKEN RIDGE',
    sky: ['#1a1008', '#2c2010', '#4a3818', '#7a5828', '#a08040'],
    ground: '#4a3820',
    road: '#3a2a15',
    roadLight: '#453218',
    rumble: '#7a6040',
    rumbleDark: '#5a4830',
    sand: '#8a7048',
    sandDark: '#6a5838',
    mesa: '#2a1a08',
    sunColor: '#dda830',
    sunGlow: '#bb8820',
    sunX: 0.8,
    sunY: 0.35,
    sceneryTypes: [30, 31, 32, 33],
    segmentPattern: { curveAt: [6, 7, 15, 16, 17, 25, 26, 27, 28], curveValues: [2.0, 2.0, -3.0, -3.0, -3.0, 2.5, 2.5, 2.5, 2.5], cycleLength: 35 },
  },
  {
    // Track 5: Industrial Wasteland — refinery ruins
    id: 'wasteland',
    name: 'PIPELINE GRAVEYARD',
    sky: ['#0c0c0c', '#1a1a18', '#2a2820', '#4a4538', '#6a6050'],
    ground: '#3a3830',
    road: '#282520',
    roadLight: '#302d28',
    rumble: '#5a5548',
    rumbleDark: '#3a3830',
    sand: '#4a4838',
    sandDark: '#3a3830',
    mesa: '#1a1818',
    sunColor: '#888070',
    sunGlow: '#665e50',
    sunX: 0.6,
    sunY: 0.5,
    sceneryTypes: [40, 41, 42, 43],
    segmentPattern: { curveAt: [15, 16, 17, 18, 35, 36, 37], curveValues: [2.0, 2.0, 2.0, 2.0, -2.2, -2.2, -2.2], cycleLength: 48 },
  },
];

export interface RaceResult {
  name: string;
  color: string;
  position: number;
  points: number;
  isPlayer: boolean;
}

export const POINTS_BY_POSITION = [25, 18, 15, 12, 10];

export const OPPONENT_NAMES = ['BLAZE', 'FROST', 'SHADOW', 'DUSTER'];
