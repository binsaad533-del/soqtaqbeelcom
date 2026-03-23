/**
 * Convert Arabic/Eastern numerals (٠١٢٣٤٥٦٧٨٩) to English (0123456789)
 */
export function toEnglishNumerals(str: string): string {
  return str.replace(/[٠-٩]/g, (d) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
  );
}

/**
 * Strip everything except digits from a string (after converting Arabic numerals)
 */
export function toDigitsOnly(str: string): string {
  return toEnglishNumerals(str).replace(/\D/g, "");
}
