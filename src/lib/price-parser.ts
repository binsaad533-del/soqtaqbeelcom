/**
 * Smart price parser that understands:
 * - Plain numbers: "200000", "200,000"
 * - Magnitude words (Arabic): "200 ألف" → 200000, "2 مليون" → 2000000
 * - Magnitude letters (English): "200k" → 200000, "2m" → 2000000
 * - Arabic-Indic digits: "٢٠٠ ألف" → 200000
 * - Mixed casing/spacing
 *
 * Returns null when the input cannot be parsed into a positive number.
 *
 * Use this anywhere we accept a price coming from AI extraction or free-form
 * text. DO NOT replace UI inputs that already strip non-digits — those are
 * intentionally restrictive (numeric-only inputs).
 */
export function parseArabicPrice(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") {
    return Number.isFinite(input) && input > 0 ? input : null;
  }

  // Convert Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to ASCII
  const arabicToEnglish = (s: string) =>
    s
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const str = arabicToEnglish(String(input).trim().toLowerCase());
  if (!str) return null;

  // Match: optional digits with commas/dots, optional magnitude word
  const match = str.match(/([\d,\.]+)\s*(ألف|الف|آلاف|مليون|ملايين|مليار|k|m|b|thousand|million|billion)?/i);
  if (!match) return null;

  // Normalize: remove thousands separators (commas) but keep decimal dot.
  // Edge case: "200.000" (European format) — treat as 200000 only when there are
  // exactly 3 digits after the dot AND no comma is present.
  let numericPart = match[1].replace(/,/g, "");
  if (/^\d+\.\d{3}$/.test(numericPart) && !match[1].includes(",")) {
    numericPart = numericPart.replace(".", "");
  }
  const num = parseFloat(numericPart);
  if (!Number.isFinite(num) || num <= 0) return null;

  const unit = match[2]?.toLowerCase();
  if (unit === "ألف" || unit === "الف" || unit === "آلاف" || unit === "k" || unit === "thousand") {
    return Math.round(num * 1000);
  }
  if (unit === "مليون" || unit === "ملايين" || unit === "m" || unit === "million") {
    return Math.round(num * 1000000);
  }
  if (unit === "مليار" || unit === "b" || unit === "billion") {
    return Math.round(num * 1000000000);
  }

  return Math.round(num);
}
