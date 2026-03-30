import { useState, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /** Eager = above the fold, lazy = below */
  priority?: boolean;
  /** Fallback shown while loading or on error */
  fallback?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Generates srcSet for Supabase Storage images using render/image transform API.
 * For external URLs or data URIs, returns the original src only.
 */
function buildSrcSet(src: string): { srcSet?: string; sizes?: string } {
  // Only generate srcSet for Supabase storage URLs with transform support
  const isSupabaseStorage = src.includes("supabase.co/storage");
  if (!isSupabaseStorage) return {};

  const widths = [320, 640, 960, 1280];
  const srcSet = widths
    .map((w) => {
      const sep = src.includes("?") ? "&" : "?";
      return `${src}${sep}width=${w}&quality=75 ${w}w`;
    })
    .join(", ");

  return {
    srcSet,
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  };
}

/**
 * Determines if a WebP source tag is useful.
 * Supabase storage can serve WebP via format query param.
 */
function getWebPSrc(src: string): string | null {
  if (!src.includes("supabase.co/storage")) return null;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}format=webp&quality=75`;
}

const OptimizedImage = memo(({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  fallback,
  onClick,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { srcSet, sizes } = buildSrcSet(src);
  const webpSrc = getWebPSrc(src);

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <picture onClick={onClick}>
      {webpSrc && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        className={cn(
          "transition-opacity duration-300",
          !loaded && "opacity-0",
          loaded && "opacity-100",
          className
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </picture>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
