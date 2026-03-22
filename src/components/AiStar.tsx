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
          {/* Large sparkle */}
          <path
            d="M18 2 C19 12 24 17 34 18 C24 19 19 24 18 34 C17 24 12 19 2 18 C12 17 17 12 18 2Z"
            fill={`url(#${id}-big)`}
          />
          {/* Small sparkle — offset top-right */}
          <path
            d="M28 1 C28.4 5 30.5 7.2 34.5 7.5 C30.5 7.8 28.4 10 28 14 C27.6 10 25.5 7.8 21.5 7.5 C25.5 7.2 27.6 5 28 1Z"
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
