import React from 'react';

const CRTOverlay: React.FC = () => {
  return (
    <>
      {/* Scanlines */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 3px
          )`,
        }}
      />
      
      {/* Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none z-[101]"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(0, 0, 0, 0.2) 70%,
            rgba(0, 0, 0, 0.5) 100%
          )`,
        }}
      />
      
      {/* Subtle RGB shift on edges */}
      <div 
        className="fixed inset-0 pointer-events-none z-[99] mix-blend-screen opacity-30"
        style={{
          background: `
            linear-gradient(90deg, 
              rgba(255, 0, 0, 0.03) 0%, 
              transparent 5%, 
              transparent 95%, 
              rgba(0, 255, 255, 0.03) 100%
            )
          `,
        }}
      />
    </>
  );
};

export default CRTOverlay;
