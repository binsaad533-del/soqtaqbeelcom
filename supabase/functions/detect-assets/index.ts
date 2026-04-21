import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Performance & limits ----
const IMAGE_BATCH_SIZE = 6;          // smaller batches → faster individual call
const FILE_BATCH_SIZE = 5;
const IMAGE_CONCURRENCY = 3;         // 3 batches in parallel
const FILE_CONCURRENCY = 2;
const MAX_PHOTOS = 30;
const MAX_FILES = 10;
const AI_CALL_TIMEOUT_MS = 130_000;  // safety cutoff per AI call
const RETRY_DELAY_MS = 2_000;

const IMAGE_SYSTEM_PROMPT = `أنت مُثمّن أصول خبير في السوق السعودي والخليجي. مهمتك تحليل صور إعلانات التقبيل واكتشاف الأصول مع تقدير قيمتها السوقية.

**قواعد الاكتشاف:**
- اذكر كل أصل تراه بوضوح: ماركة، موديل، عدد، حالة
- للأصول المتعددة المتطابقة: استخدم quantity
- للأصول الغامضة جزئياً: اذكرها مع وضع price_confidence="يتطلب_معاينة"

**قواعد التسعير — إلزامية:**
لكل أصل تراه بوضوح، يجب تقدير estimated_unit_price_sar > 0 باستخدام معرفتك بالأسواق التالية حسب فئة الأصل:

1. **أدوات يدوية كهربائية** (دريل، صاروخ، فارة، صنفرة، راوتر):
   - المرجع: حراج، السوق المفتوح، OpenSooq، متاجر السعودية (ساكو، جرير)
   - price_confidence: "متوسط" غالباً

2. **ماركات عالمية معروفة** (Bosch, Makita, DeWalt, Hilti, Milwaukee):
   - المرجع: extra.com، Amazon.sa، Noon، X-cite، مواقع الماركات الرسمية
   - مع خصم الاستهلاك (30-50% للمستعمل حسب الحالة)
   - price_confidence: "عالي" إذا ظهر الموديل، "متوسط" إذا ظهرت الماركة فقط

3. **معدات CNC وصناعية كبيرة** (CNC routers, edge banders, panel saws):
   - المرجع: Alibaba، Made-in-China، IndiaMART، موزعون خليجيون
   - معظمها صيني المنشأ — قارن بالأسعار الجديدة واخصم الاستهلاك
   - price_confidence: "متوسط" إذا ظهر الموديل

4. **أثاث مكتبي** (كراسي، طاولات، مكاتب):
   - المرجع: IKEA، Home Centre، السدحان للمستعمل، حراج
   - price_confidence: "متوسط"

5. **مركبات** (بيك أب، شاحنات):
   - المرجع: syarah.com، حراج السيارات، Motory
   - price_confidence: "متوسط" مع ذكر الموديل والسنة التقديرية

6. **معدات لحام وضواغط وإنتاج متخصص**:
   - المرجع: موزعون صناعيون سعوديون + Alibaba للمقارنة
   - price_confidence: "متوسط"

**متى تستخدم "يتطلب_معاينة" (حصراً):**
- الأصل ضبابي أو مغطى جزئياً في الصورة
- لا يمكن تحديد فئة الأصل أصلاً
- الأصل تالف والتقييم يعتمد على فحص داخلي
- مخزون غير واضح المحتوى الفعلي

**ممنوع استخدام "يتطلب_معاينة" كمخرج للتردد.** إذا ترددت بين "منخفض" و"يتطلب_معاينة"، اختر "منخفض" وقدّم تقديراً.

**في price_reasoning:** اذكر (1) أساس التقدير: ماركة/موديل/فئة، (2) المصدر المرجعي، (3) الحالة. جملة واحدة.
مثال: "Bosch GSB 570 مستعمل - مرجع extra.com جديد ~380 ر.س، مستعمل حراج ~180 ر.س"

**قواعد النزاهة:**
- لا تخترع ماركات غير ظاهرة في الصورة
- إذا الماركة ظاهرة لكن الموديل غير واضح، اذكر الماركة فقط
- price_reasoning يجب أن يبرر الرقم، لا يكتفي بالقول "تقدير"
`;

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
              estimated_unit_price_sar: {
                type: "number",
                description: "السعر التقديري للوحدة الواحدة من الصورة بالريال السعودي (السوق الثانوي السعودي)",
              },
              price_confidence: {
                type: "string",
                enum: ["عالي", "متوسط", "منخفض", "يتطلب_معاينة"],
                description: "مستوى الثقة في التقدير. استخدم يتطلب_معاينة إذا لم يكن التقدير ممكناً من الصورة",
              },
              brand_visible: {
                type: "string",
                description: "الماركة أو الموديل المرئي على الأصل إن وجد (مثل Bosch GWS-750) - فارغ إذا غير واضح",
              },
              price_reasoning: {
                type: "string",
                description: "شرح مختصر لكيفية تقدير السعر من الصورة",
              },
            },
            required: ["name", "type", "condition", "quantity", "estimated_unit_price_sar", "price_confidence"],
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

