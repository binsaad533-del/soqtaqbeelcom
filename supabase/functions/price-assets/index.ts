import { createClient } from "jsr:@supabase/supabase-js@2";
import { calculatePricing, applyOlvOnly } from "../_shared/depreciation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLACKLISTED_DOMAINS = [
  "ye.opensooq.com", "om.opensooq.com", "eg.opensooq.com",
  "jo.opensooq.com", "lb.opensooq.com", "iq.opensooq.com",
  "sy.opensooq.com", "ae.dubizzle.com", "uae.dubizzle.com",
  "qa.opensooq.com", "bh.opensooq.com", "kw.opensooq.com",
  "ly.opensooq.com", "ps.opensooq.com", "dz.opensooq.com",
  "ma.opensooq.com", "tn.opensooq.com", "sd.opensooq.com",
];

const NON_COMMERCIAL_DOMAINS = [
  "instagram.com", "facebook.com", "youtube.com", "tiktok.com",
  "twitter.com", "x.com", "linkedin.com", "pinterest.com",
];

const INDUSTRIAL_FALLBACK_DOMAINS = [
  "alibaba.com", "made-in-china.com", "arabic.alibaba.com",
  "sa.made-in-china.com", "ar.made-in-china.com",
];

const KNOWN_BRANDS = [
  "ماكيتا", "makita", "بوش", "bosch", "ريوبي", "ryobi", "توتال", "total",
  "جاك", "jack", "هواهوا", "huahua", "جوكي", "juki",
  "sign-cnc", "sign cnc", "signcnc", "blue-mak", "bluemak",
  "dewalt", "ديوالت", "milwaukee", "ميلواكي", "stanley", "ستانلي",
  "hilti", "هيلتي", "einhell", "اينهل", "black & decker", "بلاك اند ديكر"
];

// 🆕 أنماط الأصول العامة — أسعار سوق سعودية تقريبية لتجنب "يتطلب معاينة" للأصول الشائعة
const GENERIC_ASSET_PATTERNS: Array<{
  keywords: string[];
  price_min: number;
  price_max: number;
  name_ar: string;
}> = [
  { keywords: ["طفاية", "fire extinguisher"], price_min: 80, price_max: 200, name_ar: "طفاية حريق" },
  { keywords: ["كرسي مكتب", "office chair"], price_min: 200, price_max: 800, name_ar: "كرسي مكتب" },
  { keywords: ["مكتب مدير", "مكتب", "desk"], price_min: 400, price_max: 2500, name_ar: "مكتب" },
  { keywords: ["مرآة", "mirror"], price_min: 100, price_max: 600, name_ar: "مرآة" },
  { keywords: ["ميزان ماء", "spirit level"], price_min: 15, price_max: 60, name_ar: "ميزان ماء" },
  { keywords: ["مكيف", "split", "air condition"], price_min: 500, price_max: 2000, name_ar: "مكيف سبليت" },
  { keywords: ["دريل", "drill"], price_min: 150, price_max: 800, name_ar: "دريل كهربائي" },
  { keywords: ["فارة", "sander", "grinder"], price_min: 80, price_max: 400, name_ar: "أداة كهربائية يدوية" },
  { keywords: ["مغسلة", "sink"], price_min: 100, price_max: 400, name_ar: "مغسلة" },
  { keywords: ["محطة عمل", "workstation"], price_min: 600, price_max: 2500, name_ar: "محطة عمل مكتبية" },
  { keywords: ["وحدة مطبخ", "kitchenette"], price_min: 300, price_max: 1200, name_ar: "وحدة مطبخ صغير" },
  { keywords: ["إضاءة", "light", "lamp"], price_min: 50, price_max: 300, name_ar: "وحدة إضاءة" },
  { keywords: ["طاولة عمل", "work table", "workbench"], price_min: 200, price_max: 1000, name_ar: "طاولة عمل" },
  { keywords: ["شفرات منشار", "saw blade"], price_min: 30, price_max: 150, name_ar: "شفرة منشار" },
  { keywords: ["عبوات دهان", "paint", "ترن", "thinner"], price_min: 20, price_max: 80, name_ar: "عبوة دهان/ترن" },
  { keywords: ["ألواح خشبية", "wood panel", "خشب"], price_min: 30, price_max: 150, name_ar: "لوح خشبي" },
  { keywords: ["راوتر", "router tool"], price_min: 200, price_max: 800, name_ar: "راوتر يدوي" },
  { keywords: ["حوامل", "stand", "تخشيبة"], price_min: 50, price_max: 200, name_ar: "حامل/تخشيبة" },
  { keywords: ["ماكينة لحام", "لحام كهربائي", "welding machine"], price_min: 800, price_max: 3500, name_ar: "ماكينة لحام" },
  { keywords: ["ضاغط هواء", "كمبروسر", "compressor"], price_min: 500, price_max: 2500, name_ar: "ضاغط هواء" },
  { keywords: ["صاروخ جلخ", "جلاخة زاوية", "angle grinder"], price_min: 150, price_max: 600, name_ar: "صاروخ جلخ" },
  { keywords: ["صاروخ تلميع", "polisher"], price_min: 150, price_max: 600, name_ar: "صاروخ تلميع" },
  { keywords: ["مكبس حراري", "heat press"], price_min: 1500, price_max: 8000, name_ar: "مكبس حراري" },
  { keywords: ["شفاط غبار", "dust collector"], price_min: 800, price_max: 3000, name_ar: "شفاط غبار" },
  { keywords: ["جلاخة حجر", "bench grinder"], price_min: 200, price_max: 800, name_ar: "جلاخة حجر" },
  { keywords: ["منشار شريطي", "band saw"], price_min: 1200, price_max: 5000, name_ar: "منشار شريطي" },
];

