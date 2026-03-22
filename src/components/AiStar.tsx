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
      <div className={cn("relative", animate && "ai-star-pulse")}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={cn(animate && "ai-star-rotate")}
          style={{ animationDuration: "16s" }}
        >
          {/* 4-pointed sparkle shape */}
          <path
            d="M16 0 C16.8 10 22 15.2 32 16 C22 16.8 16.8 22 16 32 C15.2 22 10 16.8 0 16 C10 15.2 15.2 10 16 0Z"
            fill={`url(#${id}-fill)`}
          />
          {/* Smaller inner sparkle for depth */}
          <path
            d="M16 6 C16.5 12 20 15.5 26 16 C20 16.5 16.5 20 16 26 C15.5 20 12 16.5 6 16 C12 15.5 15.5 12 16 6Z"
            fill={`url(#${id}-inner)`}
            opacity="0.6"
          />
          <defs>
            <radialGradient id={`${id}-fill`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(210 100% 65%)" />
              <stop offset="60%" stopColor="hsl(210 100% 52%)" />
              <stop offset="100%" stopColor="hsl(210 90% 45%)" />
            </radialGradient>
            <radialGradient id={`${id}-inner`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(0 0% 100%)" />
              <stop offset="100%" stopColor="hsl(210 100% 80%)" />
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
