import React, { useState, useEffect } from 'react';

// Darker shade helper
const darken = (hex: string, amt: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0xff) - amt);
  const b = Math.max(0, (num & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
};
const lighten = (hex: string, amt: number) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0xff) + amt);
  const b = Math.min(255, (num & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
};

const PixelCar: React.FC<{ color: string; carId: string; size?: number }> = ({ color, carId, size = 48 }) => {
  const dark = darken(color, 60);
  const highlight = lighten(color, 50);
  const w = size * 1.8;
  const h = size;

  if (carId === 'thunder') {
    // Low sleek F1/sports car — side view
    return (
      <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
        {/* Shadow */}
        <ellipse cx="40" cy="38" rx="30" ry="2.5" fill="rgba(0,0,0,0.25)" />
        {/* Underbody */}
        <rect x="8" y="28" width="64" height="3" rx="1" fill="#222" />
        {/* Body - very low profile */}
        <path d="M6 28 L10 20 L28 16 L38 12 L52 12 L62 16 L74 20 L76 28 Z" fill={color} />
        {/* Roof line */}
        <path d="M28 16 L38 12 L52 12 L62 16" fill="none" stroke={dark} strokeWidth="0.5" />
        {/* Body shading - bottom */}
        <path d="M6 28 L10 24 L70 24 L76 28 Z" fill={dark} opacity="0.25" />
        {/* Hood highlight */}
        <path d="M12 22 L28 17 L38 13 L38 17 L12 24 Z" fill={highlight} opacity="0.2" />
        {/* Windshield */}
        <path d="M38 12 L44 12 L48 16 L36 16 Z" fill="#1a3a5c" />
        <path d="M39 13 L43 13 L46 15.5 L37 15.5 Z" fill="#2a6a9c" opacity="0.5" />
        {/* Rear window */}
        <path d="M52 12 L58 16 L50 16 Z" fill="#1a3a5c" />
        {/* Spoiler */}
        <rect x="68" y="17" width="8" height="2" rx="1" fill="#333" />
        <rect x="70" y="15" width="2" height="4" rx="0.5" fill="#444" />
        {/* Front wheel */}
        <circle cx="20" cy="30" r="6" fill="#1a1a1a" />
        <circle cx="20" cy="30" r="4" fill="#333" />
        <circle cx="20" cy="30" r="2" fill="#666" />
        {/* Rear wheel */}
        <circle cx="62" cy="30" r="6" fill="#1a1a1a" />
        <circle cx="62" cy="30" r="4" fill="#333" />
        <circle cx="62" cy="30" r="2" fill="#666" />
        {/* Headlight */}
        <path d="M6 26 L8 22 L10 22 L8 28 Z" fill="#ffee88" />
        {/* Taillight */}
        <rect x="74" y="22" width="2" height="4" rx="0.5" fill="#ff3333" />
        {/* Racing stripe */}
        <rect x="10" y="19" width="62" height="1.5" fill={highlight} opacity="0.15" />
        {/* Exhaust */}
        <circle cx="76" cy="28" r="1.5" fill="#555" />
      </svg>
    );
  }

  if (carId === 'viper') {
    return (
      <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
        <ellipse cx="40" cy="38" rx="28" ry="2.5" fill="rgba(0,0,0,0.25)" />
        <rect x="10" y="28" width="60" height="3" rx="1" fill="#222" />
        <path d="M8 28 L12 22 L24 18 L34 14 L44 11 L54 11 L60 14 L68 18 L72 22 L74 28 Z" fill={color} />
        <path d="M8 28 L14 24 L68 24 L74 28 Z" fill={dark} opacity="0.3" />
        <path d="M34 14 L44 11 L54 11 L60 14 L50 13 L40 13 Z" fill={highlight} opacity="0.3" />
        <path d="M18 21 L26 18 L30 18 L24 21 Z" fill={dark} opacity="0.3" />
        <path d="M40 12 L48 11 L54 14 L42 14 Z" fill="#1a3a5c" />
        <path d="M41 12.5 L47 11.5 L52 13.5 L43 13.5 Z" fill="#2a6a9c" opacity="0.5" />
        <path d="M54 14 L60 17 L56 17 Z" fill="#1a3a5c" opacity="0.8" />
        <path d="M56 20 L64 20 L66 24 L56 24 Z" fill="#111" opacity="0.4" />
        <circle cx="22" cy="30" r="6" fill="#1a1a1a" />
        <circle cx="22" cy="30" r="4" fill="#333" />
        <circle cx="22" cy="30" r="1.5" fill="#999" />
        <circle cx="60" cy="30" r="7" fill="#1a1a1a" />
        <circle cx="60" cy="30" r="5" fill="#333" />
        <circle cx="60" cy="30" r="2" fill="#999" />
        <path d="M8 26 L10 22 L12 22 L10 28 Z" fill="#ffee88" />
        <rect x="72" y="22" width="2.5" height="5" rx="1" fill="#ff3333" />
        <circle cx="74" cy="27" r="1.2" fill="#555" />
        <circle cx="74" cy="29" r="1.2" fill="#555" />
      </svg>
    );
  }

  if (carId === 'phantom') {
    return (
      <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
        <ellipse cx="40" cy="38" rx="28" ry="2.5" fill="rgba(0,0,0,0.25)" />
        <rect x="12" y="29" width="56" height="2.5" rx="1" fill="#222" />
        <path d="M10 30 L14 22 L22 18 L30 16 L50 14 L58 14 L64 18 L70 22 L72 30 Z" fill={color} />
        <path d="M10 30 L16 25 L66 25 L72 30 Z" fill={dark} opacity="0.25" />
        <path d="M30 16 L50 14 L58 14 L64 18 L32 18 Z" fill={highlight} opacity="0.15" />
        <path d="M34 16 L44 14 L50 14 L46 18 L34 18 Z" fill="#1a3a5c" />
        <path d="M35 16.5 L43 14.5 L48 14.5 L45 17.5 L35 17.5 Z" fill="#2a6a9c" opacity="0.5" />
        <path d="M56 14.5 L62 17 L56 17 Z" fill="#1a3a5c" />
        <circle cx="40" cy="23" r="3.5" fill="white" opacity="0.85" />
        <text x="40" y="25" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#222">3</text>
        <rect x="10" y="17" width="10" height="2" rx="1" fill="#444" />
        <circle cx="12" cy="18" r="1.5" fill="#ffee88" />
        <circle cx="15" cy="18" r="1.5" fill="#ffee88" />
        <circle cx="18" cy="18" r="1.5" fill="#ffee88" />
        <line x1="42" y1="17" x2="42" y2="28" stroke={dark} strokeWidth="0.5" opacity="0.4" />
        <circle cx="22" cy="31" r="7" fill="#1a1a1a" />
        <circle cx="22" cy="31" r="5" fill="#333" />
        <circle cx="22" cy="31" r="2.5" fill="#777" />
        <circle cx="60" cy="31" r="7" fill="#1a1a1a" />
        <circle cx="60" cy="31" r="5" fill="#333" />
        <circle cx="60" cy="31" r="2.5" fill="#777" />
        <rect x="28" y="30" width="3" height="4" rx="0.5" fill="#333" />
        <rect x="70" y="22" width="2" height="4" rx="0.5" fill="#ff3333" />
        <circle cx="72" cy="29" r="1.5" fill="#555" />
      </svg>
    );
  }

  if (carId === 'batmobile') {
    // Batmobile — aggressive angular stealth car
    return (
      <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
        <ellipse cx="40" cy="38" rx="32" ry="2.5" fill="rgba(0,0,0,0.35)" />
        <rect x="6" y="28" width="68" height="3" rx="1" fill="#111" />
        {/* Body - angular stealth */}
        <path d="M4 28 L8 20 L18 16 L30 13 L40 10 L50 10 L58 13 L68 16 L74 20 L78 28 Z" fill={color} />
        {/* Sharp angular panels */}
        <path d="M4 28 L10 23 L70 23 L78 28 Z" fill="#0a0a0a" opacity="0.4" />
        {/* Bat fins */}
        <path d="M62 16 L72 8 L70 16 Z" fill="#1a1a1a" />
        <path d="M60 16 L68 10 L67 16 Z" fill="#222" />
        {/* Cockpit - narrow slit */}
        <path d="M36 11 L44 10 L50 10 L48 14 L36 14 Z" fill="#1a1a3c" />
        <path d="M37 11.5 L43 10.5 L48 10.5 L47 13.5 L37 13.5 Z" fill="#2a3a6c" opacity="0.4" />
        {/* Turbine intake */}
        <path d="M14 22 L22 18 L26 18 L20 22 Z" fill="#0a0a0a" opacity="0.5" />
        {/* Armor lines */}
        <line x1="30" y1="13" x2="28" y2="26" stroke="#333" strokeWidth="0.5" opacity="0.5" />
        <line x1="50" y1="10" x2="52" y2="26" stroke="#333" strokeWidth="0.5" opacity="0.5" />
        {/* Front wheel - armored */}
        <circle cx="20" cy="30" r="6.5" fill="#0a0a0a" />
        <circle cx="20" cy="30" r="4.5" fill="#222" />
        <circle cx="20" cy="30" r="2" fill="#444" />
        {/* Rear wheel - armored */}
        <circle cx="62" cy="30" r="7" fill="#0a0a0a" />
        <circle cx="62" cy="30" r="5" fill="#222" />
        <circle cx="62" cy="30" r="2.5" fill="#444" />
        {/* Jet exhaust */}
        <ellipse cx="78" cy="24" rx="2" ry="3" fill="#ff6600" opacity="0.6" />
        <ellipse cx="79" cy="24" rx="1" ry="2" fill="#ffcc00" opacity="0.4" />
        {/* Headlights - narrow slits */}
        <rect x="5" y="22" width="4" height="1.5" rx="0.5" fill="#aaddff" />
        {/* Taillights */}
        <rect x="74" y="20" width="3" height="2" rx="0.5" fill="#ff2200" />
      </svg>
    );
  }

  if (carId === 'ferrari') {
    // Ferrari — elegant Italian supercar
    return (
      <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
        <ellipse cx="40" cy="38" rx="30" ry="2.5" fill="rgba(0,0,0,0.3)" />
        <rect x="8" y="28" width="64" height="3" rx="1" fill="#222" />
        {/* Body - elegant curves */}
        <path d="M6 28 L10 21 L22 17 L32 13 L42 10 L52 10 L58 12 L66 16 L72 20 L76 28 Z" fill={color} />
        {/* Body shading */}
        <path d="M6 28 L12 24 L68 24 L76 28 Z" fill={dark} opacity="0.3" />
        {/* Hood curve highlight */}
        <path d="M12 22 L22 17 L32 13 L42 10 L42 14 L12 24 Z" fill={highlight} opacity="0.25" />
        {/* Prancing horse area */}
        <circle cx="18" cy="20" r="2.5" fill="#ffd700" opacity="0.6" />
        {/* Windshield */}
        <path d="M38 11 L46 10 L52 10 L50 14 L38 14 Z" fill="#1a3a5c" />
        <path d="M39 11.5 L45 10.5 L50 10.5 L49 13.5 L39 13.5 Z" fill="#2a6a9c" opacity="0.5" />
        {/* Side scoop */}
        <path d="M52 14 L58 16 L60 20 L52 20 Z" fill="#111" opacity="0.4" />
        {/* Elegant side line */}
        <path d="M10 22 L72 22" stroke={highlight} strokeWidth="0.8" opacity="0.3" />
        {/* Front wheel */}
        <circle cx="22" cy="30" r="6" fill="#1a1a1a" />
        <circle cx="22" cy="30" r="4" fill="#333" />
        <circle cx="22" cy="30" r="1.5" fill="#cc9900" />
        {/* Rear wheel */}
        <circle cx="62" cy="30" r="6.5" fill="#1a1a1a" />
        <circle cx="62" cy="30" r="4.5" fill="#333" />
        <circle cx="62" cy="30" r="2" fill="#cc9900" />
        {/* Headlight */}
        <path d="M6 25 L8 21 L10 21 L8 27 Z" fill="#ffee88" />
        {/* Quad taillights */}
        <circle cx="73" cy="22" r="1.2" fill="#ff2200" />
        <circle cx="73" cy="25" r="1.2" fill="#ff2200" />
        <circle cx="75" cy="22" r="1.2" fill="#ff2200" />
        <circle cx="75" cy="25" r="1.2" fill="#ff2200" />
        {/* Dual exhaust */}
        <circle cx="75" cy="27.5" r="1" fill="#555" />
        <circle cx="75" cy="29.5" r="1" fill="#555" />
      </svg>
    );
  }

  // Beast - chunky off-road truck — side view
  return (
    <svg width={w} height={h} viewBox="0 0 80 40" fill="none">
      <ellipse cx="40" cy="39" rx="30" ry="2" fill="rgba(0,0,0,0.25)" />
      <rect x="10" y="28" width="62" height="4" rx="1" fill="#333" />
      <path d="M8 28 L12 14 L26 10 L34 8 L46 8 L46 12 L68 12 L72 16 L74 28 Z" fill={color} />
      <path d="M8 28 L12 22 L72 22 L74 28 Z" fill={dark} opacity="0.2" />
      <path d="M26 10 L34 8 L46 8 L46 12 L28 12 Z" fill={highlight} opacity="0.15" />
      <rect x="46" y="12" width="22" height="3" fill={dark} opacity="0.2" />
      <rect x="46" y="12" width="22" height="1" fill="#444" opacity="0.5" />
      <path d="M30 9 L40 8 L46 8 L46 12 L34 12 Z" fill="#1a3a5c" />
      <path d="M32 9.5 L39 8.5 L44 8.5 L44 11.5 L35 11.5 Z" fill="#2a6a9c" opacity="0.5" />
      <rect x="47" y="13" width="6" height="3" rx="0.5" fill="#1a3a5c" opacity="0.6" />
      <rect x="6" y="20" width="6" height="2" rx="0.5" fill="#666" />
      <rect x="6" y="16" width="2" height="8" rx="0.5" fill="#666" />
      <rect x="10" y="16" width="2" height="8" rx="0.5" fill="#666" />
      <rect x="8" y="18" width="3" height="3" rx="1" fill="#ffee88" />
      <rect x="30" y="26" width="14" height="1.5" rx="0.5" fill="#555" />
      <circle cx="22" cy="32" r="8" fill="#1a1a1a" />
      <circle cx="22" cy="32" r="6" fill="#2a2a2a" />
      <circle cx="22" cy="32" r="3" fill="#777" />
      <circle cx="62" cy="32" r="8" fill="#1a1a1a" />
      <circle cx="62" cy="32" r="6" fill="#2a2a2a" />
      <circle cx="62" cy="32" r="3" fill="#777" />
      <rect x="72" y="16" width="2.5" height="4" rx="0.5" fill="#ff3333" />
      <rect x="44" y="4" width="3" height="8" rx="1" fill="#444" />
      <ellipse cx="45.5" cy="4" rx="2" ry="1" fill="#555" />
    </svg>
  );
};

interface Car {
  id: string;
  name: string;
  speed: number;
  handling: number;
  acceleration: number;
  color: string;
  emoji: string;
  secret?: boolean;
}

interface CarSelectScreenProps {
  onSelect: (car: Car) => void;
}

const baseCars: Car[] = [
  {
    id: 'thunder',
    name: 'THUNDER GT',
    speed: 90,
    handling: 60,
    acceleration: 75,
    color: '#e63946',
    emoji: '🏎️',
  },
  {
    id: 'viper',
    name: 'VIPER X',
    speed: 95,
    handling: 50,
    acceleration: 80,
    color: '#f0c030',
    emoji: '🚗',
  },
  {
    id: 'phantom',
    name: 'RALLY PRO',
    speed: 70,
    handling: 95,
    acceleration: 85,
    color: '#f4a261',
    emoji: '🚙',
  },
  {
    id: 'beast',
    name: 'DIRT BEAST',
    speed: 65,
    handling: 80,
    acceleration: 60,
    color: '#2d5a27',
    emoji: '🛻',
  },
];

const secretCars: Car[] = [
  {
    id: 'batmobile',
    name: 'BATMOBILE',
    speed: 92,
    handling: 88,
    acceleration: 90,
    color: '#1a1a2e',
    emoji: '🦇',
    secret: true,
  },
  {
    id: 'ferrari',
    name: 'FERRARI F40',
    speed: 95,
    handling: 75,
    acceleration: 92,
    color: '#cc0000',
    emoji: '🐎',
    secret: true,
  },
];

const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="font-pixel text-[8px] w-10" style={{ color: '#8b6f47' }}>{label}</span>
    <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: '#2a1a0f', border: '2px solid #3d2817' }}>
      <div 
        className="h-full transition-all duration-300"
        style={{ 
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        }}
      />
    </div>
  </div>
);

