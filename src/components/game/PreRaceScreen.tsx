import React, { useState, useEffect } from 'react';
import { TRACKS, OPPONENT_NAMES } from './TrackConfig';

interface PreRaceScreenProps {
  trackIndex: number;
  playerName: string;
  playerColor: string;
  onReady: () => void;
}

const TAUNTS = [
  "Hoje você vai comer poeira!",
  "Espero que goste do segundo lugar.",
  "Essa pista é o MEU território.",
  "É melhor sair do meu caminho.",
  "Eu tava esperando por isso.",
  "Você não tem a menor chance.",
  "Vamos ver do que você é capaz.",
  "Se prepara pra perder, novato.",
  "Vou pegar leve... BRINCADEIRA.",
  "Seu carro parece lento.",
  "Tenta me acompanhar, vai.",
  "Essa corrida já é minha.",
  "Você vai precisar de um milagre.",
  "Tô sentindo cheiro de medo...",
  "Bonita pintura. Pena que só vou ver pelo retrovisor.",
  "Último lugar combina com você.",
  "Não pisca que você me perde de vista.",
  "Eu nasci pra essa pista.",
  "Minha avó dirige mais rápido.",
  "Isso aí é um carro ou um carrinho de supermercado?",
];

const PRAISE = [
  "Boa sorte aí, parceiro!",
  "Que vença o melhor piloto.",
  "Respeito. Vamos correr limpo.",
  "Você é um rival digno.",
  "Essa vai ser boa!",
  "Já ouvi falar de você. Impressionante.",
  "Vamos dar um show!",
  "Corra forte, corra justo.",
  "Nada pessoal, só velocidade.",
  "Te vejo na linha de chegada!",
  "Você tem coragem de aparecer.",
  "Eu respeito a coragem.",
  "Ganhando ou perdendo, vai ser épico.",
  "Me mostra o seu melhor!",
  "Essa pista merece uma corrida de verdade.",
];

const CONFIDENT = [
  "Já sei quem vai pro pódio.",
  "Aquecido e pronto.",
  "Motor ronronando. Bora.",
  "Foco. Velocidade. Vitória.",
  "Mais um dia, mais um troféu.",
  "Eu vivo pra isso.",
  "Hoje não tem erro.",
  "Hora de fazer história.",
  "A pista sussurra meu nome.",
  "Pole position é só o começo.",
  "Já consigo sentir a vitória.",
  "Pneus quentes, mente fria.",
  "Nada me para hoje.",
  "Eu não vim aqui pra perder.",
  "Acelerador no talo, sem arrependimentos.",
];

const ALL_POOLS = [TAUNTS, PRAISE, CONFIDENT];

const OPP_COLORS = ['#c0392b', '#2980b9', '#8e44ad', '#16a085'];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const PreRaceScreen: React.FC<PreRaceScreenProps> = ({ trackIndex, playerName, playerColor, onReady }) => {
  const track = TRACKS[trackIndex];
  const [messages, setMessages] = useState<{ name: string; color: string; text: string; visible: boolean }[]>([]);
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    // Pick unique messages for each opponent
    const usedTexts = new Set<string>();
    const msgs = OPPONENT_NAMES.map((name, i) => {
      const pool = pickRandom(ALL_POOLS);
      let text: string;
      let attempts = 0;
      do {
        text = pickRandom(pool);
        attempts++;
      } while (usedTexts.has(text) && attempts < 20);
      usedTexts.add(text);
      return { name, color: OPP_COLORS[i], text, visible: false };
    });
    
    // Reveal messages one by one
    msgs.forEach((_, i) => {
      setTimeout(() => {
        setMessages(prev => prev.map((m, j) => j === i ? { ...m, visible: true } : m));
      }, 600 + i * 800);
    });

    setMessages(msgs);

    // Show ready button after all messages
    setTimeout(() => setShowReady(true), 600 + msgs.length * 800 + 400);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1008 100%)' }}>
      {/* Track name */}
      <div className="text-center mb-8">
        <p className="font-retro text-sm tracking-widest mb-2" style={{ color: '#8b7355' }}>
          RACE {trackIndex + 1} OF {TRACKS.length}
        </p>
        <h1 className="font-pixel text-3xl md:text-4xl tracking-wider" style={{ color: '#f5deb3' }}>
          {track.name}
        </h1>
        <div className="w-48 h-0.5 mx-auto mt-3" style={{ background: 'linear-gradient(90deg, transparent, #8b7355, transparent)' }} />
      </div>

      {/* Driver messages */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="flex items-start gap-3 transition-all duration-500"
            style={{
              opacity: msg.visible ? 1 : 0,
              transform: msg.visible ? 'translateX(0)' : 'translateX(-20px)',
            }}
          >
            {/* Driver avatar */}
            <div
              className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center font-pixel text-xs border"
              style={{
                backgroundColor: msg.color + '33',
                borderColor: msg.color,
                color: msg.color,
              }}
            >
              {msg.name.slice(0, 2)}
            </div>
            {/* Speech bubble */}
            <div className="flex-1">
              <p className="font-pixel text-xs mb-1" style={{ color: msg.color }}>
                {msg.name}
              </p>
              <div
                className="rounded px-3 py-2 font-retro text-sm"
                style={{
                  backgroundColor: '#1a1810',
                  border: `1px solid ${msg.color}44`,
                  color: '#c9b090',
                }}
              >
                "{msg.text}"
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ready button */}
      {showReady && (
        <button
          onClick={onReady}
          className="font-pixel text-lg px-8 py-3 rounded border-2 transition-all hover:scale-105 animate-pulse"
          style={{
            borderColor: '#f5deb3',
            color: '#f5deb3',
            backgroundColor: '#2a1a08',
          }}
        >
          ▶ START RACE
        </button>
      )}
    </div>
  );
};

export default PreRaceScreen;
