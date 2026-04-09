import logoIconGold from "@/assets/logo-icon-gold.png";

/**
 * AI-animated logo: the logo stays crisp and fully visible,
 * surrounded by orbiting arcs and particles that evoke AI processing.
 */
const AnimatedLogo = ({ className = "h-14 md:h-16 w-14 md:w-16" }: { className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      {/* SVG orbiting effects behind/around the logo */}
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-[-35%] w-[170%] h-[170%]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="arc1-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(40, 90%, 60%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(40, 90%, 60%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(40, 90%, 60%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arc2-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 100%, 60%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(210, 100%, 60%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(210, 100%, 60%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arc3-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(40, 80%, 55%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(40, 80%, 55%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(40, 80%, 55%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer orbit ring 1 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="3s"
            repeatCount="indefinite"
          />
          <path
            d="M 100 15 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="url(#arc1-grad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Particle dot at arc tip */}
          <circle cx="185" cy="100" r="3" fill="hsl(40, 90%, 60%)">
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Outer orbit ring 2 - reverse */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 100 100"
            to="0 100 100"
            dur="4s"
            repeatCount="indefinite"
          />
          <path
            d="M 100 25 A 75 75 0 0 0 25 100"
            fill="none"
            stroke="url(#arc2-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="25" cy="100" r="2.5" fill="hsl(210, 100%, 65%)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Inner orbit ring 3 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="5s"
            repeatCount="indefinite"
          />
          <path
            d="M 145 30 A 80 80 0 0 1 170 145"
            fill="none"
            stroke="url(#arc3-grad)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <circle cx="170" cy="145" r="2" fill="hsl(40, 80%, 55%)">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Small floating particles */}
        {[
          { cx: 30, cy: 45, r: 1.5, dur: "2.2s" },
          { cx: 165, cy: 55, r: 1.2, dur: "2.8s" },
          { cx: 50, cy: 160, r: 1.8, dur: "1.9s" },
          { cx: 155, cy: 165, r: 1.3, dur: "2.5s" },
        ].map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="hsl(40, 85%, 60%)" opacity="0.6">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur={p.dur} repeatCount="indefinite" />
            <animate
              attributeName="r"
              values={`${p.r};${p.r * 1.8};${p.r}`}
              dur={p.dur}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* The actual logo — always fully visible */}
      <img
        src={logoIconGold}
        alt="سوق تقبيل"
        className="relative w-full h-full object-contain z-10"
        style={{
          animation: "ai-logo-breathe 2.5s ease-in-out infinite",
          filter: "drop-shadow(0 0 8px hsla(40, 90%, 60%, 0.3))",
        }}
      />

      <style>{`
        @keyframes ai-logo-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px hsla(40, 90%, 60%, 0.25)); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 14px hsla(40, 90%, 60%, 0.5)); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
