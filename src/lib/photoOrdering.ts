/**
 * Smart photo ordering: prioritizes visual asset photos over documents.
 * Groups are ordered: interior → exterior → signage → building → street → equipment
 * This ensures shop/asset photos appear first in listings and marketplace cards.
 */

const GROUP_PRIORITY: Record<string, number> = {
  interior: 1,
  exterior: 2,
  signage: 3,
  building: 4,
  street: 5,
  equipment: 6,
};

/**
 * Returns a flat array of photo URLs sorted by group priority.
 * Unknown groups are appended at the end.
 */
export function getOrderedPhotos(photos: Record<string, string[]> | null | undefined): string[] {
  if (!photos || typeof photos !== "object") return [];

  const entries = Object.entries(photos) as [string, string[]][];

  // Sort entries by group priority
  entries.sort(([a], [b]) => {
    const pa = GROUP_PRIORITY[a] ?? 99;
    const pb = GROUP_PRIORITY[b] ?? 99;
    return pa - pb;
  });

  return entries.flatMap(([, urls]) => (Array.isArray(urls) ? urls : []));
}
