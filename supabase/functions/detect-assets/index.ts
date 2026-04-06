import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_BATCH_SIZE = 20;
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

// ---- Merge and deduplicate ----
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
    const key = asset.name?.trim()?.toLowerCase();
    if (!key) continue;

    let found = false;
    for (const [existingKey, idx] of seen.entries()) {
      if (existingKey === key || existingKey.includes(key) || key.includes(existingKey)) {
        const existing = deduplicated[idx];
        existing.quantity = Math.max(existing.quantity || 1, asset.quantity || 1);
        if (asset.details && !existing.details) existing.details = asset.details;
        if (asset.source && existing.source && asset.source !== existing.source) {
          existing.source = "both";
        }
        found = true;
        break;
      }
    }

    if (!found) {
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

function combineResults(
  imageResult: any,
  fileResult: any
): { combined: any; confidence: string } {
  const imageAssets = imageResult?.assets || [];
  const fileAssets = fileResult?.assets || [];

  const allAssets = [...imageAssets, ...fileAssets];

  const deduplicated: any[] = [];
  const seen = new Map<string, number>();

  for (const asset of allAssets) {
    const key = asset.name?.trim()?.toLowerCase();
    if (!key) continue;

    let found = false;
    for (const [existingKey, idx] of seen.entries()) {
      if (existingKey === key || existingKey.includes(key) || key.includes(existingKey)) {
        const existing = deduplicated[idx];
        existing.quantity = Math.max(existing.quantity || 1, asset.quantity || 1);
        if (existing.source !== asset.source) existing.source = "images+files";
        found = true;
        break;
      }
    }

    if (!found) {
      seen.set(key, deduplicated.length);
      deduplicated.push({ ...asset });
    }
  }

  let confidence = "منخفض";
  if (imageAssets.length > 0 && fileAssets.length > 0) confidence = "عالي";
  else if (imageAssets.length > 5 || fileAssets.length > 3) confidence = "متوسط";
  else if (imageAssets.length > 0 || fileAssets.length > 0) confidence = "متوسط";

  return {
    combined: {
      assets: deduplicated,
      totalItems: deduplicated.reduce((sum: number, a: any) => sum + (a.quantity || 1), 0),
      imageSources: imageAssets.length,
      fileSources: fileAssets.length,
      summary: [imageResult?.summary, fileResult?.summary].filter(Boolean).join(" | "),
      financialInfo: fileResult?.financialInfo || null,
    },
    confidence,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrls, fileUrls, businessActivity } = await req.json();

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

    const output = {
      images: imageResult,
      files: fileResult,
      combined: { ...combined, confidence },
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