// ---- AI fetch with timeout ----
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Retry wrapper ----
async function withRetry<T>(label: string, fn: () => Promise<T | null>): Promise<T | null> {
  try {
    const r = await fn();
    if (r) return r;
  } catch (e) {
    console.error(`[${label}] attempt 1 failed:`, (e as Error).message);
  }
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  try {
    return await fn();
  } catch (e) {
    console.error(`[${label}] attempt 2 failed:`, (e as Error).message);
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

  const t0 = Date.now();
  const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      temperature: 0.1,
      messages: [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [ASSET_TOOL],
      tool_choice: { type: "function", function: { name: "report_detected_assets" } },
    }),
  }, AI_CALL_TIMEOUT_MS);

  const elapsed = Date.now() - t0;
  console.log(`[detect-assets] image batch ${batchIndex + 1}/${totalBatches} (${urls.length} imgs) → HTTP ${response.status} in ${elapsed}ms`);

  if (!response.ok) {
    const t = await response.text();
    console.error(`Image batch ${batchIndex} failed:`, response.status, t.slice(0, 300));
    return null;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const result = JSON.parse(toolCall.function.arguments);
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

  const t0 = Date.now();
  const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
  }, AI_CALL_TIMEOUT_MS);

  console.log(`[detect-assets] file batch (${fileContents.length + textParts.length} items) → HTTP ${response.status} in ${Date.now() - t0}ms`);

  if (!response.ok) {
    const t = await response.text();
    console.error("File analysis failed:", response.status, t.slice(0, 300));
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

// ---- Loose key for cross-source fuzzy matching (singular form, no qualifiers) ----
// Used ONLY when comparing image-detected vs file/manual to avoid double-counting
// the same physical asset described differently (e.g. "ثلاجة عرض" vs "ثلاجة عرض زجاجية").
const STOPWORDS = new Set([
  "كبير","كبيرة","صغير","صغيرة","متوسط","متوسطة",
  "جديد","جديدة","قديم","قديمة","مستعمل","مستعملة",
  "أبيض","ابيض","أسود","اسود","رمادي","فضي","ذهبي","ملون",
  "زجاجي","زجاجية","معدني","معدنية","خشبي","خشبية","بلاستيك","بلاستيكي",
  "صناعي","صناعية","تجاري","تجارية","كهربائي","كهربائية","يدوي","يدوية",
  "double","single","large","small","medium","new","used","old","big","mini",
]);
function looseKey(name: string): string {
  const base = normalizeKey(name);
  if (!base) return "";
  const tokens = base.split(/\s+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  // Keep first 2 meaningful tokens — captures "ثلاجة عرض", "آلة منشار", etc.
  return tokens.slice(0, 2).join(" ");
}

// ---- Levenshtein-lite similarity for catching minor wording differences ----
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  if (longer.includes(shorter) && shorter.length >= 4) return 0.9;
  // Token overlap (Jaccard)
  const ta = new Set(a.split(/\s+/).filter((t) => t.length >= 2));
  const tb = new Set(b.split(/\s+/).filter((t) => t.length >= 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
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
  const exactSeen = new Map<string, number>();
  const looseIndex: Array<{ key: string; idx: number; source: string }> = [];

  for (const asset of allAssets) {
    const key = normalizeKey(asset.name || "");
    if (!key) continue;
    const lkey = looseKey(asset.name || "");

    // 1) Exact match — definitive duplicate
    if (exactSeen.has(key)) {
      const idx = exactSeen.get(key)!;
      const existing = deduplicated[idx];
      // Same physical item across sources: keep MAX qty (don't sum)
      existing.quantity = Math.max(existing.quantity || 1, asset.quantity || 1);
      if (asset.source === "manual") {
        existing.condition = asset.condition || existing.condition;
        if (asset.details) existing.details = asset.details;
      }
      if (existing.source !== asset.source) {
        existing.source = (existing.source === "manual" || asset.source === "manual")
          ? "verified" : "both";
      }
      continue;
    }

    // 2) Cross-source fuzzy match — only between DIFFERENT sources, similarity ≥ 0.7
    let mergedIdx = -1;
    if (lkey) {
      for (const entry of looseIndex) {
        if (entry.source === asset.source) continue; // never fuzzy-merge within same source
        if (entry.key !== lkey) {
          const sim = similarity(entry.key, lkey);
          if (sim < 0.7) continue;
        }
        // Additional safety: full-name similarity must also be ≥ 0.6
        const fullSim = similarity(normalizeKey(deduplicated[entry.idx].name), key);
        if (fullSim < 0.55) continue;
        mergedIdx = entry.idx;
        break;
      }
    }

    if (mergedIdx >= 0) {
      const existing = deduplicated[mergedIdx];
      existing.quantity = Math.max(existing.quantity || 1, asset.quantity || 1);
      // Manual is the seller's truth — overwrite name/condition
      if (asset.source === "manual") {
        existing.name = asset.name;
        existing.condition = asset.condition || existing.condition;
        if (asset.details) existing.details = asset.details;
      }
      existing.source = "verified";
    } else {
      const idx = deduplicated.length;
      exactSeen.set(key, idx);
      if (lkey) looseIndex.push({ key: lkey, idx, source: asset.source });
      deduplicated.push({ ...asset });
    }
  }

  // FIX 3 (tightened): confidence requires REAL multi-source coverage, not just presence
  let confidence = "منخفض";
  const hasImages = imageAssets.length >= 3;
  const hasFiles = fileAssets.length >= 2;
  const hasManual = manualAssets.length >= 3;
  const sourceCount = (hasImages ? 1 : 0) + (hasFiles ? 1 : 0) + (hasManual ? 1 : 0);

  if (sourceCount >= 2 && deduplicated.length >= 5) confidence = "عالي";
  else if (sourceCount >= 2 || (hasManual && deduplicated.length >= 3) || (hasImages && deduplicated.length >= 5)) confidence = "متوسط";
  else if (deduplicated.length > 0) confidence = "منخفض";

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
// FIX 4: Less punishing condition multipliers (defaults bias was too aggressive)
const CONDITION_MULTIPLIER: Record<string, number> = {
  "جديد": 1.0,
  "ممتاز": 0.92,
  "جيد": 0.82,
  "مستعمل": 0.70,    // was 0.50 — too punishing for normal used equipment
  "تالف": 0.35,
  "غير واضح": 0.75,  // was 0.50 — assume reasonable when not clearly damaged
};

// Range multipliers (low/high) to express valuation uncertainty
const CONDITION_RANGE: Record<string, { low: number; high: number }> = {
  "جديد": { low: 0.90, high: 1.05 },
  "ممتاز": { low: 0.82, high: 1.00 },
  "جيد": { low: 0.70, high: 0.92 },
  "مستعمل": { low: 0.55, high: 0.82 },
  "تالف": { low: 0.20, high: 0.50 },
  "غير واضح": { low: 0.60, high: 0.90 },
};

const VALUATION_TOOL = {
  type: "function" as const,
  function: {
    name: "report_valuations",
    description: "Report estimated market value for each asset, distinguishing new vs used pricing",
    parameters: {
      type: "object",
      properties: {
        valuations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              base_price_sar: { type: "number", description: "السعر التقديري للوحدة بحالة جديدة بالريال السعودي (سعر الوكيل)" },
              used_market_price_sar: { type: "number", description: "السعر السوقي الفعلي للوحدة المستعملة في السوق السعودي (السوق الثانوي). للمعدات الثقيلة والمركبات هذا قد يكون 25-55% من سعر الجديد بحسب العمر والحالة وساعات التشغيل" },
              estimated_age_factor: { type: "string", enum: ["unknown", "recent", "mid_age", "old"], description: "تقدير عمر المعدة من الصورة (recent: <3 سنوات، mid_age: 3-8، old: >8). استخدم unknown إذا لا يمكن التحديد" },
              missing_critical_info: { type: "array", items: { type: "string" }, description: "معلومات حرجة مفقودة لتقدير دقيق (مثلاً: سنة الصنع، ساعات التشغيل، حالة المحرك)" },
              reasoning: { type: "string", description: "مبرر التقدير مع شرح الفرق بين سعر الجديد والمستعمل" },
            },
            required: ["name", "base_price_sar", "used_market_price_sar", "estimated_age_factor", "reasoning"],
          },
        },
        market_notes: { type: "string", description: "ملاحظات عامة عن السوق ومستوى الثقة في التقدير" },
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

  // FIX: short-circuit when image-stage already produced per-asset prices.
  // Avoids a blind second AI call that has no visual context.
  const allHavePrices = assets.every((a: any) =>
    (typeof a.estimated_unit_price_sar === "number" && a.estimated_unit_price_sar > 0) ||
    a.price_confidence === "يتطلب_معاينة"
  );

  if (allHavePrices) {
    return {
      valuations: assets.map((a: any) => ({
        name: a.name,
        base_price_sar: a.estimated_unit_price_sar || 0,
        used_market_price_sar: a.estimated_unit_price_sar || 0,
        estimated_age_factor: "unknown",
        reasoning: a.price_reasoning || "تقدير من الصورة",
        requires_inspection: a.price_confidence === "يتطلب_معاينة",
        price_confidence: a.price_confidence || "متوسط",
      })),
      market_notes: "تقدير من تحليل الصور مباشرة",
    };
  }

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
      // FIX 3: Pro model has stronger pricing knowledge for SA market
      model: "google/gemini-2.5-pro",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `أنت خبير تقييم أصول في السوق السعودي مع خبرة في السوق الثانوي للمعدات المستعملة.

لكل أصل، يجب تقدير سعرين:
1) base_price_sar: سعر الوحدة جديدة من الوكيل المعتمد
2) used_market_price_sar: السعر السوقي الفعلي للوحدة المستعملة (السوق الثانوي السعودي/حراج)

قواعد حرجة:
- للمعدات الثقيلة (شيولات، حفارات، رافعات، شاحنات): سعر المستعمل عادة 25-55% من الجديد بحسب العمر وساعات التشغيل
- للمركبات: 40-70% بحسب العمر والممشى
- للأجهزة الإلكترونية والتقنية: 30-60% بحسب العمر
- للأثاث والمعدات البسيطة: 40-65%
- للمعدات الصناعية الثقيلة (تبريد، أفران): 35-60%

إلزامي:
- يجب دائماً إعطاء قيمة رقمية موجبة لـ base_price_sar وuse_market_price_sar حتى لو كانت تقديرية تقريبية. لا تتركها صفر أو فارغة.
- إذا لم تكن متأكداً، استخدم نطاقاً متحفظاً (مثلاً متوسط فئة المنتج في السوق السعودي) ووثّق التحفظ في reasoning و missing_critical_info.
- لا تفترض المعدات جديدة إذا كانت الصورة تظهر معدة قائمة في موقع تشغيل
- استخدم used_market_price_sar كأساس للتقييم وليس سعر الجديد
- إذا لم تظهر سنة الصنع أو ساعات التشغيل، أدرجها في missing_critical_info واستخدم تقدير منتصف العمر (5-7 سنوات) مع نسبة إهلاك 50-60% من سعر الجديد`
        },
        {
          role: "user",
          content: `قيّم الأصول التالية لنشاط: ${businessActivity || "تجاري عام"}${dealPrice ? `\nالسعر المعروض للصفقة: ${dealPrice.toLocaleString()} ريال` : ""}\n\nالأصول:\n${assetList}\n\nملاحظة: هذه أصول قائمة (مستعملة) في إعلان بيع وليست جديدة من الوكيل.`
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
  dealPrice: number | null,
  confidence: string = "متوسط"
): any {
  if (!valuationResult?.valuations) return null;

  const valuationMap = new Map<string, any>();
  for (const v of valuationResult.valuations) {
    valuationMap.set(normalizeKey(v.name || ""), v);
  }

  const itemizedValues: any[] = [];
  const unvaluedItems: any[] = []; // FIX: track items the AI couldn't price
  const inspectionItems: any[] = []; // items AI explicitly flagged as يتطلب_معاينة
  let totalEstimatedValue = 0;
  let totalLow = 0;
  let totalHigh = 0;
  let valuedAssetCount = 0;
  let totalAssetCount = 0;
  let itemsMissingCriticalInfo = 0;
  let itemsWithUnknownAge = 0;
  const missingInfoDetails: string[] = [];

  for (const asset of assets) {
    const key = normalizeKey(asset.name || "");
    const valuation = valuationMap.get(key);
    const newPrice = valuation?.base_price_sar || 0;
    // FIX: prefer the explicit used-market price; fall back to condition-multiplier on new price
    const usedMarketPrice = valuation?.used_market_price_sar || 0;
    const conditionMult = CONDITION_MULTIPLIER[asset.condition] || 0.75;
    const range = CONDITION_RANGE[asset.condition] || { low: 0.55, high: 0.95 };
    const qty = asset.quantity || 1;
    totalAssetCount += qty;

    // Track confidence-degrading factors
    const missingInfo: string[] = Array.isArray(valuation?.missing_critical_info) ? valuation.missing_critical_info : [];
    const ageFactor: string = valuation?.estimated_age_factor || "unknown";
    if (missingInfo.length > 0) {
      itemsMissingCriticalInfo += qty;
      for (const m of missingInfo) {
        if (!missingInfoDetails.includes(m)) missingInfoDetails.push(m);
      }
    }
    if (ageFactor === "unknown") itemsWithUnknownAge += qty;

    // Choose the effective base for valuation:
    // - If AI gave us a used-market price, use it directly (no condition multiplier — already factored)
    // - Otherwise, fall back to new-price * condition multiplier (legacy path)
    const effectiveBase = usedMarketPrice > 0 ? usedMarketPrice : newPrice;

    // FIX: skip assets with zero base price — don't pollute totals with silent zeros
    if (!effectiveBase || effectiveBase <= 0) {
      const requiresInspection = valuation?.requires_inspection === true || valuation?.price_confidence === "يتطلب_معاينة";
      const reasonLabel = requiresInspection
        ? "يتطلب معاينة ميدانية لتقدير دقيق"
        : "لم يتمكن المحرك من تقدير السعر السوقي لهذا العنصر";
      const itemEntry = {
        name: asset.name,
        type: asset.type,
        quantity: qty,
        condition: asset.condition,
        reason: reasonLabel,
        requires_inspection: requiresInspection,
      };
      if (requiresInspection) inspectionItems.push(itemEntry);
      else unvaluedItems.push(itemEntry);
      itemizedValues.push({
        name: asset.name,
        type: asset.type,
        condition: asset.condition,
        quantity: qty,
        base_price: 0,
        condition_multiplier: conditionMult,
        adjusted_price: 0,
        total_value: 0,
        value_low: 0,
        value_high: 0,
        reasoning: requiresInspection ? "يتطلب معاينة — احصل على تقييم معتمد" : "غير مُقيَّم — يتطلب مراجعة بشرية",
        source: asset.source || "image",
        price_confidence: requiresInspection ? "يتطلب_معاينة" : (valuation?.price_confidence || "منخفض"),
        unvalued: true,
        requires_inspection: requiresInspection,
      });
      continue;
    }

    // If we have an explicit used price, condition is already implicit — apply only a small range
    // for market uncertainty (±15%). Otherwise fall back to condition multipliers.
    let adjustedPrice: number;
    let lowValue: number;
    let highValue: number;
    if (usedMarketPrice > 0) {
      adjustedPrice = Math.round(usedMarketPrice);
      lowValue = Math.round(usedMarketPrice * 0.80) * qty;
      highValue = Math.round(usedMarketPrice * 1.15) * qty;
    } else {
      adjustedPrice = Math.round(newPrice * conditionMult);
      lowValue = Math.round(newPrice * range.low) * qty;
      highValue = Math.round(newPrice * range.high) * qty;
    }
    const totalValue = adjustedPrice * qty;

    totalEstimatedValue += totalValue;
    totalLow += lowValue;
    totalHigh += highValue;
    valuedAssetCount += qty;

    itemizedValues.push({
      name: asset.name,
      type: asset.type,
      condition: asset.condition,
      quantity: qty,
      base_price: newPrice,
      used_market_price: usedMarketPrice,
      condition_multiplier: usedMarketPrice > 0 ? null : conditionMult,
      estimated_age_factor: ageFactor,
      missing_critical_info: missingInfo,
      adjusted_price: adjustedPrice,
      total_value: totalValue,
      value_low: lowValue,
      value_high: highValue,
      reasoning: valuation?.reasoning || "",
      source: asset.source || "image",
      price_confidence: valuation?.price_confidence || (usedMarketPrice > 0 ? "متوسط" : "منخفض"),
      requires_inspection: false,
    });
  }

  // FIX: degrade confidence based on multiple signals
  const valuedRatio = totalAssetCount > 0 ? valuedAssetCount / totalAssetCount : 1;
  const missingInfoRatio = totalAssetCount > 0 ? itemsMissingCriticalInfo / totalAssetCount : 0;
  const unknownAgeRatio = totalAssetCount > 0 ? itemsWithUnknownAge / totalAssetCount : 0;

  let effectiveConfidence = confidence;
  if (valuedRatio < 0.4) effectiveConfidence = "منخفض";
  else if (valuedRatio < 0.7 && effectiveConfidence === "عالي") effectiveConfidence = "متوسط";
  // Heavy machinery / vehicles without age info → low confidence
  if (missingInfoRatio >= 0.5 || unknownAgeRatio >= 0.5) {
    effectiveConfidence = "منخفض";
  } else if (missingInfoRatio >= 0.3 && effectiveConfidence === "عالي") {
    effectiveConfidence = "متوسط";
  }

  // Decision logic — uses RANGE not single point (Option C)
  let decision = "غير محدد";
  let overpricedPercentage = 0;
  let difference = 0;

  if (dealPrice && dealPrice > 0 && totalEstimatedValue > 0) {
    difference = dealPrice - totalEstimatedValue;
    overpricedPercentage = Math.round((difference / totalEstimatedValue) * 100);

    // FIX: with low confidence, never claim a strong verdict — neutralize to "تقدير غير مؤكد"
    if (effectiveConfidence === "منخفض") {
      decision = "تقدير غير مؤكد";
    } else {
      // Use range bounds for fairer decision: only flag overpriced if above HIGH bound
      if (dealPrice <= totalLow * 0.85) decision = "فرصة ممتازة";
      else if (dealPrice <= totalLow) decision = "صفقة جيدة";
      else if (dealPrice <= totalHigh) decision = "سعر عادل";
      else if (dealPrice <= totalHigh * 1.20) decision = "أعلى قليلاً";
      else decision = "مبالغ فيه";
    }
  } else if (totalEstimatedValue > 0) {
    // FIX 4: when listing has no price, label as suggestion mode
    decision = effectiveConfidence === "منخفض" ? "اقتراح أولي" : "اقتراح سعر";
  }

  // FIX 4: produce a "suggested asking price" range for sellers — slightly above mid-range
  // for negotiation room, but bounded by the upper estimate.
  let suggestedPriceRange: { low: number; high: number; recommended: number } | null = null;
  if (totalEstimatedValue > 0 && totalLow > 0 && totalHigh > 0) {
    const mid = Math.round((totalLow + totalHigh) / 2);
    const recommended = Math.round(mid * 1.05); // +5% negotiation buffer
    suggestedPriceRange = {
      low: Math.round(totalLow * 0.95),
      high: Math.round(totalHigh * 1.10),
      recommended: Math.min(recommended, Math.round(totalHigh * 1.08)),
    };
  }

  // Build a clear disclaimer — surface the missing-info reason if present
  const disclaimerParts: string[] = [];
  if (unvaluedItems.length > 0 || inspectionItems.length > 0) {
    const summaryBits: string[] = [`القيمة تقديرية للأصول التي تم تقييمها فقط (${valuedAssetCount} من ${totalAssetCount}).`];
    if (inspectionItems.length > 0) {
      summaryBits.push(`${inspectionItems.length} أصل يتطلب معاينة ميدانية لتقدير دقيق.`);
    }
    if (unvaluedItems.length > 0) {
      summaryBits.push(`${unvaluedItems.length} عنصر يحتاج مراجعة بشرية.`);
    }
    disclaimerParts.push(summaryBits.join(" "));
  } else {
    disclaimerParts.push("القيمة تقديرية بناءً على الأصول المرئية والمستندات.");
  }
  if (effectiveConfidence === "منخفض" && missingInfoDetails.length > 0) {
    disclaimerParts.push(`مستوى الثقة منخفض بسبب نقص: ${missingInfoDetails.slice(0, 4).join("، ")}. التقدير الدقيق يتطلب معاينة ميدانية.`);
  } else {
    disclaimerParts.push("النطاق يعكس عدم اليقين في الحالة والسوق.");
  }

  return {
    estimated_value: totalEstimatedValue,
    estimated_range: { low: totalLow, high: totalHigh },
    suggested_price_range: suggestedPriceRange,
    valuation_confidence: effectiveConfidence,
    deal_price: dealPrice || 0,
    difference,
    overpriced_percentage: overpricedPercentage,
    decision,
    items: itemizedValues,
    unvalued_items: unvaluedItems,
    inspection_items: inspectionItems,
    valued_ratio: Math.round(valuedRatio * 100),
    valued_count: valuedAssetCount,
    total_count: totalAssetCount,
    missing_info_summary: missingInfoDetails,
    market_notes: valuationResult.market_notes || "",
    disclaimer: disclaimerParts.join(" "),
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
A) اكتمال البيانات (20%): نوع الصفقة، النشاط، الموقع، الوصف، المستندات، الصور (السعر **اختياري** في إعلانات المسودة)
B) التحقق من الأصول (25%): أصول مكتشفة من الصور، أصول من المستندات، تطابق بينهما، وجود جرد يدوي
C) منطقية السعر (20%): مقارنة السعر المعروض بالقيمة التقديرية للأصول
D) الوضوح القانوني والتشغيلي (20%): عقد الإيجار، الالتزامات، التراخيص
E) جودة الوسائط (15%): عدد الصور وتغطيتها (المستندات تعوّض جزئياً عن نقص الصور)

## مستويات الدرجة:
- 9.0-10: ممتاز
- 7.5-8.9: جيد جداً
- 6.0-7.4: جيد
- 4.0-5.9: متوسط
- 0-3.9: ضعيف

## قواعد عادلة (مهم جداً):
- إذا كان السعر "غير محدد" (إعلان قيد الإعداد): امنح price_logic درجة محايدة **7/10** ولا تعتبره ضعفاً
- إذا كان هناك جرد مفصّل أو مستندات قوية: ارفع asset_verification حتى لو الصور قليلة
- إذا كانت المستندات الرسمية (CR, ترخيص، فواتير) موجودة: ارفع legal_clarity
- لا تعاقب الإعلان مرتين على نفس النقص (مثلاً: غياب الصور لا يجب أن يخفّض media_quality و asset_verification معاً إذا كانت المستندات تغطي ذلك)
- لا تعطِ درجات عشوائية — كل درجة يجب أن تكون مبررة بدليل ملموس من البيانات`,
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

// ---- Run async tasks with bounded concurrency ----
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { photoUrls, fileUrls, businessActivity, dealPrice, listingData, manualInventory, listingId } =
      await req.json();

    const hasPhotos = Array.isArray(photoUrls) && photoUrls.length > 0;
    const hasFiles = Array.isArray(fileUrls) && fileUrls.length > 0;
    const inventoryFromListing = Array.isArray(listingData?.inventory) ? listingData.inventory : [];
    const hasManual =
      (Array.isArray(manualInventory) && manualInventory.length > 0) ||
      inventoryFromListing.length > 0;

    if (!hasPhotos && !hasFiles && !hasManual) {
      return new Response(
        JSON.stringify({ error: "لا توجد صور أو ملفات أو جرد يدوي للتحليل" }),
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

    // Optional Supabase admin client for incremental writes
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = (listingId && SUPABASE_URL && SERVICE_KEY)
      ? createClient(SUPABASE_URL, SERVICE_KEY)
      : null;

    const writePartial = async (label: string, patch: Record<string, unknown>) => {
      if (!adminClient || !listingId) return;
      try {
        const { error } = await adminClient.from("listings").update(patch).eq("id", listingId);
        if (error) console.error(`[detect-assets] partial write (${label}) failed:`, error.message);
        else console.log(`[detect-assets] partial write (${label}) OK`);
      } catch (e) {
        console.error(`[detect-assets] partial write (${label}) threw:`, (e as Error).message);
      }
    };

    const activity = businessActivity || "";

    // --- Apply hard caps with truncation flags ---
    const allPhotoUrls = hasPhotos
      ? (photoUrls as any[]).filter((u) => typeof u === "string" && u.startsWith("http"))
      : [];
    const photosTruncated = allPhotoUrls.length > MAX_PHOTOS;
    const usedPhotoUrls = photosTruncated ? allPhotoUrls.slice(0, MAX_PHOTOS) : allPhotoUrls;

    const allFileUrls = hasFiles
      ? (fileUrls as any[]).filter((u) => typeof u === "string" && u.startsWith("http"))
      : [];
    const filesTruncated = allFileUrls.length > MAX_FILES;
    const usedFileUrls = filesTruncated ? allFileUrls.slice(0, MAX_FILES) : allFileUrls;

    console.log(
      `[detect-assets] start photos=${usedPhotoUrls.length}/${allPhotoUrls.length}` +
      ` files=${usedFileUrls.length}/${allFileUrls.length} listingId=${listingId || "n/a"}` +
      ` writes=${adminClient ? "incremental" : "final-only"}`
    );

    // --- IMAGE ANALYSIS: parallel batches with retry ---
    let imageResult: any = null;
    if (usedPhotoUrls.length > 0) {
      const totalBatches = Math.ceil(usedPhotoUrls.length / IMAGE_BATCH_SIZE);
      const batchSlices: string[][] = [];
      for (let i = 0; i < totalBatches; i++) {
        batchSlices.push(usedPhotoUrls.slice(i * IMAGE_BATCH_SIZE, (i + 1) * IMAGE_BATCH_SIZE));
      }

      // running aggregate so we can write after every completed batch
      const completed: any[] = [];
      let completedCount = 0;

      const batchResults = await runWithConcurrency(batchSlices, IMAGE_CONCURRENCY, async (batch, i) => {
        const result = await withRetry(`image-batch-${i + 1}`, () =>
          analyzeImageBatch(batch, activity, i, totalBatches, LOVABLE_API_KEY)
        );
        completedCount++;
        if (result) {
          completed.push(result);
          // Incremental write of currently-known assets
          const partial = mergeAndDeduplicate(completed);
          await writePartial(`images ${completedCount}/${totalBatches}`, {
            ai_detected_assets: partial.assets,
            ai_assets_combined: partial.assets,
            ai_analysis_updated_at: new Date().toISOString(),
          });
        }
        return result;
      });

      const successful = batchResults.filter(Boolean) as any[];
      if (successful.length > 0) {
        const merged = mergeAndDeduplicate(successful);
        const bestConfidence = successful.reduce((best: string, b: any) => {
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
      console.log(
        `[detect-assets] images done in ${Date.now() - startedAt}ms` +
        ` ok=${successful.length}/${totalBatches}`
      );
    }

    // --- FILE ANALYSIS: parallel batches with retry ---
    let fileResult: any = null;
    if (usedFileUrls.length > 0) {
      const fileBatchCount = Math.ceil(usedFileUrls.length / FILE_BATCH_SIZE);
      const fileSlices: string[][] = [];
      for (let i = 0; i < fileBatchCount; i++) {
        fileSlices.push(usedFileUrls.slice(i * FILE_BATCH_SIZE, (i + 1) * FILE_BATCH_SIZE));
      }

      const fileBatchResults = await runWithConcurrency(fileSlices, FILE_CONCURRENCY, (batch, i) =>
        withRetry(`file-batch-${i + 1}`, () => analyzeFileBatch(batch, activity, LOVABLE_API_KEY))
      );

      const successful = fileBatchResults.filter(Boolean) as any[];
      if (successful.length > 0) {
        fileResult = mergeAndDeduplicate(successful);
        fileResult.detectedAt = new Date().toISOString();
        fileResult.financialInfo = successful
          .map((r: any) => r.financialInfo)
          .filter(Boolean)
          .join(" | ");
      }
      console.log(
        `[detect-assets] files done in ${Date.now() - startedAt}ms` +
        ` ok=${successful.length}/${fileBatchCount}`
      );
    }

    // --- COMBINE ---
    const effectiveInventory = Array.isArray(manualInventory) && manualInventory.length > 0
      ? manualInventory
      : inventoryFromListing;
    const { combined, confidence } = combineResults(imageResult, fileResult, effectiveInventory);

    // Incremental write after combine (covers files + manual)
    if (combined?.assets?.length) {
      await writePartial("combined", {
        ai_detected_assets: combined.assets,
        ai_assets_combined: combined.assets,
        ai_analysis_updated_at: new Date().toISOString(),
      });
    }

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
          typeof dealPrice === "number" ? dealPrice : null,
          confidence
        );
        await writePartial("valuation", {
          ai_price_analysis: priceAnalysis,
          ai_analysis_updated_at: new Date().toISOString(),
        });
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
      if (trustScore) {
        await writePartial("trust", {
          ai_trust_score: trustScore,
          ai_analysis_updated_at: new Date().toISOString(),
        });
      }
    }

    const output = {
      images: imageResult,
      files: fileResult,
      combined: { ...combined, confidence },
      priceAnalysis,
      trustScore,
      truncated: photosTruncated || filesTruncated
        ? {
            photos: { used: usedPhotoUrls.length, total: allPhotoUrls.length },
            files: { used: usedFileUrls.length, total: allFileUrls.length },
          }
        : null,
      elapsedMs: Date.now() - startedAt,
      detectedAt: new Date().toISOString(),
    };

    console.log(`[detect-assets] DONE in ${Date.now() - startedAt}ms`);

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
