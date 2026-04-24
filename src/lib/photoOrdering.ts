/**
 * Smart photo ordering: prioritizes visual asset photos over documents.
 * Groups are ordered: interior → exterior → signage → building → street → equipment
 * Document photos are excluded from the gallery.
 */

const GROUP_PRIORITY: Record<string, number> = {
  interior: 1,
  exterior: 2,
  signage: 3,
  building: 4,
  street: 5,
  equipment: 6,
  all: 7,
};

/** Groups that contain document images — always excluded from public gallery */
const DOCUMENT_GROUPS = new Set(["document_photos"]);

/**
 * Returns a flat array of photo URLs sorted by group priority.
 * Document photos are excluded from the gallery.
 * An optional excludeUrls set can be passed to filter out specific URLs
 * (e.g., AI-identified document images within the "all" group).
 * If coverUrl is provided and exists among the photos, it is moved to index 0.
 */
export function getOrderedPhotos(
  photos: Record<string, string[]> | null | undefined,
  excludeUrls?: Set<string> | string[],
  coverUrl?: string | null
): string[] {
  if (!photos || typeof photos !== "object") return [];

  const excludeSet = excludeUrls
    ? (excludeUrls instanceof Set ? excludeUrls : new Set(excludeUrls))
    : null;

  const entries = Object.entries(photos) as [string, string[]][];

  // Filter out document groups entirely
  const filteredEntries = entries.filter(([group]) => !DOCUMENT_GROUPS.has(group));

  // Sort entries by group priority
  filteredEntries.sort(([a], [b]) => {
    const pa = GROUP_PRIORITY[a] ?? 99;
    const pb = GROUP_PRIORITY[b] ?? 99;
    return pa - pb;
  });

  let allUrls = filteredEntries.flatMap(([, urls]) => (Array.isArray(urls) ? urls : []));

  // Filter out specific excluded URLs (document images identified by AI)
  if (excludeSet && excludeSet.size > 0) {
    allUrls = allUrls.filter(url => !excludeSet.has(url));
  }

  // Promote the explicit cover photo to index 0 if present
  if (coverUrl && allUrls.includes(coverUrl)) {
    allUrls = [coverUrl, ...allUrls.filter(u => u !== coverUrl)];
  }

  return allUrls;
}

/**
 * Cheap helper for cards/listings that need the cover image only.
 * Honors explicit cover_photo_url, then falls back to the smart-ordered first photo.
 */
export function getCoverPhoto(
  photos: Record<string, string[]> | null | undefined,
  coverUrl?: string | null
): string | null {
  const ordered = getOrderedPhotos(photos, undefined, coverUrl);
  return ordered[0] ?? null;
}
