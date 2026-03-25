import { SOCIAL_LINKS } from "@/lib/socialLinks";
import { cn } from "@/lib/utils";

// SVG icons — monochrome, thin, consistent stroke
const icons: Record<string, { label: string; svg: JSX.Element }> = {
  linkedin: {
    label: "لينكدإن",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  snapchat: {
    label: "سناب شات",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M12 2c-3 0-5.5 2.2-5.7 5.3-.1.7-.1 1.5-.3 2.2-.2.5-.6.9-1.2 1.1-.3.1-.6.2-.8.3-.4.2-.5.5-.3.8.2.3.5.4.9.3.3-.1.6-.1.8 0 .3.1.4.3.3.6-.3 1-.8 1.8-1.7 2.5-.6.5-.7.7-.4 1 .2.2.5.3.9.4.5.1.9.2 1.2.4.2.1.3.3.3.5 0 .3.2.5.5.5.5 0 1.1-.3 2-.5 1-.3 2.1.1 3.4.1s2.4-.4 3.4-.1c.9.2 1.5.5 2 .5.3 0 .5-.2.5-.5 0-.2.1-.4.3-.5.3-.2.7-.3 1.2-.4.4-.1.7-.2.9-.4.3-.3.2-.5-.4-1-.9-.7-1.4-1.5-1.7-2.5-.1-.3 0-.5.3-.6.2-.1.5 0 .8 0 .4.1.7 0 .9-.3.2-.3.1-.6-.3-.8-.2-.1-.5-.2-.8-.3-.6-.2-1-.6-1.2-1.1-.2-.7-.2-1.5-.3-2.2C17.5 4.2 15 2 12 2z" />
      </svg>
    ),
  },
  x: {
    label: "إكس",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  tiktok: {
    label: "تيك توك",
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.8.1V9a6.27 6.27 0 0 0-.8-.05A6.34 6.34 0 0 0 3.16 15.3a6.34 6.34 0 0 0 6.33 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
      </svg>
    ),
  },
};

const platformOrder = ["linkedin", "x", "tiktok", "snapchat"] as const;

interface SocialIconsProps {
  size?: "sm" | "md";
  className?: string;
}

const SocialIcons = ({ size = "sm", className }: SocialIconsProps) => {
  const iconSize = size === "sm" ? "w-[15px] h-[15px]" : "w-[18px] h-[18px]";

  const activeLinks = platformOrder.filter(
    (key) => SOCIAL_LINKS[key] && SOCIAL_LINKS[key].trim() !== ""
  );

  if (activeLinks.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      {activeLinks.map((key) => (
        <a
          key={key}
          href={SOCIAL_LINKS[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={icons[key].label}
          className={cn(
            iconSize,
            "text-muted-foreground/50 hover:text-foreground/70 transition-all duration-200 hover:scale-110 inline-flex items-center justify-center"
          )}
        >
          {icons[key].svg}
        </a>
      ))}
    </div>
  );
};

export default SocialIcons;
