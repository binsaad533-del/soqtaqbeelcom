import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_BATCH_SIZE = 10;
const FILE_BATCH_SIZE = 5;

const IMAGE_SYSTEM_PROMPT = `أنت محلل أصول بصري خبير. مهمتك تحليل صور نشاط تجاري واستخراج قائمة منظمة بجميع الأصول والمعدات المرئية.

## التعليمات:
1. افحص كل صورة بعناية وحدد جميع المعدات والأجهزة والأثاث والأدوات المرئية
2. صنّف كل عنصر حسب النوع (آلة CNC، ضاغط هواء، طاولة عمل، كرسي مكتب، إلخ)
3. قدّر حالة كل عنصر: جديد / جيد / مستعمل / تالف
4. قدّر الكمية إذا تكرر العنصر في عدة صور
5. لا تكرر نفس العنصر إذا ظهر في أكثر من صورة
6. ركّز على المعدات ذات القيمة التجارية
7. تجاهل العناصر العامة مثل الجدران والأرضيات والإضاءة العادية`;

const FILE_SYSTEM_PROMPT = `أنت محلل مستندات تجارية خبير. استخرج جميع المعدات والأصول المذكورة في النص التالي مع الكمية والنوع والحالة.

## استخرج من المستندات:
1. قوائم الجرد والأصول (أسماء، كميات، قيم تقديرية)
2. الفواتير (تفاصيل المشتريات والمعدات المشتراة والمبالغ)
3. أي معدات أو أدوات أو أجهزة مذكورة
4. الالتزامات المالية المرتبطة بالأصول
5. تفاصيل التراخيص والعقود

## مهم:
- كل أصل يجب أن يكون له: اسم، نوع، كمية، حالة
- إذا ذُكر سعر أو قيمة، أضفه في التفاصيل
- لا تتجاهل أي أصل مهما كان صغيراً`;

const ASSET_TOOL = {
  type: "function" as const,
  function: {
    name: "report_detected_assets",
    description: "Report all detected assets",
    parameters: {
      type: "object",
      properties: {
        assets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "اسم الأصل بالعربية" },
              type: { type: "string", description: "التصنيف: آلة / أداة / أثاث / معدة إنتاج / جهاز / مركبة / أخرى" },
              condition: { type: "string", enum: ["جديد", "جيد", "مستعمل", "تالف", "غير واضح"] },
              quantity: { type: "number", description: "الكمية المقدرة" },
              details: { type: "string", description: "تفاصيل إضافية مثل السعر أو الموديل" },
              source: { type: "string", enum: ["image", "file"], description: "مصدر الاكتشاف" },
            },
            required: ["name", "type", "condition", "quantity"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
        totalEstimatedItems: { type: "number" },
        confidence: { type: "string", enum: ["عالي", "متوسط", "منخفض"] },
        imagesAnalyzed: { type: "number" },
        financialInfo: { type: "string", description: "ملخص المعلومات المالية المستخرجة إن وجدت" },
      },
      required: ["assets", "summary", "totalEstimatedItems", "confidence", "imagesAnalyzed"],
      additionalProperties: false,
    },
  },
};

// ---- MIME type detection ----
function getMimeType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "application/pdf";
  if (lower.includes(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.includes(".doc")) return "application/msword";
  if (lower.includes(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.includes(".xls")) return "application/vnd.ms-excel";
  if (lower.includes(".csv")) return "text/csv";
  if (lower.includes(".txt")) return "text/plain";
  return "application/octet-stream";
}

function isTextFile(mime: string): boolean {
  return mime === "text/plain" || mime === "text/csv";
}

function isSupportedDocument(mime: string): boolean {
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain",
  ].includes(mime);
}

// ---- Download and encode file ----
async function downloadFileAsBase64(url: string): Promise<{ base64: string; mime: string; text?: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`Failed to download ${url}: ${resp.status}`);
      return null;
    }
    const mime = getMimeType(url);
    
    if (isTextFile(mime)) {
      const text = await resp.text();
      return { base64: "", mime, text };
    }
    
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { base64, mime };
  } catch (e) {
    console.error(`Error downloading ${url}:`, e);
    return null;
  }
}

