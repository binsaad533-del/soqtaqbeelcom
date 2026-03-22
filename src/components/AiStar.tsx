import { cn } from "@/lib/utils";

interface AiStarProps {
  size?: number;
  className?: string;
  label?: string;
  animate?: boolean;
}

const AiStar = ({ size = 28, className, label, animate = true }: AiStarProps) => {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className={cn("relative", animate && "ai-star-pulse")}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          className={cn(animate && "ai-star-rotate")}
          style={{ animationDuration: "20s" }}
        >
          <path
            d="M16 2 L18.5 12 L28 10 L20 16 L28 22 L18.5 20 L16 30 L13.5 20 L4 22 L12 16 L4 10 L13.5 12 Z"
            stroke="url(#ai-grad)"
            strokeWidth="1.2"
            fill="url(#ai-grad-fill)"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="ai-grad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="hsl(210 100% 52%)" />
              <stop offset="100%" stopColor="hsl(200 90% 58%)" />
            </linearGradient>
            <linearGradient id="ai-grad-fill" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="hsl(210 100% 52% / 0.15)" />
              <stop offset="100%" stopColor="hsl(200 90% 58% / 0.08)" />
            </linearGradient>
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
