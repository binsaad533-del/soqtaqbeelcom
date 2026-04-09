/**
 * Animated SVG recreation of the Soq Taqbeel pinwheel logo.
 * Each of the 6 blades animates independently to suggest AI intelligence.
 */
const AnimatedLogo = ({ className = "h-14 md:h-16 w-14 md:w-16" }: { className?: string }) => {
  // 6 blades at 60° intervals, each with unique animation timing
  const blades = [0, 60, 120, 180, 240, 300];

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gold gradient matching the original logo */}
        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5c842" />
          <stop offset="50%" stopColor="#f0b627" />
          <stop offset="100%" stopColor="#e6a817" />
        </linearGradient>
        <linearGradient id="gold-center" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7d154" />
          <stop offset="100%" stopColor="#e8ab1d" />
        </linearGradient>
      </defs>

      {/* Outer curved hexagonal ring */}
      <g opacity="0.85">
        <path
          d="M100 12
             C130 12, 165 35, 178 60
             C191 85, 191 115, 178 140
             C165 165, 130 188, 100 188
             C70 188, 35 165, 22 140
             C9 115, 9 85, 22 60
             C35 35, 70 12, 100 12Z"
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth="5"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dasharray"
            values="0 600;590 10;590 10;0 600"
            dur="4s"
            begin="0s"
            repeatCount="1"
            fill="freeze"
          />
        </path>
      </g>

      {/* 6 blades — each with independent animation */}
      {blades.map((angle, i) => {
        // Stagger: each blade has different delay + slightly different duration
        const delay = i * 0.15;
        const pulseDelay = i * 0.4;
        const pulseDuration = 2.5 + i * 0.3;

        return (
          <g
            key={i}
            transform={`rotate(${angle} 100 100)`}
            style={{ transformOrigin: "100px 100px" }}
          >
            {/* Inner blade (teardrop pointing outward from center) */}
            <path
              d="M100 90 C103 70, 110 45, 105 35 C100 28, 95 28, 95 35 C90 45, 97 70, 100 90Z"
              fill="url(#gold-grad)"
              opacity="0"
            >
              {/* Fade in on load */}
              <animate
                attributeName="opacity"
                from="0"
                to="1"
                dur="0.6s"
                begin={`${delay}s`}
                fill="freeze"
              />
              {/* Continuous subtle pulse */}
              <animate
                attributeName="opacity"
                values="1;0.6;1"
                dur={`${pulseDuration}s`}
                begin={`${0.9 + pulseDelay}s`}
                repeatCount="indefinite"
              />
            </path>

            {/* Outer curved blade (larger sweep) */}
            <path
              d="M96 80 C88 55, 70 30, 55 25 C48 23, 46 28, 50 33 C58 42, 80 58, 96 75Z"
              fill="url(#gold-grad)"
              opacity="0"
            >
              <animate
                attributeName="opacity"
                from="0"
                to="0.9"
                dur="0.5s"
                begin={`${delay + 0.3}s`}
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.5;0.9"
                dur={`${pulseDuration + 0.5}s`}
                begin={`${1.2 + pulseDelay}s`}
                repeatCount="indefinite"
              />
            </path>

            {/* Micro-rotation per blade for "thinking" feel */}
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`${angle} 100 100;${angle + 3} 100 100;${angle - 2} 100 100;${angle} 100 100`}
              dur={`${3 + i * 0.5}s`}
              begin={`${1 + delay}s`}
              repeatCount="indefinite"
              additive="replace"
            />
          </g>
        );
      })}

      {/* Center circle */}
      <circle cx="100" cy="100" r="12" fill="url(#gold-center)">
        <animate
          attributeName="r"
          values="12;14;12"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.8;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Subtle glow ring around center */}
      <circle cx="100" cy="100" r="18" fill="none" stroke="#f5c842" strokeWidth="1" opacity="0.3">
        <animate
          attributeName="r"
          values="18;22;18"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.3;0.1;0.3"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

export default AnimatedLogo;