// ---- Image batch analysis ----
async function analyzeImageBatch(
  urls: string[],
  businessActivity: string,
  batchIndex: number,
  totalBatches: number,
  apiKey: string
): Promise<any> {
  const userContent: any[] = [
    {
      type: "text",
      text: `حلل الصور التالية (الدفعة ${batchIndex + 1} من ${totalBatches}) لنشاط تجاري${businessActivity ? ` (${businessActivity})` : ""} واستخرج جميع الأصول والمعدات المرئية. عدد الصور في هذه الدفعة: ${urls.length}`,
    },
  ];

  for (const url of urls) {
    userContent.push({ type: "image_url", image_url: { url } });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      messages: [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [ASSET_TOOL],
      tool_choice: { type: "function", function: { name: "report_detected_assets" } },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error(`Image batch ${batchIndex} failed:`, response.status, t);
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const result = JSON.parse(toolCall.function.arguments);
    // Tag each asset with source
    if (result.assets) {
      result.assets = result.assets.map((a: any) => ({ ...a, source: "image" }));
    }
    return result;
  } catch {
    return null;
  }
}

// ---- File analysis with text extraction ----
async function analyzeFileBatch(
  fileUrls: string[],
  businessActivity: string,
  apiKey: string
): Promise<any> {
  if (fileUrls.length === 0) return null;

  // Download and process each file
  const fileContents: Array<{ name: string; content: any }> = [];
  const textParts: string[] = [];

  for (const url of fileUrls) {
    const mime = getMimeType(url);
    if (!isSupportedDocument(mime)) continue;

    const downloaded = await downloadFileAsBase64(url);
    if (!downloaded) continue;

    const fileName = decodeURIComponent(url.split("/").pop() || "file");

    if (downloaded.text) {
      // Plain text / CSV → send as text directly
      textParts.push(`--- ملف: ${fileName} ---\n${downloaded.text.slice(0, 50000)}\n--- نهاية الملف ---`);
    } else {
      // Binary file (PDF, DOCX, XLSX) → send as inline_data to Gemini
      fileContents.push({
        name: fileName,
        content: {
          type: "image_url",
          image_url: { url: `data:${downloaded.mime};base64,${downloaded.base64}` },
        },
      });
    }
  }

  if (fileContents.length === 0 && textParts.length === 0) return null;

  // Build user message
  const userContent: any[] = [];

  let intro = `استخرج جميع المعدات والأصول المذكورة في المستندات التالية لنشاط تجاري${businessActivity ? ` (${businessActivity})` : ""}. عدد المستندات: ${fileContents.length + (textParts.length > 0 ? 1 : 0)}\n\nلكل أصل حدد: الاسم، النوع، الكمية، الحالة.`;

  if (textParts.length > 0) {
    intro += "\n\n" + textParts.join("\n\n");
  }

  userContent.push({ type: "text", text: intro });

  // Add binary files as inline data
  for (const fc of fileContents) {
    userContent.push(fc.content);
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      messages: [
        { role: "system", content: FILE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [ASSET_TOOL],
      tool_choice: { type: "function", function: { name: "report_detected_assets" } },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("File analysis failed:", response.status, t);
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const result = JSON.parse(toolCall.function.arguments);
    // Tag each asset with source
    if (result.assets) {
      result.assets = result.assets.map((a: any) => ({ ...a, source: "file" }));
    }
    return result;
  } catch {
    return null;
  }
}

// ---- Strict normalization key (FIX: prevent over-merging of distinct items) ----
function normalizeKey(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // remove Arabic diacritics
    .replace(/\s+/g, " ");
}

// ---- Merge and deduplicate (within same source: SUM quantities, exact key only) ----
function mergeAndDeduplicate(batches: any[]): any {
  const allAssets: any[] = [];
  let totalImages = 0;
  const summaries: string[] = [];

  for (const batch of batches) {
    if (!batch) continue;
    if (Array.isArray(batch.assets)) {
      allAssets.push(...batch.assets);
    }
    totalImages += batch.imagesAnalyzed || 0;
    if (batch.summary) summaries.push(batch.summary);
  }

  const deduplicated: any[] = [];
  const seen = new Map<string, number>();

  for (const asset of allAssets) {
    const key = normalizeKey(asset.name || "");
    if (!key) continue;

    // FIX 1: only EXACT key match — no .includes() to prevent merging distinct items
    if (seen.has(key)) {
      const idx = seen.get(key)!;
      const existing = deduplicated[idx];
      // FIX 2: SUM quantities across batches of same source (not Math.max)
      existing.quantity = (existing.quantity || 1) + (asset.quantity || 1);
      if (asset.details && !existing.details) existing.details = asset.details;
    } else {
      seen.set(key, deduplicated.length);
      deduplicated.push({ ...asset });
    }
  }

  return {
    assets: deduplicated,
    summary: summaries.join(" | "),
    totalEstimatedItems: deduplicated.reduce((sum: number, a: any) => sum + (a.quantity || 1), 0),
    imagesAnalyzed: totalImages,
  };
}

// ---- Combine image + file results: keep MAX (assume same items, different views) ----
function combineResults(
  imageResult: any,
  fileResult: any,
  manualInventory: any[] = []
): { combined: any; confidence: string } {
  const imageAssets = imageResult?.assets || [];
  const fileAssets = fileResult?.assets || [];

  // FIX 5: include seller's manual inventory as a trusted source
  const manualAssets = (Array.isArray(manualInventory) ? manualInventory : [])
    .filter((it: any) => it && (it.name || it.item))
    .map((it: any) => ({
      name: String(it.name || it.item || "").trim(),
      type: String(it.type || it.category || "غير محدد"),
      condition: String(it.condition || "جيد"),
      quantity: Number(it.quantity || it.qty || 1) || 1,
      details: it.details || it.notes || "",
      source: "manual",
    }))
    .filter((a: any) => a.name);

  const allAssets = [...imageAssets, ...fileAssets, ...manualAssets];

  const deduplicated: any[] = [];
  const seen = new Map<string, number>();

  for (const asset of allAssets) {
    const key = normalizeKey(asset.name || "");
    if (!key) continue;

    // FIX 1 (cross-source): only EXACT key match
    if (seen.has(key)) {
      const idx = seen.get(key)!;
      const existing = deduplicated[idx];
      // Across sources (image vs file vs manual): same physical item — keep MAX qty
      existing.quantity = Math.max(existing.quantity || 1, asset.quantity || 1);
      // Manual inventory takes precedence for condition/details (seller's truth)
      if (asset.source === "manual") {
        existing.condition = asset.condition || existing.condition;
        if (asset.details) existing.details = asset.details;
      }
      if (existing.source !== asset.source) {
        existing.source = existing.source === "manual" || asset.source === "manual"
          ? "verified"
          : "both";
      }
    } else {
      seen.set(key, deduplicated.length);
      deduplicated.push({ ...asset });
    }
  }

  // FIX 3: confidence boosted when manual inventory is provided
  let confidence = "منخفض";
  const sourceCount = (imageAssets.length > 0 ? 1 : 0) + (fileAssets.length > 0 ? 1 : 0) + (manualAssets.length > 0 ? 1 : 0);
  if (sourceCount >= 2) confidence = "عالي";
  else if (manualAssets.length > 0 || imageAssets.length > 5 || fileAssets.length > 3) confidence = "متوسط";
  else if (allAssets.length > 0) confidence = "متوسط";

  return {
    combined: {
      assets: deduplicated,
      totalItems: deduplicated.reduce((sum: number, a: any) => sum + (a.quantity || 1), 0),
      imageSources: imageAssets.length,
      fileSources: fileAssets.length,
      manualSources: manualAssets.length,
      summary: [imageResult?.summary, fileResult?.summary].filter(Boolean).join(" | "),
      financialInfo: fileResult?.financialInfo || null,
    },
    confidence,
  };
}

// ---- AI Asset Valuation ----
const CONDITION_MULTIPLIER: Record<string, number> = {
  "جديد": 1.0,
  "ممتاز": 0.85,
  "جيد": 0.70,
  "مستعمل": 0.50,
  "تالف": 0.30,
  "غير واضح": 0.50,
};

const VALUATION_TOOL = {
  type: "function" as const,
  function: {
    name: "report_valuations",
    description: "Report estimated market value for each asset",
    parameters: {
      type: "object",
      properties: {
        valuations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              base_price_sar: { type: "number", description: "السعر التقديري للوحدة بحالة جديدة بالريال السعودي" },
              reasoning: { type: "string", description: "مبرر التقدير" },
            },
            required: ["name", "base_price_sar", "reasoning"],
          },
        },
        market_notes: { type: "string", description: "ملاحظات عامة عن السوق" },
      },
      required: ["valuations", "market_notes"],
    },
  },
};

