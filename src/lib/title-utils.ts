/**
 * Builds a clean title from a list of parts.
 * - Trims each part
 * - Filters out null/undefined/empty values
 * - Joins remaining parts with " • " separator
 *
 * Prevents broken titles with orphan separators (e.g. "Activity — , City").
 */
export const buildTitle = (parts: (string | null | undefined)[]): string =>
  parts.map((p) => (p || "").trim()).filter(Boolean).join(" • ");
