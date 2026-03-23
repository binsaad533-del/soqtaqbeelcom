/**
 * Format a date string using Arabic month names but English numerals.
 * Always outputs English digits (0-9) regardless of locale.
 */
export function formatDateAr(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const opts = options || { year: "numeric", month: "2-digit", day: "2-digit" };
  // Use en-US to guarantee English numerals, then keep it simple
  return new Date(dateStr).toLocaleDateString("en-US", opts);
}

/**
 * Format date with long Arabic month name but English numerals.
 */
export function formatDateArLong(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const year = d.getFullYear();
  const month = d.toLocaleDateString("ar-SA", { month: "long" });
  // Ensure month text uses English numerals (shouldn't have digits, but safety)
  return `${day} ${month} ${year}`;
}