function matchGenericAsset(assetName: string): typeof GENERIC_ASSET_PATTERNS[0] | null {
  const nameLower = (assetName || "").toLowerCase();
  for (const pattern of GENERIC_ASSET_PATTERNS) {
    if (pattern.keywords.some(kw => nameLower.includes(kw.toLowerCase()))) {
      return pattern;
    }
  }
  return null;
}

function extractBrandFromName(name: string): string | null {
  const lower = (name || "").toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (lower.includes(brand.toLowerCase())) return brand;
  }
  return null;
}

function extractModelFromName(name: string): string | null {
  if (!name) return null;
  const patterns = [
    /\b([A-Z]+-?\d+[A-Z]*-?\d*[A-Z]*)\b/,
    /\b(GSB\s*\d+)\b/i,
    /\b(\d{3,4}[A-Z]{1,3})\b/,
    /\bموديل\s+([A-Z0-9-]+)/i,
    /\bmodel\s+([A-Z0-9-]+)/i,
  ];
  for (const p of patterns) {
    const match = name.match(p);
    if (match) return match[1];
  }
  return null;
}

function normalizeAsset(raw: any, idx: number) {
  const name = raw.name || raw.asset_name || "";
  return {
    id: raw.id ?? `asset_${idx}`,
    name,
    asset_name: name,
    brand: raw.brand || extractBrandFromName(name),
    model: raw.model || extractModelFromName(name),
    condition: raw.condition || "جيد",
    category: raw.category || "generic_equipment",
    qty: raw.qty || raw.quantity || 1,
    included: raw.included !== false,
    // ✅ حقول إضافية للسماح بفحص فاتورة البائع داخل priceAsset
    details: raw.details || "",
    source: raw.source || "manual",
  };
}

/**
 * يستخرج السعر من حقل details الذي يكتبه detect-assets عند تحليل الفواتير.
 * يدعم: العربية ("السعر: 180,000.00 ريال سعودي")، الإنجليزية، والأرقام العربية-الهندية.
 * يعيد العملة لتمييز التحويل من USD.
 */
function extractPriceFromDetails(
  details: string,
): { price: number; currency: "SAR" | "USD→SAR" } | null {
  if (!details || typeof details !== "string") return null;

  // تطبيع الأرقام العربية-الهندية والفارسية → ASCII
  const normalized = details
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  // أنماط الريال السعودي (الأولوية)
  const sarPatterns = [
    /(?:السعر|سعر|الثمن|ثمن)\s*:?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:ريال\s*سعودي|ريال|ر\.?\s*س|sar)/i,
    /(\d[\d,]*(?:\.\d+)?)\s*(?:ريال\s*سعودي|ريال|ر\.?\s*س|sar)\b/i,
    /(?:price|cost|amount)\s*:?\s*(\d[\d,]*(?:\.\d+)?)\s*sar/i,
  ];
  for (const p of sarPatterns) {
    const m = normalized.match(p);
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isFinite(num) && num > 0) return { price: num, currency: "SAR" };
    }
  }

  // أنماط الدولار (تحويل × 3.75)
  const usdPatterns = [
    /(?:price|cost)\s*:?\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:usd|\$)/i,
    /\$\s*(\d[\d,]*(?:\.\d+)?)/,
    /(\d[\d,]*(?:\.\d+)?)\s*(?:دولار)/i,
  ];
  for (const p of usdPatterns) {
    const m = normalized.match(p);
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isFinite(num) && num > 0) {
        return { price: Math.round(num * 3.75), currency: "USD→SAR" };
      }
    }
  }

  return null;
}

