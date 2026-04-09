import logoIconGold from "@/assets/logo-icon-gold.png";

/**
 * AI-inspired animated logo: 6 wings appear/disappear sequentially
 * like a circular loading spinner — suggests processing & intelligence.
 */
const AnimatedLogo = ({ className = "h-14 md:h-16 w-14 md:w-16" }: { className?: string }) => {
  const slices = Array.from({ length: 6 }, (_, i) => {
    const a1 = (i * 60 - 90) * (Math.PI / 180);
    const a2 = ((i + 1) * 60 - 90) * (Math.PI / 180);
    const r = 1.2;
    const x1 = 50 + r * Math.cos(a1) * 50;
    const y1 = 50 + r * Math.sin(a1) * 50;
    const x2 = 50 + r * Math.cos(a2) * 50;
    const y2 = 50 + r * Math.sin(a2) * 50;
    return `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  });

  const totalDuration = 2.4; // full cycle in seconds
  const wingDuration = totalDuration / 6;

  return (
    <div className={`relative ${className}`}>
      {/* 6 wings with sequential reveal */}
      {slices.map((clipPath, i) => (
        <img
          key={i}
          src={logoIconGold}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            clipPath,
            animation: `ai-wing-cycle ${totalDuration}s ease-in-out infinite`,
            animationDelay: `${i * wingDuration}s`,
          }}
        />
      ))}

      {/* Center stays always visible with gentle pulse */}
      <img
        src={logoIconGold}
        alt="سوق تقبيل"
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          clipPath: "circle(9% at 50% 50%)",
          animation: "ai-center 1.2s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes ai-wing-cycle {
          0%   { opacity: 0.15; transform: scale(0.92); filter: brightness(0.7); }
          16%  { opacity: 1;    transform: scale(1.04); filter: brightness(1.2); }
          40%  { opacity: 1;    transform: scale(1);    filter: brightness(1); }
          60%  { opacity: 0.15; transform: scale(0.92); filter: brightness(0.7); }
          100% { opacity: 0.15; transform: scale(0.92); filter: brightness(0.7); }
        }
        @keyframes ai-center {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 3px hsla(40,90%,60%,0.3)); }
          50%      { filter: brightness(1.25) drop-shadow(0 0 10px hsla(40,90%,60%,0.6)); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