async function valuateAssets(
  assets: any[],
  businessActivity: string,
  dealPrice: number | null,
  apiKey: string
): Promise<any> {
  if (!assets.length) return null;

  const assetList = assets.map((a: any) =>
    `- ${a.name} (النوع: ${a.type}, الحالة: ${a.condition}, الكمية: ${a.quantity}${a.details ? `, تفاصيل: ${a.details}` : ""})`
  ).join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `أنت خبير تقييم أصول في السوق السعودي. قدّر السعر السوقي لكل أصل بحالة جديدة بالريال السعودي. استخدم معرفتك بأسعار المعدات والأجهزة في السوق السعودي.

مهم جداً:
- السعر يجب أن يكون للوحدة الواحدة بحالة جديدة
- استخدم أسعار واقعية من السوق السعودي
- إذا لم تعرف السعر الدقيق، قدّر نطاقاً معقولاً واستخدم المتوسط
- لا تترك أي أصل بدون تقييم`
        },
        {
          role: "user",
          content: `قيّم الأصول التالية لنشاط: ${businessActivity || "تجاري عام"}${dealPrice ? `\nالسعر المعروض للصفقة: ${dealPrice.toLocaleString()} ريال` : ""}\n\nالأصول:\n${assetList}`
        },
      ],
      tools: [VALUATION_TOOL],
      tool_choice: { type: "function", function: { name: "report_valuations" } },
    }),
  });

  if (!response.ok) {
    console.error("Valuation failed:", response.status);
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }
}

