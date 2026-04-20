import { describe, it, expect } from "vitest";
import { parseArabicPrice } from "@/lib/price-parser";

describe("parseArabicPrice", () => {
  it("parses Arabic magnitude word ألف", () => {
    expect(parseArabicPrice("200 ألف")).toBe(200000);
    expect(parseArabicPrice("200 الف")).toBe(200000);
  });

  it("parses comma-separated thousands", () => {
    expect(parseArabicPrice("200,000")).toBe(200000);
    expect(parseArabicPrice("1,500,000")).toBe(1500000);
  });

  it("parses Arabic-Indic digits with magnitude word", () => {
    expect(parseArabicPrice("٢٠٠ ألف")).toBe(200000);
    expect(parseArabicPrice("١٬٥٠٠٬٠٠٠".replace(/[٬]/g, ","))).toBe(1500000);
  });

  it("parses million units in both languages", () => {
    expect(parseArabicPrice("200 مليون")).toBe(200000000);
    expect(parseArabicPrice("2 million")).toBe(2000000);
    expect(parseArabicPrice("2.5m")).toBe(2500000);
  });

  it("parses k suffix", () => {
    expect(parseArabicPrice("200k")).toBe(200000);
    expect(parseArabicPrice("200K")).toBe(200000);
    expect(parseArabicPrice("1.5k")).toBe(1500);
  });

  it("parses plain numeric strings", () => {
    expect(parseArabicPrice("200000")).toBe(200000);
    expect(parseArabicPrice("0200000")).toBe(200000);
  });

  it("passes through valid numbers", () => {
    expect(parseArabicPrice(200000)).toBe(200000);
  });

  it("returns null for invalid / empty input", () => {
    expect(parseArabicPrice("")).toBeNull();
    expect(parseArabicPrice(null)).toBeNull();
    expect(parseArabicPrice(undefined)).toBeNull();
    expect(parseArabicPrice("لا يوجد")).toBeNull();
    expect(parseArabicPrice(0)).toBeNull();
    expect(parseArabicPrice(-5)).toBeNull();
  });

  it("handles European thousand-dot format defensively", () => {
    expect(parseArabicPrice("200.000")).toBe(200000);
  });

  it("does NOT corrupt the legacy bug case", () => {
    // The old code would turn '200 ألف' into 200. Confirm we no longer do that.
    expect(parseArabicPrice("200 ألف")).not.toBe(200);
  });
});
