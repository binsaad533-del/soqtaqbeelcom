import { cn } from "@/lib/utils";

interface AiStarProps {
  size?: number;
  className?: string;
  label?: string;
  animate?: boolean;
}

const AiStar = ({ size = 28, className, label, animate = true }: AiStarProps) => {
  const id = `ai-star-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className={cn("relative", animate && "ai-star-breathe")}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          fill="none"
        >
          {/* Large sparkle — softer curves */}
          <path
            d="M18 3 Q18.6 11.5 24.5 15 Q19 18.6 18 33 Q17 18.6 11.5 15 Q17.4 11.5 18 3Z"
            fill={`url(#${id}-big)`}
          />
          {/* Small sparkle — softer curves */}
          <path
            d="M28 2 Q28.3 5.5 31 7.5 Q28.3 9.5 28 13 Q27.7 9.5 25 7.5 Q27.7 5.5 28 2Z"
            fill={`url(#${id}-small)`}
          />
          <defs>
            <radialGradient id={`${id}-big`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(210 100% 68%)" />
              <stop offset="100%" stopColor="hsl(210 100% 50%)" />
            </radialGradient>
            <radialGradient id={`${id}-small`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(210 100% 75%)" />
              <stop offset="100%" stopColor="hsl(210 100% 55%)" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

export default AiStar;