function isVagueAsset(asset: any): boolean {
  if (asset.brand && asset.model) return false;
  const name = (asset.name || "").toLowerCase();

  if (asset.brand) {
    const specificTerms = [
      "منشار", "دريل", "مثقاب", "صنفرة", "راوتر", "خياطة", "تجميع",
      "cnc", "حصان", "hp", "كيلو واط", "kw", "لتر", "liter", "مم", "mm",
      "سكرو", "صناعي", "فولت", "volt"
    ];
    if (specificTerms.some(t => name.includes(t))) return false;
  }

  const technicalTerms = ["حصان", "hp", "cnc", "كيلو واط", "kw", "لتر", "liter", "مم", "mm", "سكرو", "راوتر", "صناعي"];
  if (technicalTerms.some(t => name.includes(t))) return false;

  return true;
}

function buildCacheKey(asset: any): string {
  const brand = (asset.brand || "").toLowerCase().trim();
  const model = (asset.model || "").toLowerCase().trim();
  const condition = (asset.condition || "جيد").trim();
  if (brand && model) return `${brand}|${model}|${condition}`;
  return `${(asset.name || "").toLowerCase().trim()}|${condition}`;
}

function buildSearchQueries(asset: any) {
  const queries: Array<{query: string, type: string}> = [];
  const hasModelAndBrand = asset.brand && asset.model;

  if (hasModelAndBrand) {
    queries.push({ query: `${asset.brand} ${asset.model} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.brand} ${asset.model} مستعمل السعودية`, type: "used_ksa" });
  } else {
    queries.push({ query: `${asset.name} سعر السعودية`, type: "new_ksa" });
    queries.push({ query: `${asset.name} مستعمل السعودية`, type: "used_ksa" });
  }

  const category = asset.category;
  const nameLower = (asset.name || "").toLowerCase();
  const brandLower = (asset.brand || "").toLowerCase();

  // قائمة ماركات صناعية/متخصصة - لو الماركة منها، نفعّل Alibaba تلقائياً
  const INDUSTRIAL_BRANDS = [
    "جاك", "jack", "جوكي", "juki", "هواهوا", "huahua",
    "sign-cnc", "sign cnc", "signcnc", "blue-mak", "bluemak"
  ];

  // كلمات تدل على أن الأصل صناعي/متخصص
  const INDUSTRIAL_KEYWORDS = [
    "cnc", "صناعي", "صناعية", "ماكينة", "خياطة", "تطريز", "سرفلة",
    "مسمار", "سنون", "دعاسة", "مكبس", "تجميع حواف", "edge band"
  ];

  const isIndustrialCategory = category === "industrial_machine" ||
                                category === "industrial_equipment" ||
                                category === "sewing_machine";
  const isIndustrialBrand = INDUSTRIAL_BRANDS.some(b => brandLower.includes(b.toLowerCase()));
  const hasIndustrialKeyword = INDUSTRIAL_KEYWORDS.some(k => nameLower.includes(k));

  if (isIndustrialCategory || isIndustrialBrand || hasIndustrialKeyword) {
    const q = hasModelAndBrand ? `${asset.brand} ${asset.model}` : asset.name;
    queries.push({ query: `${q} industrial machinery price USD`, type: "alibaba_fallback" });
  }
  return queries;
}

async function searchSerper(query: string, apiKey: string) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "sa", hl: "ar", num: 10 }),
  });
  if (!response.ok) return { organic: [] };
  return await response.json();
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return "unknown"; }
}

function basicFilter(organic: any[], queryType: string) {
  const candidates = [];
  for (const item of organic) {
    const domain = extractDomain(item.link || "");
    if (BLACKLISTED_DOMAINS.some(d => domain.includes(d))) continue;
    if (NON_COMMERCIAL_DOMAINS.some(d => domain.includes(d))) continue;
    if (queryType === "alibaba_fallback") {
      if (!INDUSTRIAL_FALLBACK_DOMAINS.some(d => domain.includes(d))) continue;
    }
    candidates.push({
      title: item.title || "",
      snippet: item.snippet || "",
      url: item.link || "",
      domain,
      query_type: queryType,
    });
  }
  return candidates;
}

