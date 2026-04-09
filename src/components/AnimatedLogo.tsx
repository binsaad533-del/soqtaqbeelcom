import logoIconGold from "@/assets/logo-icon-gold.png";

/**
 * Animated logo that splits the original PNG into 6 pie-slice segments
 * using CSS clip-path, then animates each independently to suggest AI.
 */
const AnimatedLogo = ({ className = "h-14 md:h-16 w-14 md:w-16" }: { className?: string }) => {
  // 6 pie slices, each 60°. We compute clip-path polygons from center.
  // Points on unit circle at 60° intervals, starting from -90° (top)
  const slices = Array.from({ length: 6 }, (_, i) => {
    const a1 = (i * 60 - 90) * (Math.PI / 180);
    const a2 = ((i + 1) * 60 - 90) * (Math.PI / 180);
    // Use a large radius to ensure we cover the full image
    const r = 1.2;
    const x1 = 50 + r * Math.cos(a1) * 50;
    const y1 = 50 + r * Math.sin(a1) * 50;
    const x2 = 50 + r * Math.cos(a2) * 50;
    const y2 = 50 + r * Math.sin(a2) * 50;
    return `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  });

  // Different animation configs per wing for organic AI feel
  const wingAnimations = [
    { delay: "0s",    dur: "3s",   scale: [1, 1.06, 1],   rotate: [0, 3, -1, 0] },
    { delay: "0.3s",  dur: "3.5s", scale: [1, 1.04, 1],   rotate: [0, -2, 2, 0] },
    { delay: "0.1s",  dur: "2.8s", scale: [1, 1.07, 1],   rotate: [0, 2, -3, 0] },
    { delay: "0.5s",  dur: "3.2s", scale: [1, 1.05, 1],   rotate: [0, -3, 1, 0] },
    { delay: "0.2s",  dur: "3.8s", scale: [1, 1.03, 1],   rotate: [0, 1, -2, 0] },
    { delay: "0.4s",  dur: "2.6s", scale: [1, 1.08, 1],   rotate: [0, -1, 3, 0] },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* 6 animated wing segments */}
      {slices.map((clipPath, i) => {
        const anim = wingAnimations[i];
        const scaleKf = anim.scale.join(", ");
        const rotateKf = anim.rotate.map(r => `${r}deg`).join(", ");

        return (
          <img
            key={i}
            src={logoIconGold}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              clipPath,
              transformOrigin: "50% 50%",
              animation: `wing-pulse-${i} ${anim.dur} ease-in-out ${anim.delay} infinite, wing-rotate-${i} ${anim.dur} ease-in-out ${anim.delay} infinite`,
            }}
          />
        );
      })}

      {/* Center circle overlay (no clip, small circle) — stays stable */}
      <img
        src={logoIconGold}
        alt="سوق تقبيل"
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          clipPath: "circle(8% at 50% 50%)",
          animation: "center-pulse 2.5s ease-in-out infinite",
        }}
      />

      {/* Inline keyframes */}
      <style>{`
        ${wingAnimations.map((anim, i) => `
          @keyframes wing-pulse-${i} {
            0%, 100% { transform: scale(${anim.scale[0]}); opacity: 1; }
            50% { transform: scale(${anim.scale[1]}); opacity: 0.85; }
          }
          @keyframes wing-rotate-${i} {
            0% { transform: rotate(${anim.rotate[0]}deg); }
            33% { transform: rotate(${anim.rotate[1]}deg); }
            66% { transform: rotate(${anim.rotate[2]}deg); }
            100% { transform: rotate(${anim.rotate[3]}deg); }
          }
        `).join("")}
        @keyframes center-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.1); filter: brightness(1.15); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
