import { cn } from "@/lib/utils";

/**
 * Overlay badge shown on simulation/demo listing images only.
 * Handles both plain and URL-encoded storage paths like /sim/ and sim%2F.
 */
export const isSimulationImage = (url: string): boolean => {
  if (typeof url !== "string" || !url) return false;

  const raw = url.toLowerCase();
  const decoded = decodeURIComponent(url).toLowerCase();

  return raw.includes("/sim/") || raw.includes("sim%2f") || decoded.includes("/sim/");
};

export const hasSimulationPhotos = (photos: Record<string, unknown> | null | undefined): boolean => {
  if (!photos) return false;

  const urls = Object.values(photos)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string");

  return urls.some(isSimulationImage);
};

const SimulationOverlay = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-background/20" />

    <div className="absolute top-3 right-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow-soft">
      محاكاة
    </div>

    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className={cn(
          "rotate-[-18deg] font-black tracking-[0.25em] text-foreground/35 select-none whitespace-nowrap drop-shadow-sm",
          size === "sm" ? "text-3xl" : "text-5xl md:text-6xl"
        )}
      >
        محاكاة
      </span>
    </div>
  </div>
);

export default SimulationOverlay;
