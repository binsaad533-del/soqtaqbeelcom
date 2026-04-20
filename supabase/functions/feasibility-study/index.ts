import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Activity-specific analysis templates ── */
const ACTIVITY_TEMPLATES: Record<string, {
  label: string;
  keywords: string[];
  operationalCosts: string[];
  revenueDrivers: string[];
  licenseRequirements: string[];
  riskFactors: string[];
  googlePlacesType: string;
}> = {
  gas_station: {
    label: "محطة وقود / بنزين",
    keywords: ["بنزين", "محطة وقود", "محطة بترول", "gas station", "fuel"],
    operationalCosts: ["تكلفة شراء الوقود بالجملة", "رواتب العمالة (4-8 عامل)", "الكهرباء والمياه", "صيانة المضخات والخزانات", "التأمين", "الإيجار السنوي"],
    revenueDrivers: ["بيع الوقود (هامش ربح 5-8%)", "مغسلة السيارات", "ميني ماركت", "كفتيريا", "خدمات إضافية (هواء، زيت)"],
    licenseRequirements: ["رخصة أرامكو للتوزيع", "رخصة البلدية", "الدفاع المدني", "رخصة البيئة", "شهادة السلامة"],
    riskFactors: ["تقلب أسعار الوقود", "منافسة محطات قريبة", "تكلفة صيانة الخزانات", "اشتراطات أرامكو"],
    googlePlacesType: "gas_station",
  },
  medical: {
    label: "مستوصف / مركز طبي",
    keywords: ["مستوصف", "عيادة", "مركز طبي", "صيدلية", "clinic", "medical", "pharmacy"],
    operationalCosts: ["رواتب الكادر الطبي", "المستلزمات الطبية", "التأمين الطبي", "الإيجار", "الكهرباء والمياه", "صيانة الأجهزة الطبية"],
    revenueDrivers: ["الكشف والاستشارات", "التحاليل المخبرية", "الأشعة", "الصيدلية", "التأمين الطبي"],
    licenseRequirements: ["ترخيص وزارة الصحة", "رخصة البلدية", "الدفاع المدني", "ترخيص الصيدلية", "اعتماد التأمينات"],
    riskFactors: ["اشتراطات وزارة الصحة", "توفر الكادر الطبي المرخص", "المسؤولية الطبية", "تكلفة التجهيزات"],
    googlePlacesType: "doctor",
  },
  grocery: {
    label: "تموينات / سوبر ماركت",
    keywords: ["تموينات", "بقالة", "سوبر ماركت", "ماركت", "grocery", "supermarket", "مواد غذائية"],
    operationalCosts: ["شراء البضاعة", "رواتب العمالة (2-5 عامل)", "الإيجار", "الكهرباء (ثلاجات/مبردات)", "نقل وتوصيل", "هدر البضاعة"],
    revenueDrivers: ["بيع المواد الغذائية (هامش 15-25%)", "المشروبات والحلويات (هامش 30-40%)", "منتجات التنظيف", "خدمة التوصيل"],
    licenseRequirements: ["رخصة البلدية", "شهادة صحية", "الدفاع المدني", "سجل تجاري"],
    riskFactors: ["منافسة سلاسل كبرى", "هدر المنتجات الطازجة", "تغيّر الأسعار", "موسمية بعض المنتجات"],
    googlePlacesType: "grocery_or_supermarket",
  },
  restaurant: {
    label: "مطعم / كافيه",
    keywords: ["مطعم", "كافيه", "مقهى", "كافتيريا", "بوفيه", "restaurant", "cafe"],
    operationalCosts: ["المواد الخام", "رواتب الطهاة والعمالة", "الإيجار", "الغاز والكهرباء", "التعبئة والتغليف", "التسويق"],
    revenueDrivers: ["الوجبات الرئيسية", "المشروبات (هامش 60-70%)", "التوصيل عبر التطبيقات", "الحفلات والمناسبات"],
    licenseRequirements: ["رخصة البلدية", "شهادة صحية", "الدفاع المدني", "رخصة الأغذية"],
    riskFactors: ["المنافسة العالية", "تقلب أسعار المواد", "اعتمادية العمالة", "تطبيقات التوصيل (عمولات 15-30%)"],
    googlePlacesType: "restaurant",
  },
  industrial: {
    label: "مصنع / ورشة صناعية",
    keywords: ["مصنع", "ورشة", "نجارة", "حدادة", "تصنيع", "ديكور", "مشغل", "معمل", "لحام", "دهانات", "فايبر", "ألمنيوم"],
    operationalCosts: ["المواد الخام", "رواتب العمالة الفنية (5-15 عامل)", "الإيجار", "الكهرباء (استهلاك عالي)", "صيانة المعدات", "النقل والشحن", "التأمين"],
    revenueDrivers: ["المنتجات المصنّعة", "خدمات التصنيع حسب الطلب", "عقود المقاولين", "البيع بالجملة"],
    licenseRequirements: ["رخصة البلدية", "السجل التجاري الصناعي", "الدفاع المدني", "رخصة البيئة", "شهادة السلامة المهنية"],
    riskFactors: ["تقلب أسعار المواد الخام", "توفر العمالة الماهرة", "أعطال المعدات", "المنافسة السعرية", "تكلفة الطاقة"],
    googlePlacesType: "establishment",
  },
  general: {
    label: "نشاط تجاري عام",
    keywords: [],
    operationalCosts: ["الإيجار", "رواتب العمالة", "الكهرباء والمياه", "الصيانة", "التأمين"],
    revenueDrivers: ["المبيعات المباشرة", "الخدمات"],
    licenseRequirements: ["رخصة البلدية", "السجل التجاري", "الدفاع المدني"],
    riskFactors: ["المنافسة", "تغيّر الطلب", "التكاليف التشغيلية"],
    googlePlacesType: "establishment",
  },
};