function buildPriceAnalysis(
  assets: any[],
  valuationResult: any,
  dealPrice: number | null
): any {
  if (!valuationResult?.valuations) return null;

  const valuationMap = new Map<string, any>();
  for (const v of valuationResult.valuations) {
    valuationMap.set(v.name?.trim()?.toLowerCase(), v);
  }

  const itemizedValues: any[] = [];
  let totalEstimatedValue = 0;

  for (const asset of assets) {
    const key = asset.name?.trim()?.toLowerCase();
    const valuation = valuationMap.get(key);
    const basePrice = valuation?.base_price_sar || 0;
    const conditionMult = CONDITION_MULTIPLIER[asset.condition] || 0.50;
    const qty = asset.quantity || 1;
    const adjustedPrice = Math.round(basePrice * conditionMult);
    const totalValue = adjustedPrice * qty;

    totalEstimatedValue += totalValue;

    itemizedValues.push({
      name: asset.name,
      type: asset.type,
      condition: asset.condition,
      quantity: qty,
      base_price: basePrice,
      condition_multiplier: conditionMult,
      adjusted_price: adjustedPrice,
      total_value: totalValue,
      reasoning: valuation?.reasoning || "",
      source: asset.source || "image",
    });
  }

  // Decision logic
  let decision = "غير محدد";
  let overpricedPercentage = 0;
  let difference = 0;

  if (dealPrice && dealPrice > 0 && totalEstimatedValue > 0) {
    difference = dealPrice - totalEstimatedValue;
    overpricedPercentage = Math.round((difference / totalEstimatedValue) * 100);

    if (overpricedPercentage <= -25) decision = "فرصة ممتازة";
    else if (overpricedPercentage <= -10) decision = "صفقة جيدة";
    else if (overpricedPercentage <= 10) decision = "سعر عادل";
    else if (overpricedPercentage <= 25) decision = "أعلى قليلاً";
    else decision = "مبالغ فيه";
  }

  return {
    estimated_value: totalEstimatedValue,
    deal_price: dealPrice || 0,
    difference,
    overpriced_percentage: overpricedPercentage,
    decision,
    items: itemizedValues,
    market_notes: valuationResult.market_notes || "",
    generated_at: new Date().toISOString(),
  };
}

// ---- Trust Score Calculation ----
const TRUST_SCORE_TOOL = {
  type: "function" as const,
  function: {
    name: "report_trust_score",
    description: "Report the deal trust score with detailed breakdown",
    parameters: {
      type: "object",
      properties: {
        trust_score: { type: "number", description: "الدرجة من 0 إلى 10 بفاصلة عشرية واحدة" },
        level: { type: "string", enum: ["ممتاز", "جيد جداً", "جيد", "متوسط", "ضعيف"] },
        summary: { type: "string", description: "ملخص قصير لسبب الدرجة" },
        strengths: { type: "array", items: { type: "string" }, description: "نقاط القوة" },
        weaknesses: { type: "array", items: { type: "string" }, description: "نقاط الضعف" },
        warnings: { type: "array", items: { type: "string" }, description: "تحذيرات مهمة" },
        factors: {
          type: "object",
          properties: {
            data_completeness: { type: "number", description: "0-10 اكتمال البيانات" },
            asset_verification: { type: "number", description: "0-10 التحقق من الأصول" },
            price_logic: { type: "number", description: "0-10 منطقية السعر" },
            legal_clarity: { type: "number", description: "0-10 الوضوح القانوني والتشغيلي" },
            media_quality: { type: "number", description: "0-10 جودة الوسائط" },
          },
          required: ["data_completeness", "asset_verification", "price_logic", "legal_clarity", "media_quality"],
        },
      },
      required: ["trust_score", "level", "summary", "strengths", "weaknesses", "warnings", "factors"],
    },
  },
};