const CarSelectScreen: React.FC<CarSelectScreenProps> = ({ onSelect }) => {
  const [unlockedSecrets, setUnlockedSecrets] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('unlockedCars');
      if (saved) setUnlockedSecrets(JSON.parse(saved));
    } catch {}
  }, []);

  const allCars = [
    ...baseCars,
    ...secretCars.map(c => ({
      ...c,
      locked: !unlockedSecrets.includes(c.id),
    })),
  ];

  const [selectedId, setSelectedId] = useState<string>(baseCars[0].id);
  const selectedCar = allCars.find(c => c.id === selectedId)!;
  const isLocked = 'locked' in selectedCar && (selectedCar as any).locked;

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-auto"
      style={{
        background: 'linear-gradient(180deg, #1a0f0a 0%, #2c1810 50%, #3d2817 100%)',
      }}
    >
      {/* Desert sun glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 300,
          height: 150,
          background: 'radial-gradient(ellipse at center, rgba(201,149,108,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Title */}
      <h1 
        className="font-pixel text-xl sm:text-2xl mb-6"
        style={{
          color: '#e8c49a',
          textShadow: '3px 3px 0 #1a0f0a',
        }}
      >
        SELECT YOUR RIDE
      </h1>

      {/* Car Grid - 3 columns for 6 cars */}
      <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-lg">
        {allCars.map((carItem) => {
          const locked = 'locked' in carItem && (carItem as any).locked;
          return (
            <div
              key={carItem.id}
              className={`p-3 rounded transition-all duration-200 ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
              style={{
                background: locked
                  ? 'linear-gradient(180deg, #151010 0%, #0a0808 100%)'
                  : selectedId === carItem.id 
                    ? 'linear-gradient(180deg, #4a3425 0%, #3d2817 100%)'
                    : 'linear-gradient(180deg, #2a1a0f 0%, #1a0f0a 100%)',
                border: `3px solid ${locked ? '#222' : selectedId === carItem.id ? '#c9956c' : '#3d2817'}`,
                boxShadow: selectedId === carItem.id ? '0 0 20px rgba(201,149,108,0.2)' : 'none',
                opacity: locked ? 0.5 : 1,
              }}
              onClick={() => !locked && setSelectedId(carItem.id)}
            >
              <div className="flex justify-center mb-2 relative">
                {locked ? (
                  <div className="flex items-center justify-center" style={{ width: 86, height: 48 }}>
                    <span className="text-2xl">🔒</span>
                  </div>
                ) : (
                  <PixelCar color={carItem.color} carId={carItem.id} size={48} />
                )}
              </div>
              <h3 
                className="font-pixel text-[8px] text-center"
                style={{ color: locked ? '#444' : selectedId === carItem.id ? carItem.color : '#8b6f47' }}
              >
                {locked ? '???' : carItem.name}
              </h3>
              {carItem.secret && !locked && (
                <p className="font-pixel text-[6px] text-center mt-1" style={{ color: '#ffd700' }}>★ SECRET</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Car Details */}
      <div 
        className="w-full max-w-md rounded p-4 mb-6"
        style={{
          background: 'linear-gradient(180deg, #3d2817 0%, #2a1a0f 100%)',
          border: '3px solid #5c4033',
        }}
       >
        <div className="flex items-center gap-4 mb-4">
          <PixelCar color={selectedCar.color} carId={selectedCar.id} size={64} />
          <div>
            <h2 
              className="font-pixel text-sm mb-1"
              style={{ color: '#e8c49a' }}
            >
              {selectedCar.name}
            </h2>
            <p className="font-retro text-sm" style={{ color: '#8b6f47' }}>
              Class: {selectedCar.speed > 85 ? 'S' : selectedCar.speed > 70 ? 'A' : 'B'}
            </p>
          </div>
        </div>

        <StatBar label="SPD" value={selectedCar.speed} color="#c9956c" />
        <StatBar label="HND" value={selectedCar.handling} color="#b8956c" />
        <StatBar label="ACC" value={selectedCar.acceleration} color="#d4a574" />
      </div>

      {/* Start Button */}
      <button
        className="font-pixel text-sm px-10 py-4 transition-all duration-150 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(180deg, #8b5a2b 0%, #5c3317 100%)',
          color: '#f5deb3',
          border: '4px solid #3d2314',
          boxShadow: '0 4px 0 #2a1a0f, inset 0 2px 0 rgba(255,255,255,0.1)',
        }}
        onClick={() => onSelect(selectedCar)}
      >
        🏁 START RACE
      </button>

      {/* Hint */}
      <p className="font-retro text-xs mt-6" style={{ color: '#5c4033' }}>
        Choose wisely, the desert shows no mercy
      </p>
    </div>
  );
};

export default CarSelectScreen;
