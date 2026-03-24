import { describe, it, expect } from "vitest";
import {
  getRules,
  isFieldVisible,
  isFieldRequired,
  validateDisclosure,
  validateImages,
  isGibberish,
  isKnownCity,
} from "@/lib/dealTypeFieldRules";

describe("dealTypeFieldRules", () => {
  // ── CR Only ──
  describe("cr_only", () => {
    const rules = getRules("cr_only");

    it("only requires price", () => {
      expect(rules.requiredFields).toEqual(["price"]);
    });

    it("business_activity, city, district are optional", () => {
      expect(rules.optionalFields).toContain("business_activity");
      expect(rules.optionalFields).toContain("city");
      expect(rules.optionalFields).toContain("district");
    });

    it("hides lease and liability fields", () => {
      expect(rules.hiddenFields).toContain("annual_rent");
      expect(rules.hiddenFields).toContain("liabilities");
      expect(rules.hiddenFields).toContain("municipality_license");
    });

    it("does not require images", () => {
      expect(rules.imageRequired).toBe(false);
    });

    it("requires docs", () => {
      expect(rules.docsRequired).toBe(true);
    });

    it("validates: only price missing fails", () => {
      const errors = validateDisclosure("cr_only", {
        price: "",
        business_activity: "",
        city: "",
      });
      expect(Object.keys(errors)).toEqual(["price"]);
    });

    it("validates: price provided passes", () => {
      const errors = validateDisclosure("cr_only", { price: "50000" });
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("images always pass", () => {
      expect(validateImages("cr_only", 0)).toBe(true);
    });
  });

  // ── Assets Only ──
  describe("assets_only", () => {
    const rules = getRules("assets_only");

    it("requires business_activity, city, price", () => {
      expect(rules.requiredFields).toContain("business_activity");
      expect(rules.requiredFields).toContain("city");
      expect(rules.requiredFields).toContain("price");
    });

    it("requires images", () => {
      expect(rules.imageRequired).toBe(true);
    });

    it("hides lease/liability/license fields", () => {
      expect(rules.hiddenFields).toContain("annual_rent");
      expect(rules.hiddenFields).toContain("liabilities");
      expect(rules.hiddenFields).toContain("municipality_license");
    });

    it("validates: missing all required fails", () => {
      const errors = validateDisclosure("assets_only", {
        price: "",
        business_activity: "",
        city: "",
      });
      expect(Object.keys(errors)).toContain("business_activity");
      expect(Object.keys(errors)).toContain("city");
      expect(Object.keys(errors)).toContain("price");
    });

    it("images: 0 photos fails", () => {
      expect(validateImages("assets_only", 0)).toBe(false);
    });

    it("images: 1 photo passes", () => {
      expect(validateImages("assets_only", 1)).toBe(true);
    });
  });

  // ── Full Takeover ──
  describe("full_takeover", () => {
    const rules = getRules("full_takeover");

    it("requires business_activity, city, price", () => {
      expect(rules.requiredFields).toContain("business_activity");
      expect(rules.requiredFields).toContain("city");
      expect(rules.requiredFields).toContain("price");
    });

    it("images optional", () => {
      expect(rules.imageRequired).toBe(false);
    });

    it("all fields visible (no hidden)", () => {
      expect(rules.hiddenFields).toHaveLength(0);
    });

    it("lease fields are optional but visible", () => {
      expect(isFieldVisible("full_takeover", "annual_rent")).toBe(true);
      expect(isFieldRequired("full_takeover", "annual_rent")).toBe(false);
    });
  });

  // ── Location Only ──
  describe("location_only", () => {
    const rules = getRules("location_only");

    it("requires city and price", () => {
      expect(rules.requiredFields).toContain("city");
      expect(rules.requiredFields).toContain("price");
    });

    it("business_activity is optional", () => {
      expect(rules.optionalFields).toContain("business_activity");
    });

    it("hides liabilities and licenses", () => {
      expect(rules.hiddenFields).toContain("liabilities");
      expect(rules.hiddenFields).toContain("municipality_license");
    });
  });

  // ── Field visibility ──
  describe("isFieldVisible", () => {
    it("cr_only hides annual_rent", () => {
      expect(isFieldVisible("cr_only", "annual_rent")).toBe(false);
    });

    it("full_takeover shows annual_rent", () => {
      expect(isFieldVisible("full_takeover", "annual_rent")).toBe(true);
    });

    it("assets_only hides liabilities", () => {
      expect(isFieldVisible("assets_only", "liabilities")).toBe(false);
    });
  });

  // ── Unknown deal type falls back ──
  describe("unknown deal type", () => {
    it("falls back to full_takeover rules", () => {
      const rules = getRules("some_unknown_type");
      const ftRules = getRules("full_takeover");
      expect(rules.requiredFields).toEqual(ftRules.requiredFields);
    });
  });
  describe("isGibberish", () => {
    it("detects repeated characters", () => {
      expect(isGibberish("اااااا")).toBe(true);
      expect(isGibberish("xxxxx")).toBe(true);
    });

    it("detects keyboard mashing", () => {
      expect(isGibberish("asdfgh")).toBe(true);
      expect(isGibberish("qwerty")).toBe(true);
    });

    it("detects no-letter content", () => {
      expect(isGibberish("123456")).toBe(true);
      expect(isGibberish("!!!???")).toBe(true);
    });

    it("accepts valid Arabic text", () => {
      expect(isGibberish("مطعم وجبات سريعة")).toBe(false);
      expect(isGibberish("محل تجاري")).toBe(false);
      expect(isGibberish("مكيف اسبلت")).toBe(false);
    });

    it("accepts valid English text", () => {
      expect(isGibberish("Restaurant")).toBe(false);
    });

    it("returns false for empty/short strings", () => {
      expect(isGibberish("")).toBe(false);
      expect(isGibberish("ab")).toBe(false);
    });
  });

  // ── Gibberish in validation ──
  describe("validateDisclosure rejects gibberish", () => {
    it("rejects gibberish business_activity for full_takeover", () => {
      const errors = validateDisclosure("full_takeover", {
        business_activity: "اااااا",
        city: "الرياض",
        price: "5000",
      });
      expect(errors["business_activity"]).toContain("غير مفهوم");
    });

    it("accepts valid business_activity", () => {
      const errors = validateDisclosure("full_takeover", {
        business_activity: "مطعم وجبات سريعة",
        city: "الرياض",
        price: "5000",
      });
      expect(errors["business_activity"]).toBeUndefined();
    });
  });

  // ── City validation ──
  describe("isKnownCity", () => {
    it("recognizes major Saudi cities", () => {
      expect(isKnownCity("الرياض")).toBe(true);
      expect(isKnownCity("جدة")).toBe(true);
      expect(isKnownCity("الدمام")).toBe(true);
      expect(isKnownCity("أبها")).toBe(true);
    });

    it("rejects random text as city", () => {
      expect(isKnownCity("كوكب المريخ")).toBe(false);
      expect(isKnownCity("بلاد الوقواق")).toBe(false);
    });
  });

  describe("validateDisclosure rejects invalid city", () => {
    it("rejects unknown city for full_takeover", () => {
      const errors = validateDisclosure("full_takeover", {
        business_activity: "مطعم",
        city: "بلاد الوقواق",
        price: "5000",
      });
      expect(errors["city"]).toContain("مدينة سعودية صحيحة");
    });

    it("rejects gibberish city", () => {
      const errors = validateDisclosure("full_takeover", {
        business_activity: "مطعم",
        city: "اااااا",
        price: "5000",
      });
      expect(errors["city"]).toContain("غير مفهوم");
    });

    it("accepts valid city", () => {
      const errors = validateDisclosure("full_takeover", {
        business_activity: "مطعم",
        city: "جدة",
        price: "5000",
      });
      expect(errors["city"]).toBeUndefined();
    });
  });
});