async function calculateTrustScore(
  listing: any,
  combinedAssets: any,
  priceAnalysis: any,
  imageResult: any,
  fileResult: any,
  apiKey: string
): Promise<any> {
  try {
    const photoCount = listing.photos ? Object.values(listing.photos as Record<string, any[]>).flat().length : 0;
    const docCount = Array.isArray(listing.documents) ? listing.documents.length : 0;
    const imageAssetCount = imageResult?.assets?.length || 0;
    const fileAssetCount = fileResult?.assets?.length || 0;
    const combinedAssetCount = combinedAssets?.assets?.length || 0;
    const inventoryCount = Array.isArray(listing.inventory) ? listing.inventory.length : 0;

    const listingInfo = `
بيانات الإعلان:
- العنوان: ${listing.title || "غير محدد"}
- نوع الصفقة: ${listing.primary_deal_type || listing.deal_type || "غير محدد"}
- النشاط التجاري: ${listing.business_activity || "غير محدد"}
- المدينة: ${listing.city || "غير محدد"}
- الحي: ${listing.district || "غير محدد"}
- السعر: ${listing.price ? listing.price.toLocaleString() + " ريال" : "غير محدد"}
- الإيجار السنوي: ${listing.annual_rent || "غير محدد"}
- مدة العقد: ${listing.lease_duration || "غير محدد"}
- المتبقي من العقد: ${listing.lease_remaining || "غير محدد"}
- الالتزامات: ${listing.liabilities || "غير محدد"}
- رواتب متأخرة: ${listing.overdue_salaries || "غير محدد"}
- إيجار متأخر: ${listing.overdue_rent || "غير محدد"}
- رخصة بلدية: ${listing.municipality_license || "غير محدد"}
- الدفاع المدني: ${listing.civil_defense_license || "غير محدد"}
- كاميرات مراقبة: ${listing.surveillance_cameras || "غير محدد"}
- الوصف: ${listing.description ? listing.description.slice(0, 500) : "غير محدد"}
- عدد الصور: ${photoCount}
- عدد المستندات: ${docCount}
- أصول مكتشفة من الصور: ${imageAssetCount}
- أصول مكتشفة من المستندات: ${fileAssetCount}
- إجمالي الأصول المدمجة: ${combinedAssetCount}
- عناصر الجرد اليدوي: ${inventoryCount}
${priceAnalysis ? `- تحليل السعر: القيمة التقديرية ${priceAnalysis.estimated_value?.toLocaleString()} ريال، الفارق ${priceAnalysis.overpriced_percentage}%، القرار: ${priceAnalysis.decision}` : "- لا يوجد تحليل سعر"}
- المساحة: ${listing.area_sqm || "غير محددة"}
- الموقع الجغرافي: ${listing.location_lat && listing.location_lng ? "محدد" : "غير محدد"}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: `أنت خبير تقييم صفقات تجارية. مهمتك حساب مؤشر موثوقية الصفقة من 0 إلى 10.

## معايير التقييم (بالأوزان):
A) اكتمال البيانات (20%): نوع الصفقة، النشاط، الموقع، السعر، الوصف، المستندات، الصور
B) التحقق من الأصول (25%): أصول مكتشفة من الصور، أصول من المستندات، تطابق بينهما
C) منطقية السعر (20%): مقارنة السعر المعروض بالقيمة التقديرية للأصول
D) الوضوح القانوني والتشغيلي (20%): عقد الإيجار، الالتزامات، التراخيص
E) جودة الوسائط (15%): عدد الصور وتغطيتها

## مستويات الدرجة:
- 9.0-10: ممتاز
- 7.5-8.9: جيد جداً
- 6.0-7.4: جيد
- 4.0-5.9: متوسط
- 0-3.9: ضعيف

