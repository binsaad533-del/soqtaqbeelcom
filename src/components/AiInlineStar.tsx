import { cn } from "@/lib/utils";

interface AiInlineStarProps {
  size?: number;
  className?: string;
}

/** Tiny inline AI double-sparkle (big + small) that glows slowly */
const AiInlineStar = ({ size = 14, className }: AiInlineStarProps) => {
  const id = `ai-inline-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={cn("inline-block align-middle mx-0.5 ai-glow-slow", className)}
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
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id={`${id}-small`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default AiInlineStar;
