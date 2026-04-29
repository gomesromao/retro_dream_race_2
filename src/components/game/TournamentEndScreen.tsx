import React, { useEffect, useState, useRef } from 'react';

interface TournamentEndScreenProps {
  standings: { name: string; color: string; totalPoints: number; isPlayer: boolean }[];
  playerPosition: number;
  playerCarId?: string;
  onMenu: () => void;
  onMainMenu: () => void;
}

const SECRET_CARS = ['batmobile', 'ferrari'];
const UFO_COUNT = 5;

const UfoAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ufos = Array.from({ length: UFO_COUNT }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: -40 - Math.random() * 200,
      size: 18 + Math.random() * 14,
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: 0.3 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      beamPhase: Math.random() * Math.PI * 2,
      hue: 120 + i * 30,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const ufo of ufos) {
        ufo.wobble += ufo.wobbleSpeed;
        ufo.x += ufo.speedX + Math.sin(ufo.wobble) * 0.8;
        ufo.y += ufo.speedY;

        if (ufo.x > canvas.width + 60) ufo.x = -60;
        if (ufo.x < -60) ufo.x = canvas.width + 60;
        if (ufo.y > canvas.height + 60) {
          ufo.y = -40;
          ufo.x = Math.random() * canvas.width;
        }

        const cx = ufo.x;
        const cy = ufo.y;
        const s = ufo.size;

        // Tractor beam
        ufo.beamPhase += 0.04;
        const beamAlpha = 0.08 + Math.sin(ufo.beamPhase) * 0.05;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.4, cy + s * 0.3);
        ctx.lineTo(cx + s * 0.4, cy + s * 0.3);
        ctx.lineTo(cx + s * 1.2, cy + s * 6);
        ctx.lineTo(cx - s * 1.2, cy + s * 6);
        ctx.closePath();
        const beamGrad = ctx.createLinearGradient(cx, cy, cx, cy + s * 6);
        beamGrad.addColorStop(0, `hsla(${ufo.hue}, 100%, 70%, ${beamAlpha})`);
        beamGrad.addColorStop(1, `hsla(${ufo.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = beamGrad;
        ctx.fill();
        ctx.restore();

        // UFO body
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy - s * 0.15, s * 0.4, s * 0.35, 0, Math.PI, 0);
        ctx.fillStyle = `hsla(${ufo.hue}, 60%, 40%, 0.8)`;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx, cy, s, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${ufo.hue}, 30%, 25%, 0.9)`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${ufo.hue}, 80%, 60%, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rim lights
        for (let l = 0; l < 5; l++) {
          const angle = (l / 5) * Math.PI * 2 + ufo.wobble * 2;
          const lx = cx + Math.cos(angle) * s * 0.75;
          const ly = cy + Math.sin(angle) * s * 0.2;
          const lightAlpha = 0.5 + Math.sin(ufo.wobble * 3 + l) * 0.5;
          ctx.beginPath();
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(ufo.hue + l * 40) % 360}, 100%, 70%, ${lightAlpha})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(lx, ly, 6, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(ufo.hue + l * 40) % 360}, 100%, 70%, ${lightAlpha * 0.2})`;
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

const TournamentEndScreen: React.FC<TournamentEndScreenProps> = ({ standings, playerPosition, playerCarId, onMenu, onMainMenu }) => {
  const [unlockedNew, setUnlockedNew] = useState<string[]>([]);
  const isSecretCarWin = playerPosition === 1 && !!playerCarId && SECRET_CARS.includes(playerCarId);

  useEffect(() => {
    if (playerPosition <= 2) {
      try {
        const saved = localStorage.getItem('unlockedCars');
        const current: string[] = saved ? JSON.parse(saved) : [];
        const newUnlocks: string[] = [];
        for (const carId of SECRET_CARS) {
          if (!current.includes(carId)) {
            current.push(carId);
            newUnlocks.push(carId);
          }
        }
        if (newUnlocks.length > 0) {
          localStorage.setItem('unlockedCars', JSON.stringify(current));
          setUnlockedNew(newUnlocks);
        }
      } catch {}
    }
  }, [playerPosition]);

  const sorted = [...standings].sort((a, b) => b.totalPoints - a.totalPoints);

  const winText = isSecretCarWin
    ? `The skies crack open. From beyond the atmosphere, lights descend — they've been watching every race, every turn, every drift through the dust. The machine you pilot isn't from this world... and now they've come to witness the champion return.`
    : `The dust settles over the broken highway. Through smoke and ruin, through salt flats and dead refineries, one machine outlasted them all. They'll scratch your name into the pipeline walls — the last champion of a world that forgot how to stop racing.`;

  const getText = () => {
    if (playerPosition === 1) return winText;
    if (playerPosition === 2) return `So close. The rust and the road almost bent to your will. You tasted the lead, felt the heat of first — but the wasteland takes what it wants. They'll remember you though. In the stories told around barrel fires, you'll be the one who almost conquered the dust.`;
    return `The engines die. The dust reclaims the track. Another race lost to the wasteland — but you survived. Out here, that counts for something.`;
  };

  const getTitle = () => {
    if (isSecretCarWin) return '👽 THEY ARE WATCHING 👽';
    if (playerPosition === 1) return 'CHAMPION OF THE DUST';
    if (playerPosition === 2) return 'ALMOST LEGENDARY';
    return 'THE DUST SETTLES';
  };

  const getTitleColor = () => {
    if (isSecretCarWin) return '#00ff88';
    if (playerPosition === 1) return '#ffd93d';
    if (playerPosition === 2) return '#c0c0c0';
    return '#8b5a2b';
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: isSecretCarWin
        ? 'linear-gradient(180deg, #020a05 0%, #0a1a10 50%, #020a05 100%)'
        : 'linear-gradient(180deg, #0a0808 0%, #1a1210 50%, #0a0808 100%)'
      }}
    >
      {isSecretCarWin && <UfoAnimation />}

      <h1
        className="font-pixel text-xl sm:text-2xl mb-4 text-center"
        style={{
          color: getTitleColor(),
          textShadow: isSecretCarWin ? '0 0 20px #00ff88, 3px 3px 0 #000' : '3px 3px 0 #000',
          zIndex: 20,
          position: 'relative',
        }}
      >
        {getTitle()}
      </h1>

      <p
        className="font-retro text-sm max-w-[480px] text-center mb-8 leading-relaxed"
        style={{ color: isSecretCarWin ? '#66cc99' : '#8a7a6a', zIndex: 20, position: 'relative' }}
      >
        {getText()}
      </p>

      <div
        className="rounded p-5 mb-8 min-w-[320px]"
        style={{
          background: 'rgba(20,18,15,0.95)',
          border: isSecretCarWin ? '2px solid #00ff88' : '2px solid #3a3020',
          zIndex: 20,
          position: 'relative',
        }}
      >
        <p className="font-retro text-xs mb-4 text-center" style={{ color: '#666' }}>
          FINAL CHAMPIONSHIP
        </p>
        {sorted.map((s, i) => (
          <div
            key={s.name}
            className="flex items-center justify-between py-2 px-3 mb-1 rounded"
            style={{
              background: s.isPlayer ? 'rgba(200,150,100,0.12)' : 'transparent',
              borderLeft: `3px solid ${s.color}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="font-pixel text-lg"
                style={{ color: i === 0 ? '#ffd93d' : i === 1 ? '#c0c0c0' : '#8b6914', width: 28 }}
              >
                {i + 1}º
              </span>
              <span className="font-retro text-sm" style={{ color: s.isPlayer ? '#c9956c' : '#888' }}>
                {s.name} {s.isPlayer ? '(YOU)' : ''}
              </span>
            </div>
            <span className="font-pixel text-sm" style={{ color: '#f39c12' }}>
              {s.totalPoints}pts
            </span>
          </div>
        ))}
      </div>

      {unlockedNew.length > 0 && (
        <div
          className="rounded p-4 mb-6 text-center animate-fade-in min-w-[320px]"
          style={{
            background: 'linear-gradient(180deg, #2a2000 0%, #1a1500 100%)',
            border: '2px solid #ffd700',
            boxShadow: '0 0 20px rgba(255,215,0,0.3)',
            zIndex: 20,
            position: 'relative',
          }}
        >
          <p className="font-pixel text-sm mb-2" style={{ color: '#ffd700' }}>
            🔓 CARROS SECRETOS DESBLOQUEADOS!
          </p>
          {unlockedNew.map(id => (
            <p key={id} className="font-retro text-sm" style={{ color: '#f5deb3' }}>
              ★ {id === 'batmobile' ? 'BATMOBILE' : 'FERRARI F40'}
            </p>
          ))}
          <p className="font-retro text-xs mt-2" style={{ color: '#8b7355' }}>
            Disponíveis na seleção de carros
          </p>
        </div>
      )}

      <div className="flex gap-4" style={{ zIndex: 20, position: 'relative' }}>
        <button
          className="font-pixel text-xs px-8 py-3 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #c9956c 0%, #8b5a2b 100%)',
            color: '#fff',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
          onClick={onMenu}
        >
          NOVA CORRIDA
        </button>
        <button
          className="font-pixel text-xs px-8 py-3 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #666 0%, #333 100%)',
            color: '#ccc',
            border: '3px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
          onClick={onMainMenu}
        >
          MENU INICIAL
        </button>
      </div>
    </div>
  );
};

export default TournamentEndScreen;