/* ── Industrial zone detection ── */
const INDUSTRIAL_KEYWORDS = ["مصنع", "ورشة", "مستودع", "نجارة", "حدادة", "تصنيع", "صناعي", "صناعية", "ديكور", "مشغل", "معمل", "مصبغة", "تغليف", "لحام", "دهانات", "بلاستيك", "فايبر", "حديد", "ألمنيوم", "خشب"];

function isIndustrialZone(listing: any): boolean {
  const text = [listing?.business_activity, listing?.title, listing?.district, listing?.category].filter(Boolean).join(" ").toLowerCase();
  return INDUSTRIAL_KEYWORDS.some(kw => text.includes(kw));
}

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const MAX_DOCUMENT_IMAGES = 4;
const MAX_INVENTORY_LINES = 12;
const MAX_COMPETITORS_PER_RADIUS = 5;

function isImageUrl(url: string): boolean {
  const pathname = new URL(url).pathname.toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/** Extract only image document URLs from listing for multimodal AI analysis */
function extractDocumentUrls(listing: any): string[] {
  if (!Array.isArray(listing?.documents)) return [];
  const urls: string[] = [];
  for (const doc of listing.documents) {
    if (Array.isArray(doc?.files)) {
      for (const url of doc.files) {
        if (typeof url === "string" && url.startsWith("http") && isImageUrl(url)) {
          urls.push(url);
        }
      }
    }
  }
  return urls.slice(0, MAX_DOCUMENT_IMAGES);
}

function estimateInventoryWeight(item: any): number {
  const qty = Number(item?.qty) || 1;
  const unitPrice = Number(item?.unitPrice) || 0;
  return qty * Math.max(unitPrice, 1);
}

function summarizeInventory(items: any[] | undefined) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const sortedItems = [...safeItems].sort((a, b) => estimateInventoryWeight(b) - estimateInventoryWeight(a));
  const totalLines = safeItems.length;
  const totalUnits = safeItems.reduce((sum, item) => sum + (Number(item?.qty) > 0 ? Number(item.qty) : 1), 0);
  const categoryMap = new Map<string, number>();

  for (const item of safeItems) {
    const category = typeof item?.category === "string" && item.category.trim() ? item.category.trim() : "أخرى";
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  }

  const topCategories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => `${category} (${count})`);

  const highlightedItems = sortedItems.slice(0, MAX_INVENTORY_LINES).map((item) => {
    const qty = Number(item?.qty) > 0 ? Number(item.qty) : 1;
    const priceNote = Number(item?.unitPrice) > 0 ? ` — تقدير الوحدة ${Number(item.unitPrice)} ريال` : "";
    return `- ${item?.name || "صنف"} × ${qty} — حالة: ${item?.condition || "غير محدد"}${priceNote}`;
  });

  return {
    totalLines,
    totalUnits,
    topCategories,
    highlightedItems,
    omittedLines: Math.max(0, totalLines - highlightedItems.length),
  };
}

