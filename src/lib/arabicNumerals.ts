/**
 * Convert Arabic/Eastern numerals (٠-٩) and Persian numerals (۰-۹) to English (0-9)
 */
export function toEnglishNumerals(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/**
 * Strip everything except digits from a string (after converting Arabic numerals)
 */
export function toDigitsOnly(str: string): string {
  return toEnglishNumerals(str).replace(/\D/g, "");
}