async function arbitrateAssetWithGemini(asset: any, allCandidates: any[], apiKey: string) {
  if (allCandidates.length === 0) {
    return { prices: [], reasoning: "لا توجد نتائج للفحص" };
  }

  const candidatesText = allCandidates.map((c, i) =>
    `[${i + 1}] نوع البحث: ${c.query_type}\n    الموقع: ${c.domain}\n    العنوان: ${c.title}\n    النص: ${c.snippet}`
  ).join("\n\n");

  const systemPrompt = `أنت محكّم أسعار للسوق السعودي. مهمتك الوحيدة: اختيار الأسعار الموثوقة من نتائج بحث معطاة لك.

قواعد صارمة غير قابلة للكسر:
1. ممنوع اختراع أو تقدير أسعار من ذاكرتك. استخرج الأسعار من النصوص المعطاة فقط.
2. اقبل الأسعار فقط إذا: للمنتج المطلوب بالضبط، من السوق السعودي، ومعقولة.
3. تمييز سياقي: "قطر الدولة" → رفض. "قطر الدائرة" → اقبل. "سلطنة عُمان" → رفض. "عمّان الأردن" → رفض.
4. قاعدة الموديلات المتقاربة: لا تقس سعر موديل على موديل آخر برقم مختلف. مثال: DDL-550 ليس DDL-5550.
5. alibaba_fallback: الأسعار بالدولار (ضرب 3.75 للريال). source_type: "alibaba".
6. new_ksa/used_ksa: يجب أن تكون بالريال السعودي.
7. حدد لكل سعر: is_new و source_type (ksa_retail/ksa_used/alibaba).
8. Outlier: استبعد أي سعر يختلف أكثر من 3 أضعاف الباقي.
9. إذا لم تجد نتائج موثوقة، أرجع selected_prices مصفوفة فارغة.

شكل الإجابة (JSON فقط):
{
  "selected_prices": [{ "candidate_index": 1, "price_sar": 199, "is_new": true, "source_type": "ksa_retail", "reason": "شرح" }],
  "reasoning": "شرح القرار",
  "rejected_count": 5,
  "rejected_reasons": "ملخص"
}`;

  const userPrompt = `الأصل:
- الاسم: ${asset.name}
${asset.brand ? `- الماركة: ${asset.brand}` : ""}
${asset.model ? `- الموديل: ${asset.model}` : ""}
- الحالة: ${asset.condition}
- الفئة: ${asset.category}

نتائج البحث:

${candidatesText}

اختر الأسعار الموثوقة فقط. أرجع JSON.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return { prices: [], reasoning: `خطأ Gemini: ${response.status}` };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
    }

    if (!parsed || !Array.isArray(parsed.selected_prices)) {
      return { prices: [], reasoning: "فشل قراءة Gemini" };
    }

    const enrichedPrices = parsed.selected_prices
      .filter((p: any) => typeof p.price_sar === "number" && p.price_sar > 0)
      .map((p: any) => {
        const candidate = allCandidates[p.candidate_index - 1];
        return {
          price: p.price_sar,
          is_new: p.is_new,
          source_type: p.source_type || "unknown",
          reason: p.reason,
          source: candidate?.domain || "unknown",
          url: candidate?.url || "",
          title: candidate?.title || "",
        };
      });

    return { prices: enrichedPrices, reasoning: parsed.reasoning || "" };
  } catch (e: any) {
    return { prices: [], reasoning: `خطأ: ${e.message}` };
  }
}

function calculateMedian(prices: number[]): number {
  if (!prices.length) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * يستنتج فئة الأصل من الاسم/النوع/الماركة
 * يُستخدم حين يكون asset.category فارغاً أو generic_equipment
 */
function inferCategory(asset: any): string {
  // 1) إن كان category موجوداً صريحاً وليس generic، استخدمه
  if (asset.category && asset.category !== "generic_equipment") {
    return asset.category;
  }

  const assetType = (asset.asset_type || "").toLowerCase();
  const name = (asset.name || "").toLowerCase();
  const combined = `${assetType} ${name}`;
  const nameUpper = (asset.name || "").toUpperCase();

  // 2) ⭐ طبقة Brand Matching — أدق إشارة للفئة الصناعية
  const INDUSTRIAL_BRANDS = [
    // Woodworking Italian (من فواتير حقيقية)
    "SCM", "CENTAURO", "CASATI", "ORMA", "DARI", "HUAHUA",
    "BIESSE", "FELDER", "WEINIG", "HOMAG",
    // Industrial tools generic
    "BOSCH PROFESSIONAL", "MAKITA INDUSTRIAL", "JET", "POWERMATIC",
    // Sewing industrial
    "JUKI", "BROTHER", "SINGER INDUSTRIAL", "JACK",
    // Metal working
    "HAAS", "DMG MORI", "MAZAK", "OKUMA",
    // Generic industrial indicators
    "CNC", "NOVA"
  ];
  if (INDUSTRIAL_BRANDS.some(brand => nameUpper.includes(brand))) {
    return "industrial";
  }

  // 3) مركبات
  const vehicleKeywords = [
    "سيارة", "مركبة", "شاحنة", "وانيت", "بيك أب", "vehicle", "truck",
    "car", "pickup", "باص", "حافلة", "دراجة", "motorcycle"
  ];
  if (vehicleKeywords.some(kw => combined.includes(kw))) {
    return "vehicle";
  }

  // 4) أثاث
  const furnitureKeywords = [
    "مكتب", "كرسي", "طاولة", "خزانة", "رف", "أريكة", "سرير",
    "مطبخ صغير", "أوفيس", "محطة عمل", "desk", "chair", "table",
    "furniture", "كابينة"
  ];
  if (furnitureKeywords.some(kw => combined.includes(kw))) {
    return "furniture";
  }

  // 5) ⭐ Keywords صناعية (موسّعة للـ woodworking + general)
  const industrialKeywords = [
    // Arabic
    "ماكينة", "آلة", "منشار", "مخرطة", "مطحنة", "معدة إنتاج",
    "ضاغط", "كمبروسر", "كمبرسر", "مولد", "شفاط", "راوتر",
    "تخريز", "لحام", "دريل", "خلاط", "فرن صناعي", "مكبس",
    "مجفف", "خزان هواء", "مضخة", "مكنة",
    // English — Woodworking
    "machine", "saw", "router", "cnc", "compressor",
    "cutter", "drilling", "planer", "moulder", "mortiser",
    "guillotine", "bander", "splicing", "press", "dryer",
    "air tank", "band saw", "edge", "spindle", "jointer",
    // English — General industrial
    "industrial", "manufacturing", "production", "workshop",
    "lathe", "mill", "grinder", "welder", "forklift"
  ];
  if (industrialKeywords.some(kw => combined.includes(kw))) {
    return "industrial";
  }

  // 6) asset_type heuristic
  if (assetType === "آلة" || assetType === "معدة إنتاج" || assetType === "معدّة إنتاج") {
    return "industrial";
  }

  // 7) fallback
  return "default";
}

function getUsedDiscount(condition: string, category: string): number {
  if (category === "vehicle") {
    const v: any = { "جديد": 0.95, "شبه جديد": 0.85, "جيد": 0.70, "مستعمل": 0.60, "تالف": 0.35 };
    return v[condition] || 0.60;
  }
  if (category === "industrial_machine" || category === "industrial_equipment") {
    const i: any = { "جديد": 0.85, "شبه جديد": 0.70, "جيد": 0.55, "مستعمل": 0.45, "تالف": 0.25 };
    return i[condition] || 0.50;
  }
  const p: any = { "جديد": 0.85, "شبه جديد": 0.75, "جيد": 0.65, "مستعمل": 0.55, "تالف": 0.30 };
  return p[condition] || 0.60;
}

async function priceAsset(asset: any, serperKey: string, lovableKey: string) {
  // ✅ أولوية #1: السعر من فاتورة البائع المرفقة (مصدر رسمي)
  const invoicePrice = extractPriceFromDetails(asset.details || "");
  if (invoicePrice) {
    const pricingResult = calculatePricing(
      invoicePrice.price,
      asset.condition,
      inferCategory(asset)
    );
    const adjustedPrice = pricingResult.price_sar;
    const currencyNote = invoicePrice.currency === "USD→SAR"
      ? " (محوّل من USD بسعر 3.75 ر.س/$)"
      : "";
    return {
      price_sar: adjustedPrice,
      confidence: "عالي",
      reasoning:
        `${invoicePrice.price.toLocaleString("en-US")} ر.س${currencyNote} ` +
        `(من فاتورة الشراء المرفقة) — ${pricingResult.reasoning}`,
      source: "invoice_extracted",
      sources: [{
        domain: "فاتورة البائع",
        url: "",
        title: "مستخرج من المستندات المرفقة",
        price: invoicePrice.price,
        is_new: asset.condition === "جديد",
      }],
      price_range: {
        min: adjustedPrice,
        max: invoicePrice.price,
      },
      disclaimer:
        "السعر مستخرج من فاتورة البائع المرفقة — راجع الفاتورة الأصلية " +
        "في قسم الوثائق للتأكيد. تم تطبيق معامل الإهلاك (TAQEEM) ومعامل OLV.",
      pricingResult,
    };
  }

  if (isVagueAsset(asset)) {
    // 🆕 محاولة تسعير الأصول العامة المعروفة قبل الاستسلام لـ "يتطلب معاينة"
    const genericMatch = matchGenericAsset(asset.asset_name || asset.name || "");
    if (genericMatch) {
      const midPrice = Math.round((genericMatch.price_min + genericMatch.price_max) / 2);
      return {
        price_sar: midPrice,
        confidence: "متوسط",
        reasoning: `تسعير تقريبي لـ ${genericMatch.name_ar} بناءً على نطاق السوق السعودي. يُنصح بالتحقق الميداني للحصول على سعر دقيق.`,
        source: "generic_market_range",
        sources: [],
        price_range: { min: genericMatch.price_min, max: genericMatch.price_max },
        disclaimer: "سعر تقديري — هذا الأصل لم يُسعَّر بمصادر موثقة. النطاق مبني على متوسط السوق السعودي.",
        pricingResult: {
          market_value_sar: midPrice,
          olv_discount: null,
          depreciation_rate: null,
          condition_taqeem: asset.condition || null,
        },
      };
    }
    return {
      price_sar: 0,
      confidence: "يتطلب_معاينة",
      reasoning: "أصل غامض بدون ماركة أو موديل محدد",
      source: "vague_asset_skip",
      sources: [],
      price_range: null,
    };
  }

  const queries = buildSearchQueries(asset);
  const serperResults = await Promise.all(
    queries.map(q => searchSerper(q.query, serperKey).then(r => ({ ...r, queryInfo: q })))
  );

  const allCandidates: any[] = [];
  for (const sr of serperResults) {
    const candidates = basicFilter(sr?.organic || [], sr.queryInfo.type);
    allCandidates.push(...candidates);
  }

  const verdict = await arbitrateAssetWithGemini(asset, allCandidates, lovableKey);

  const newPrices: number[] = [];
  const usedPrices: number[] = [];
  const alibabaPrices: number[] = [];
  for (const p of verdict.prices) {
    if (p.source_type === "alibaba") alibabaPrices.push(p.price);
    else if (p.is_new) newPrices.push(p.price);
    else usedPrices.push(p.price);
  }

  const medianNew = calculateMedian(newPrices);
  const medianUsed = calculateMedian(usedPrices);
  const medianAlibaba = calculateMedian(alibabaPrices);
  const category = inferCategory(asset);

  let recommendedPrice = 0;
  let confidence = "منخفض";
  let reasoning = "";
  let source = "";
  let priceRange: any = null;
  let pricingResult: any = undefined;

  if (medianUsed > 0 && usedPrices.length >= 2) {
    // ⭐ إصلاح: تطبيق OLV على السعر المستعمل (السوق يعكس الحالة، نحتاج خصم التصفية فقط)
    const olvResult = applyOlvOnly(medianUsed, asset.condition, category);
    recommendedPrice = olvResult.price_sar;
    confidence = usedPrices.length >= 3 ? "عالي" : "متوسط";
    reasoning = `متوسط من ${usedPrices.length} إعلان مستعمل في السوق السعودي — ${olvResult.reasoning}`;
    source = "used_market";
    priceRange = { min: Math.min(...usedPrices), max: Math.max(...usedPrices) };
    pricingResult = {
      market_value_sar: olvResult.market_value_sar,
      olv_discount: olvResult.olv_discount,
      depreciation_rate: null,
      condition_taqeem: null,
    };
  } else if (medianNew > 0) {
    const pr = calculatePricing(medianNew, asset.condition, category);
    recommendedPrice = pr.price_sar;
    confidence = newPrices.length >= 5 ? "عالي" : newPrices.length >= 3 ? "متوسط" : "منخفض";
    reasoning = `${medianNew} ر.س (سعر جديد) — ${pr.reasoning}`;
    source = "new_with_discount";
    priceRange = { min: Math.min(...newPrices), max: Math.max(...newPrices) };
    pricingResult = pr;
  } else if (medianAlibaba > 0) {
    const pr = calculatePricing(medianAlibaba, asset.condition, category);
    recommendedPrice = pr.price_sar;
    confidence = "منخفض"; // دائماً منخفض لـ Alibaba بسبب عدم دقة السوق المحلي
    reasoning = `${medianAlibaba} ر.س (من Alibaba) — ${pr.reasoning} — سعر تقديري من مصادر عالمية`;
    source = "alibaba_fallback";
    priceRange = { min: Math.min(...alibabaPrices), max: Math.max(...alibabaPrices) };
    pricingResult = pr;
  } else {
    confidence = "يتطلب_معاينة";
    reasoning = "لم نجد أسعاراً موثوقة في السوق";
    source = "no_results";
  }

  const sources = (verdict.prices || []).slice(0, 5).map((p: any) => ({
    domain: p.source,
    url: p.url,
    title: p.title,
    price: p.price,
    is_new: p.is_new,
  }));

  const disclaimer = source === "alibaba_fallback"
    ? "سعر تقديري من مصادر عالمية (Alibaba) — قد يختلف عن السوق السعودي بسبب الشحن والجمارك والوسطاء. للتقييم الدقيق، يُنصح بمعاينة متخصصة عبر جساس للتقييم."
    : null;

  return {
    price_sar: recommendedPrice,
    confidence,
    reasoning,
    source,
    sources,
    price_range: priceRange,
    disclaimer,
    pricingResult,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SERPER_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "مفاتيح API غير مكتملة" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "JSON غير صالح" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const { listing_id, force_refresh = false } = body;
  if (!listing_id) {
    return new Response(JSON.stringify({ error: "listing_id مطلوب" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startTime = Date.now();

  // وضع علامة "جاري التسعير"
  await supabase.from("listings").update({
    pricing_status: "in_progress",
    pricing_started_at: new Date().toISOString(),
  }).eq("id", listing_id);

  // helper لتعليم الفشل عند أي خطأ مبكر/متأخر
  const markFailed = async () => {
    try {
      await supabase.from("listings").update({
        pricing_status: "failed",
        pricing_completed_at: new Date().toISOString(),
      }).eq("id", listing_id);
    } catch (_) { /* ignore */ }
  };

  try {
  // 1) جلب الإعلان
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, inventory, ai_assets_combined, ai_detected_assets")
    .eq("id", listing_id)
    .single();

  if (listingError || !listing) {
    await markFailed();
    return new Response(JSON.stringify({ error: "الإعلان غير موجود", details: listingError }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2) اختيار مصدر الأصول (inventory أولاً)
  let rawAssets: any[] = [];
  let sourceField = "";

  if (Array.isArray(listing.inventory) && listing.inventory.length > 0) {
    rawAssets = listing.inventory;
    sourceField = "inventory";
  } else if (listing.ai_assets_combined?.assets && Array.isArray(listing.ai_assets_combined.assets)) {
    rawAssets = listing.ai_assets_combined.assets;
    sourceField = "ai_assets_combined.assets";
  } else if (listing.ai_detected_assets?.assets && Array.isArray(listing.ai_detected_assets.assets)) {
    rawAssets = listing.ai_detected_assets.assets;
    sourceField = "ai_detected_assets.assets";
  }

  if (rawAssets.length === 0) {
    await markFailed();
    return new Response(JSON.stringify({ error: "لا توجد أصول لتسعيرها" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const normalizedAssets = rawAssets
    .map((a, idx) => normalizeAsset(a, idx))
    .filter(a => a.included !== false);

  // 3) تجميع الأصول المتطابقة (deduplication)
  const assetGroups = new Map<string, any[]>();
  for (const asset of normalizedAssets) {
    const key = buildCacheKey(asset);
    if (!assetGroups.has(key)) assetGroups.set(key, []);
    assetGroups.get(key)!.push(asset);
  }

  const uniqueKeys = Array.from(assetGroups.keys());

  // 4) فحص الـ cache
  const cacheHits = new Map<string, any>();
  if (!force_refresh) {
    const { data: cached } = await supabase
      .from("market_price_cache")
      .select("*")
      .in("cache_key", uniqueKeys)
      .gt("expires_at", new Date().toISOString());
    if (cached) for (const c of cached) cacheHits.set(c.cache_key, c);
  }

  // 5) تسعير الأنواع غير المخزنة
  const uncachedGroups = uniqueKeys
    .filter(k => !cacheHits.has(k))
    .map(k => ({ key: k, representative: assetGroups.get(k)![0] }));

  const pricingResults = await Promise.all(
    uncachedGroups.map(async (g) => {
      const result = await priceAsset(g.representative, SERPER_API_KEY, LOVABLE_API_KEY);

      // حفظ في الـ cache (لا نخزّن invoice_extracted لأن السعر خاص بفاتورة هذا البائع)
      if (result.source !== "vague_asset_skip" && result.source !== "invoice_extracted" && result.source !== "generic_market_range") {
        await supabase.from("market_price_cache").upsert({
          cache_key: g.key,
          brand: g.representative.brand,
          model: g.representative.model,
          asset_name: g.representative.name,
          condition: g.representative.condition,
          category: g.representative.category,
          price_sar: result.price_sar,
          confidence: result.confidence,
          reasoning: result.reasoning,
          source: result.source,
          price_range: result.price_range,
          gemini_sources: result.sources,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "cache_key" });
      }
      return { key: g.key, pricing: result };
    })
  );

  // 6) دمج النتائج
  const allPricings = new Map<string, any>();
  for (const [key, cached] of cacheHits) {
    const cachedDisclaimer = cached.source === "alibaba_fallback"
      ? "سعر تقديري من مصادر عالمية (Alibaba) — قد يختلف عن السوق السعودي بسبب الشحن والجمارك والوسطاء. للتقييم الدقيق، يُنصح بمعاينة متخصصة عبر جساس للتقييم."
      : null;

    allPricings.set(key, {
      price_sar: Number(cached.price_sar),
      confidence: cached.confidence,
      reasoning: cached.reasoning,
      source: cached.source,
      sources: cached.gemini_sources || [],
      price_range: cached.price_range,
      disclaimer: cachedDisclaimer,
      from_cache: true,
    });
  }
  for (const { key, pricing } of pricingResults) {
    allPricings.set(key, { ...pricing, from_cache: false });
  }

  // 7) تحديث inventory مع pricing لكل أصل
  const updatedInventory = rawAssets.map((originalAsset, idx) => {
    if (originalAsset.included === false) return originalAsset;

    const normalized = normalizeAsset(originalAsset, idx);
    const key = buildCacheKey(normalized);
    const pricing = allPricings.get(key);

    if (!pricing) return originalAsset;

    return {
      ...originalAsset,
      pricing: {
        price_sar: pricing.price_sar,
        confidence: pricing.confidence,
        reasoning: pricing.reasoning,
        source: pricing.source,
        sources: pricing.sources,
        price_range: pricing.price_range,
        disclaimer: pricing.disclaimer || null,
        priced_at: new Date().toISOString(),
        from_cache: pricing.from_cache,
        // 🆕 حقول منهجية TAQEEM/OLV
        market_value_sar: pricing.pricingResult?.market_value_sar ?? null,
        depreciation_rate: pricing.pricingResult?.depreciation_rate ?? null,
        olv_discount: pricing.pricingResult?.olv_discount ?? null,
        condition_taqeem: pricing.pricingResult?.condition_taqeem ?? null,
        valuation_method: pricing.source === "generic_market_range" ? "GENERIC_RANGE" : "OLV-TAQEEM",
      }
    };
  });

  // 8) حفظ inventory المُحدّث + علامة الإنجاز
  await supabase.from("listings")
    .update({
      inventory: updatedInventory,
      pricing_status: "completed",
      pricing_completed_at: new Date().toISOString(),
    })
    .eq("id", listing_id);

  // 9) إحصائيات
  const elapsed = Date.now() - startTime;
  const pricedAssets = Array.from(allPricings.values());
  const covered = pricedAssets.filter(p => p.confidence !== "يتطلب_معاينة").length;
  const highConf = pricedAssets.filter(p => p.confidence === "عالي").length;
  const mediumConf = pricedAssets.filter(p => p.confidence === "متوسط").length;
  const lowConf = pricedAssets.filter(p => p.confidence === "منخفض").length;
  const inspection = pricedAssets.filter(p => p.confidence === "يتطلب_معاينة").length;

  const totalValue = updatedInventory.reduce((sum: number, a: any) => {
    return sum + (a.pricing?.price_sar || 0);
  }, 0);

  return new Response(
    JSON.stringify({
      success: true,
      listing_id,
      source_field: sourceField,
      total_assets: normalizedAssets.length,
      unique_types: uniqueKeys.length,
      cache_hits: cacheHits.size,
      new_pricing_calls: uncachedGroups.length,
      execution_time_seconds: (elapsed / 1000).toFixed(1),
      coverage_percent: pricedAssets.length > 0 ? Math.round((covered / pricedAssets.length) * 100) : 0,
      high_confidence: highConf,
      medium_confidence: mediumConf,
      low_confidence: lowConf,
      requires_inspection: inspection,
      total_estimated_value_sar: totalValue,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  } catch (err: any) {
    console.error("price-assets error:", err);
    await markFailed();
    return new Response(
      JSON.stringify({ error: "Internal error", details: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