/** Build multimodal user message content with text + document images */
function buildMultimodalContent(textPrompt: string, documentUrls: string[]): any {
  if (documentUrls.length === 0) {
    return textPrompt;
  }
  const content: any[] = [
    { type: "text", text: textPrompt + "\n\n## ⚠️ الوثائق المرفقة أدناه (صور مستندات — حلّلها واستخرج منها أي بيانات مفيدة لدراسة الجدوى):\nهذه الوثائق سرية ولا تُعرض للمشتري — لكن يجب استخدام بياناتها في الدراسة والتحليل المالي." },
  ];
  for (const url of documentUrls) {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  }
  return content;
}

function detectActivityType(activity: string): typeof ACTIVITY_TEMPLATES[string] {
  const lower = (activity || "").toLowerCase();
  for (const [, template] of Object.entries(ACTIVITY_TEMPLATES)) {
    if (template.keywords.some(kw => lower.includes(kw))) return template;
  }
  return ACTIVITY_TEMPLATES.general;
}

async function requestAiCompletion(apiKey: string, payload: Record<string, unknown>) {
  const models = [String(payload.model || "google/gemini-3-flash-preview"), "google/gemini-2.5-flash"];
  let lastFailure: { status: number; raw: string } = { status: 500, raw: "" };

  for (const model of models) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, model }),
    });

    const raw = await response.text();

    if (!response.ok) {
      lastFailure = { status: response.status, raw };
      if ([502, 503, 504].includes(response.status)) continue;
      return { ok: false as const, ...lastFailure };
    }

    try {
      return { ok: true as const, data: JSON.parse(raw) };
    } catch {
      console.error("Invalid AI JSON response:", raw.slice(0, 500));
      lastFailure = { status: 502, raw };
    }
  }

  return { ok: false as const, ...lastFailure };
}

