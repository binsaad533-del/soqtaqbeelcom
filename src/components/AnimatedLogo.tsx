import logoIconGold from "@/assets/logo-icon-gold.png";
import { useEffect, useState } from "react";

/**
 * Animated logo with strong AI-inspired motion.
 * Uses clip-path to isolate 6 wings, each with independent
 * rotation, pulse, and glow — fast and energetic.
 */
const AnimatedLogo = ({ className = "h-14 md:h-16 w-14 md:w-16" }: { className?: string }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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

  return (
    <div className={`relative ${className}`}>
      {/* Outer glow ring */}
      <div
        className="absolute inset-[-18%] rounded-full"
        style={{
          background: "radial-gradient(circle, hsla(40, 90%, 60%, 0.25) 0%, transparent 70%)",
          animation: "ai-outer-glow 1.8s ease-in-out infinite",
        }}
      />

      {/* Rotating orbit dots */}
      {[0, 1, 2].map(i => (
        <div
          key={`orbit-${i}`}
          className="absolute inset-[-8%]"
          style={{
            animation: `ai-orbit ${2.5 + i * 0.6}s linear infinite`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: `${3 - i * 0.5}px`,
              height: `${3 - i * 0.5}px`,
              background: `hsla(40, 90%, ${65 + i * 10}%, ${0.9 - i * 0.2})`,
              boxShadow: `0 0 ${6 - i}px hsla(40, 90%, 60%, 0.6)`,
            }}
          />
        </div>
      ))}

      {/* 6 animated wing segments */}
      {slices.map((clipPath, i) => (
        <img
          key={i}
          src={logoIconGold}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            clipPath,
            transformOrigin: "50% 50%",
            opacity: mounted ? 1 : 0,
            transition: `opacity 0.3s ${i * 0.08}s`,
            animation: mounted
              ? `ai-wing-${i} ${1.2 + i * 0.15}s ease-in-out infinite`
              : "none",
          }}
        />
      ))}

      {/* Center with strong pulse */}
      <img
        src={logoIconGold}
        alt="سوق تقبيل"
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          clipPath: "circle(10% at 50% 50%)",
          animation: "ai-core-pulse 1.4s ease-in-out infinite",
        }}
      />

      {/* Scanning line effect */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        style={{ clipPath: "circle(48% at 50% 50%)" }}
      >
        <div
          className="absolute w-full h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, hsla(40, 90%, 65%, 0.4), transparent)",
            animation: "ai-scan 2s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        ${Array.from({ length: 6 }, (_, i) => {
          const baseScale = 1;
          const peakScale = 1.12 + (i % 2) * 0.06;
          const r1 = (i % 2 === 0 ? 1 : -1) * (4 + i);
          const r2 = -r1 * 0.7;
          return `
            @keyframes ai-wing-${i} {
              0% { transform: scale(${baseScale}) rotate(0deg); opacity: 1; filter: brightness(1); }
              25% { transform: scale(${peakScale}) rotate(${r1}deg); opacity: 0.75; filter: brightness(1.2); }
              50% { transform: scale(${baseScale}) rotate(${r2}deg); opacity: 1; filter: brightness(1); }
              75% { transform: scale(${peakScale * 0.97}) rotate(${r1 * 0.5}deg); opacity: 0.8; filter: brightness(1.15); }
              100% { transform: scale(${baseScale}) rotate(0deg); opacity: 1; filter: brightness(1); }
            }
          `;
        }).join("")}

        @keyframes ai-core-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 4px hsla(40, 90%, 60%, 0.3)); }
          50% { transform: scale(1.2); filter: brightness(1.3) drop-shadow(0 0 12px hsla(40, 90%, 60%, 0.7)); }
        }

        @keyframes ai-outer-glow {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }

        @keyframes ai-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes ai-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