## تعليمات:
- كن دقيقاً وموضوعياً
- كل درجة يجب أن تكون مبررة
- اذكر نقاط القوة والضعف بوضوح
- أضف تحذيرات إذا وجدت تناقضات أو مخاطر
- لا تعطِ درجات عشوائية`,
          },
          { role: "user", content: `احسب مؤشر موثوقية الصفقة التالية:\n${listingInfo}` },
        ],
        tools: [TRUST_SCORE_TOOL],
        tool_choice: { type: "function", function: { name: "report_trust_score" } },
      }),
    });

    if (!response.ok) {
      console.error("Trust score calculation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return null;

    const result = JSON.parse(toolCall.function.arguments);
    return { ...result, generated_at: new Date().toISOString() };
  } catch (e) {
    console.error("Trust score error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrls, fileUrls, businessActivity, dealPrice, listingData } = await req.json();

    const hasPhotos = Array.isArray(photoUrls) && photoUrls.length > 0;
    const hasFiles = Array.isArray(fileUrls) && fileUrls.length > 0;

    if (!hasPhotos && !hasFiles) {
      return new Response(
        JSON.stringify({ error: "لا توجد صور أو ملفات للتحليل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activity = businessActivity || "";

    // --- IMAGE ANALYSIS: batch all images ---
    let imageResult: any = null;
    if (hasPhotos) {
      const allPhotoUrls = photoUrls.filter((u: any) => typeof u === "string" && u.startsWith("http"));
      const totalBatches = Math.ceil(allPhotoUrls.length / IMAGE_BATCH_SIZE);
      const batchResults: any[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const batch = allPhotoUrls.slice(i * IMAGE_BATCH_SIZE, (i + 1) * IMAGE_BATCH_SIZE);
        const result = await analyzeImageBatch(batch, activity, i, totalBatches, LOVABLE_API_KEY);
        if (result) batchResults.push(result);
        if (i < totalBatches - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (batchResults.length > 0) {
        const merged = mergeAndDeduplicate(batchResults);
        const bestConfidence = batchResults.reduce((best: string, b: any) => {
          if (b.confidence === "عالي") return "عالي";
          if (b.confidence === "متوسط" && best !== "عالي") return "متوسط";
          return best;
        }, "منخفض");

        imageResult = {
          ...merged,
          confidence: bestConfidence,
          detectedAt: new Date().toISOString(),
        };
      }
    }

    // --- FILE ANALYSIS: download, extract text, send to AI ---
    let fileResult: any = null;
    if (hasFiles) {
      const validFileUrls = fileUrls.filter((u: any) => typeof u === "string" && u.startsWith("http"));
      const fileBatchCount = Math.ceil(validFileUrls.length / FILE_BATCH_SIZE);
      const fileBatchResults: any[] = [];

      for (let i = 0; i < fileBatchCount; i++) {
        const batch = validFileUrls.slice(i * FILE_BATCH_SIZE, (i + 1) * FILE_BATCH_SIZE);
        const result = await analyzeFileBatch(batch, activity, LOVABLE_API_KEY);
        if (result) fileBatchResults.push(result);
        if (i < fileBatchCount - 1) await new Promise(r => setTimeout(r, 1500));
      }

      if (fileBatchResults.length > 0) {
        fileResult = mergeAndDeduplicate(fileBatchResults);
        fileResult.detectedAt = new Date().toISOString();
        fileResult.financialInfo = fileBatchResults
          .map((r: any) => r.financialInfo)
          .filter(Boolean)
          .join(" | ");
      }
    }

    // --- COMBINE ---
    const { combined, confidence } = combineResults(imageResult, fileResult);

    // --- VALUATION ---
    let priceAnalysis: any = null;
    const combinedAssets = combined?.assets || [];
    if (combinedAssets.length > 0) {
      const valuationResult = await valuateAssets(
        combinedAssets,
        activity,
        typeof dealPrice === "number" ? dealPrice : null,
        LOVABLE_API_KEY
      );
      if (valuationResult) {
        priceAnalysis = buildPriceAnalysis(
          combinedAssets,
          valuationResult,
          typeof dealPrice === "number" ? dealPrice : null
        );
      }
    }

    // --- TRUST SCORE ---
    let trustScore: any = null;
    if (listingData) {
      trustScore = await calculateTrustScore(
        listingData,
        combined,
        priceAnalysis,
        imageResult,
        fileResult,
        LOVABLE_API_KEY
      );
    }

    const output = {
      images: imageResult,
      files: fileResult,
      combined: { ...combined, confidence },
      priceAnalysis,
      trustScore,
      detectedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, detected: output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-assets error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