/* ── Google Places competitor search with industrial zone awareness ── */
async function searchNearbyCompetitors(
  lat: number,
  lng: number,
  placeType: string,
  keyword: string,
  apiKey: string,
  isIndustrial: boolean,
): Promise<{ radius: number; places: any[] }[]> {
  const radii = [500, 2000, 10000];
  const results: { radius: number; places: any[] }[] = [];

  // For industrial zones, search with multiple keywords to catch hidden competitors
  const keywords = isIndustrial
    ? [keyword, ...INDUSTRIAL_KEYWORDS.slice(0, 5).filter(kw => !keyword.includes(kw))]
    : [keyword];

  for (const radius of radii) {
    const allPlaces: any[] = [];
    const seenNames = new Set<string>();

    for (const kw of keywords) {
      try {
        const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        url.searchParams.set("location", `${lat},${lng}`);
        url.searchParams.set("radius", String(radius));
        if (!isIndustrial) url.searchParams.set("type", placeType);
        url.searchParams.set("keyword", kw);
        url.searchParams.set("language", "ar");
        url.searchParams.set("key", apiKey);

        const res = await fetch(url.toString());
        if (!res.ok) continue;

        const data = await res.json();
        for (const p of (data.results || []).slice(0, 10)) {
          if (seenNames.has(p.name)) continue;
          seenNames.add(p.name);
          allPlaces.push({
            name: p.name,
            rating: p.rating || null,
            totalRatings: p.user_ratings_total || 0,
            address: p.vicinity || "",
            isOpen: p.opening_hours?.open_now ?? null,
            priceLevel: p.price_level ?? null,
            distance: Math.round(
              haversineDistance(lat, lng, p.geometry?.location?.lat, p.geometry?.location?.lng)
            ),
          });
        }
      } catch {
        // continue with next keyword
      }
    }

    results.push({ radius, places: allPlaces.slice(0, 15) });
  }

  return results;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Build AI prompt ── */
function buildFeasibilityPrompt(listing: any, activityTemplate: any, competitors: any[], industrial: boolean): string {
  const sections: string[] = [];

  sections.push("# طلب دراسة جدوى اقتصادية شاملة لصفقة تقبيل");
  sections.push("\n## بيانات الصفقة:");
  if (listing.title) sections.push(`- العنوان: ${listing.title}`);
  if (listing.business_activity) sections.push(`- النشاط التجاري: ${listing.business_activity}`);
  sections.push(`- نوع النشاط المكتشف: ${activityTemplate.label}`);
  if (listing.city) sections.push(`- المدينة: ${listing.city}`);
  if (listing.district) sections.push(`- الحي: ${listing.district}`);
  if (listing.price) sections.push(`- السعر المطلوب: ${listing.price} ريال سعودي`);
  if (listing.annual_rent) sections.push(`- الإيجار السنوي: ${listing.annual_rent} ريال`);
  if (listing.lease_duration) sections.push(`- مدة العقد: ${listing.lease_duration}`);
  if (listing.lease_remaining) sections.push(`- المتبقي من العقد: ${listing.lease_remaining}`);
  if (listing.deal_type) sections.push(`- نوع الصفقة: ${listing.deal_type}`);

  // Inventory
  const inventorySummary = summarizeInventory(listing.inventory);
  if (inventorySummary.totalLines > 0) {
    sections.push("\n## الأصول والمعدات:");
    sections.push(`- عدد البنود في المخزون: ${inventorySummary.totalLines}`);
    sections.push(`- إجمالي الوحدات التقريبي: ${inventorySummary.totalUnits}`);
    if (inventorySummary.topCategories.length > 0) {
      sections.push(`- أبرز الفئات: ${inventorySummary.topCategories.join("، ")}`);
    }
    inventorySummary.highlightedItems.forEach((line) => sections.push(line));
    if (inventorySummary.omittedLines > 0) {
      sections.push(`- يوجد ${inventorySummary.omittedLines} بند إضافي بالمخزون لم يُسرد بالتفصيل لتقليل حجم التحليل؛ اعتمد على الملخص في التقدير.`);
    }
  }

  // Activity-specific context
  sections.push(`\n## سياق النشاط (${activityTemplate.label}):`);
  sections.push(`- التكاليف التشغيلية النموذجية: ${activityTemplate.operationalCosts.join("، ")}`);
  sections.push(`- مصادر الإيرادات: ${activityTemplate.revenueDrivers.join("، ")}`);
  sections.push(`- التراخيص المطلوبة: ${activityTemplate.licenseRequirements.join("، ")}`);
  sections.push(`- عوامل المخاطرة: ${activityTemplate.riskFactors.join("، ")}`);

  // Industrial zone context
  if (industrial) {
    sections.push("\n## ⚠️ تنبيه: منطقة صناعية");
    sections.push("- هذا النشاط يقع في منطقة صناعية — المنافسون غالباً لا يظهرون في Google Maps");
    sections.push("- قدّر عدد المنافسين المحتملين بناءً على نوع النشاط والمنطقة (لا تقل عن 5-15 منافس تقديري)");
    sections.push("- لا تُظهر 0 منافسين في أي نطاق — المناطق الصناعية مليئة بالورش والمصانع غير المسجلة");
    sections.push("- اذكر بوضوح أن الأعداد تقديرية وليست دقيقة");
  }

  // Competitor data
  if (competitors.length > 0) {
    sections.push("\n## بيانات المنافسين من Google Maps:");
    const labels = ["في نطاق 500 متر (نفس الشارع)", "في نطاق 2 كم (نفس الحي)", "في نطاق 10 كم (المنطقة)"];
    competitors.forEach((group, i) => {
      const topPlaces = group.places.slice(0, MAX_COMPETITORS_PER_RADIUS);
      sections.push(`\n### ${labels[i] || `نطاق ${group.radius}م`}:`);
      sections.push(`- عدد المنافسين المرصودين: ${group.places.length}`);
      if (industrial && group.places.length === 0) {
        sections.push("- ⚠️ لم تظهر نتائج — لكن المناطق الصناعية تحتوي على منافسين غير مسجلين (قدّر 3-8 على الأقل)");
      }
      if (topPlaces.length > 0) {
        topPlaces.forEach((p: any) => {
          const parts = [p.name, p.rating ? `تقييم ${p.rating}/5 (${p.totalRatings} مراجعة)` : null, `${p.distance}م`];
          sections.push(`  • ${parts.filter(Boolean).join(" — ")}`);
        });
        if (group.places.length > topPlaces.length) {
          sections.push(`- تم اختصار عرض المنافسين إلى أهم ${topPlaces.length} نتائج لتقليل حجم التحليل.`);
        }
      }
    });
  } else {
    sections.push("\n## لا تتوفر بيانات منافسين (الموقع غير محدد على الخريطة)");
    sections.push("- قدّم تحليل تنافسي تقديري بناءً على نوع النشاط والمدينة");
    if (industrial) {
      sections.push("- المناطق الصناعية تحتوي عادةً على 10-30 منافس في نطاق 10 كم — لا تقل 0");
    }
  }

  // Market price estimation
  sections.push("\n## تقدير سعر السوق (إلزامي):");
  sections.push("- يجب تقديم نطاق سعري تقديري للصفقة (لا تترك الحقل فارغاً أو 'غير محدد')");
  sections.push("- الأولوية: 1) مقارنة بصفقات مشابهة 2) تقدير بناءً على الأصول والموقع والإيجار 3) تقدير AI");
  sections.push("- اذكر مصدر التقدير: 'تقديري' أو 'بناءً على بيانات'");

  sections.push("\n---");
  sections.push("## التعليمات:");
  sections.push("أنتج دراسة جدوى اقتصادية احترافية شاملة باستخدام أداة feasibility_result");
  sections.push("- استخدم الأرقام الإنجليزية فقط (0-9)");
  sections.push("- كن دقيقاً وعملياً في التقديرات المالية");
  sections.push("- اعتمد على بيانات المنافسين الحقيقية إن توفرت");
  sections.push("- قدّم 3 سيناريوهات واقعية (متفائل، واقعي، متحفظ)");
  sections.push("- لا تترك أي حقل رقمي بقيمة 0 أو 'غير محدد' — قدّم تقديراً حتى لو كان بمستوى ثقة منخفض");

  return sections.join("\n");
}

const SYSTEM_PROMPT = `أنت مستشار مالي واقتصادي خبير متخصص في دراسات الجدوى للمشاريع التجارية في السوق السعودي.

## مهمتك:
تقديم دراسة جدوى اقتصادية احترافية وشاملة لصفقة تقبيل تجاري، تشمل:
1. تحليل العائد على الاستثمار (ROI) وفترة استرداد رأس المال
2. تقدير التكاليف التشغيلية الشهرية حسب نوع النشاط
3. تحليل المنافسين القريبين جغرافياً (بناءً على بيانات حقيقية من Google Maps إن توفرت)
4. تقييم المخاطر المالية والتشغيلية
5. سيناريوهات الربحية (متفائل، واقعي، متحفظ)
6. توصيات عملية للمشتري

## تحليل الوثائق المرفقة:
- إذا تم إرفاق صور مستندات (سجل تجاري، عقد إيجار، رخص، فواتير، ميزانيات)، حلّلها واستخرج منها كل المعلومات المالية والتشغيلية
- استخدم أي أرقام أو بيانات مالية من الوثائق لتحسين دقة التقديرات
- هذه الوثائق سرية ولا تُعرض للمشتري — لكن بياناتها أساسية لدقة الدراسة

## قواعد صارمة:
- استخدم الأرقام الإنجليزية فقط (0-9)
- كن واقعياً في التقديرات — لا تبالغ في التفاؤل
- وضّح الافتراضات وراء كل تقدير
- هذه دراسة استرشادية وليست تقييم رسمي مرخص
- قدّم التحليل بلغة مهنية واضحة
- عند تحليل المنافسين، استخدم البيانات الفعلية من Google Maps`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing } = await req.json();
    if (!listing) {
      return new Response(JSON.stringify({ error: "بيانات الصفقة مطلوبة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard #2: Skip feasibility for "assets_only" deals.
    // Economic feasibility (ROI, monthly profit, competitor density) does not
    // apply to pure asset sales — there is no ongoing business to project.
    const primaryDealType = String(listing?.primary_deal_type || listing?.deal_type || "").trim();
    if (primaryDealType === "assets_only") {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "assets_only_not_applicable",
          message:
            "دراسة الجدوى الاقتصادية لا تنطبق على صفقات الأصول فقط — هذه الصفقة تتعلق ببيع معدات أو أصول دون نشاط تشغيلي مستمر.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Guard #3: For "assets_setup" deals (assets + operational setup, no CR/legal entity),
    // we still produce a study but flag it as estimative + low confidence.
    const isAssetsSetup = primaryDealType === "assets_setup";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect activity type and industrial zone
    const activityTemplate = detectActivityType(listing.business_activity || listing.title || "");
    const industrial = isIndustrialZone(listing);

    // Search for competitors via Google Places if location available
    let competitors: { radius: number; places: any[] }[] = [];
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (mapsKey && listing.location_lat && listing.location_lng) {
      competitors = await searchNearbyCompetitors(
        listing.location_lat,
        listing.location_lng,
        activityTemplate.googlePlacesType,
        listing.business_activity || activityTemplate.label,
        mapsKey,
        industrial,
      );
    }

    const basePrompt = buildFeasibilityPrompt(listing, activityTemplate, competitors, industrial);

    // For "assets_setup" deals (assets + operational setup, no commercial registration),
    // force AI to prepend a strong warning to executiveSummary and lower confidence.
    const assetsSetupWarningInstruction = isAssetsSetup
      ? `\n\n## ⚠️ تعليمات إلزامية لصفقة "أصول + تجهيز تشغيلي":
هذه الصفقة لا تشمل سجلاً تجارياً أو نشاطاً تشغيلياً قائماً — فقط أصول جاهزة للتشغيل.
يجب أن تبدأ executiveSummary بالنص التالي حرفياً ودون تعديل:

"⚠️ تحذير مهم: هذي دراسة جدوى تقديرية مبنية على افتراضات تشغيلية. المشتري مسؤول عن:
- استخراج سجل تجاري جديد
- ترخيص النشاط
- توظيف الكوادر
- تطوير قاعدة العملاء
الأرقام المذكورة توضيحية ولا تمثل ضماناً للأداء الفعلي."

ثم تابع الملخص التنفيذي بعد هذا النص.
- اجعل confidenceLevel = "منخفض" إلزامياً.
- اجعل verdictColor لا يتجاوز "yellow" (لا تستخدم green/blue للتفاؤل).`
      : "";

    const userPrompt = basePrompt + assetsSetupWarningInstruction;
    const documentUrls = extractDocumentUrls(listing);
    const userContent = buildMultimodalContent(userPrompt, documentUrls);

    const aiResult = await requestAiCompletion(LOVABLE_API_KEY, {
      model: "google/gemini-3-flash-preview",
      temperature: 0.15,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "feasibility_result",
            description: "Return a comprehensive feasibility study for the deal",
            parameters: {
              type: "object",
              properties: {
                executiveSummary: { type: "string", description: "ملخص تنفيذي شامل للصفقة (3-5 أسطر)" },
                investmentOverview: {
                  type: "object",
                  properties: {
                    totalInvestment: { type: "number", description: "إجمالي الاستثمار المطلوب بالريال" },
                    breakdownItems: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          amount: { type: "number" },
                          note: { type: "string" },
                        },
                        required: ["label", "amount"],
                      },
                    },
                  },
                  required: ["totalInvestment", "breakdownItems"],
                },
                operationalCosts: {
                  type: "object",
                  properties: {
                    monthlyTotal: { type: "number", description: "إجمالي التكاليف التشغيلية الشهرية" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          monthlyCost: { type: "number" },
                          note: { type: "string" },
                        },
                        required: ["label", "monthlyCost"],
                      },
                    },
                  },
                  required: ["monthlyTotal", "items"],
                },
                revenueProjections: {
                  type: "object",
                  properties: {
                    optimistic: {
                      type: "object",
                      properties: {
                        monthlyRevenue: { type: "number" },
                        monthlyProfit: { type: "number" },
                        roiMonths: { type: "number", description: "فترة استرداد بالأشهر" },
                        annualROI: { type: "number", description: "عائد سنوي %" },
                        assumptions: { type: "string" },
                      },
                      required: ["monthlyRevenue", "monthlyProfit", "roiMonths", "annualROI", "assumptions"],
                    },
                    realistic: {
                      type: "object",
                      properties: {
                        monthlyRevenue: { type: "number" },
                        monthlyProfit: { type: "number" },
                        roiMonths: { type: "number" },
                        annualROI: { type: "number" },
                        assumptions: { type: "string" },
                      },
                      required: ["monthlyRevenue", "monthlyProfit", "roiMonths", "annualROI", "assumptions"],
                    },
                    conservative: {
                      type: "object",
                      properties: {
                        monthlyRevenue: { type: "number" },
                        monthlyProfit: { type: "number" },
                        roiMonths: { type: "number" },
                        annualROI: { type: "number" },
                        assumptions: { type: "string" },
                      },
                      required: ["monthlyRevenue", "monthlyProfit", "roiMonths", "annualROI", "assumptions"],
                    },
                  },
                  required: ["optimistic", "realistic", "conservative"],
                },
                competitorAnalysis: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "ملخص البيئة التنافسية" },
                    competitiveDensity: { type: "string", enum: ["منخفضة", "متوسطة", "عالية", "مشبعة"] },
                    nearbyCount: { type: "number", description: "عدد المنافسين في 500م" },
                    neighborhoodCount: { type: "number", description: "عدد المنافسين في 2كم" },
                    areaCount: { type: "number", description: "عدد المنافسين في 10كم" },
                    avgRating: { type: "number", description: "متوسط تقييم المنافسين" },
                    topCompetitors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          rating: { type: "number" },
                          distance: { type: "number" },
                          threat: { type: "string", enum: ["عالي", "متوسط", "منخفض"] },
                        },
                        required: ["name", "distance", "threat"],
                      },
                    },
                    opportunities: { type: "array", items: { type: "string" } },
                    threats: { type: "array", items: { type: "string" } },
                  },
                  required: ["summary", "competitiveDensity", "nearbyCount", "neighborhoodCount", "areaCount"],
                },
                riskAssessment: {
                  type: "object",
                  properties: {
                    overallRisk: { type: "string", enum: ["منخفض", "متوسط", "مرتفع", "مرتفع جداً"] },
                    financialRisks: { type: "array", items: { type: "string" } },
                    operationalRisks: { type: "array", items: { type: "string" } },
                    marketRisks: { type: "array", items: { type: "string" } },
                    regulatoryRisks: { type: "array", items: { type: "string" } },
                    mitigationStrategies: { type: "array", items: { type: "string" } },
                  },
                  required: ["overallRisk", "financialRisks", "operationalRisks", "marketRisks"],
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "توصيات عملية للمشتري",
                },
                verdict: {
                  type: "string",
                  enum: ["استثمار ممتاز", "استثمار جيد", "استثمار مقبول بحذر", "استثمار عالي المخاطر", "غير موصى به"],
                },
                verdictColor: { type: "string", enum: ["green", "blue", "yellow", "orange", "red"] },
                confidenceLevel: { type: "string", enum: ["عالي", "متوسط", "منخفض"] },
                disclaimer: { type: "string", description: "إخلاء مسؤولية قانوني" },
              },
              required: [
                "executiveSummary", "investmentOverview", "operationalCosts",
                "revenueProjections", "competitorAnalysis", "riskAssessment",
                "recommendations", "verdict", "verdictColor", "confidenceLevel", "disclaimer",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "feasibility_result" } },
    });

    if (!aiResult.ok) {
      console.error("AI gateway error:", aiResult.status, aiResult.raw);
      if (aiResult.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ([502, 503, 504].includes(aiResult.status)) {
        return new Response(JSON.stringify({ error: "خدمة إعداد الدراسة مشغولة مؤقتاً، حاول مرة أخرى بعد قليل" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = aiResult.data;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من إنتاج الدراسة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const study = {
      ...result,
      _meta: {
        activityType: activityTemplate.label,
        hasRealCompetitorData: competitors.some(g => g.places.length > 0),
        generatedAt: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify({ success: true, study }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("feasibility-study error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
