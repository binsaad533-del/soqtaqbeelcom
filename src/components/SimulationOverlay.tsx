/**
 * Overlay badge shown on simulation/demo listing images only.
 * Detection: the image URL contains "/sim/" path segment.
 */

export const isSimulationImage = (url: string): boolean =>
  typeof url === "string" && url.includes("/sim/");

export const hasSimulationPhotos = (photos: Record<string, unknown> | null | undefined): boolean => {
  if (!photos) return false;
  const urls = Object.values(photos).flat() as string[];
  return urls.some(isSimulationImage);
};

const SimulationOverlay = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
    {/* Dim overlay */}
    <div className="absolute inset-0 bg-background/10" />
    {/* Watermark text */}
    <span
      className={cn(
        "relative rotate-[-18deg] font-bold tracking-wide text-foreground/15 select-none whitespace-nowrap",
        size === "sm" ? "text-2xl" : "text-4xl md:text-5xl"
      )}
    >
      محاكاة
    </span>
  </div>
);

import { cn } from "@/lib/utils";

export default SimulationOverlay;
