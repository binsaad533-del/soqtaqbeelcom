import { cn } from "@/lib/utils";

interface AiInlineStarProps {
  size?: number;
  className?: string;
}

/** Tiny inline AI sparkle that glows slowly — use after "AI" or "الذكاء الاصطناعي" text */
const AiInlineStar = ({ size = 14, className }: AiInlineStarProps) => {
  const id = `ai-inline-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("inline-block align-middle mx-0.5 ai-glow-slow", className)}
    >
      <path
        d="M12 1 C12.6 7 17 11.4 23 12 C17 12.6 12.6 17 12 23 C11.4 17 7 12.6 1 12 C7 11.4 11.4 7 12 1Z"
        fill={`url(#${id})`}
      />
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default AiInlineStar;
