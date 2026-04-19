import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// Document classifier — verifies that each uploaded file actually matches
// the slot label it was uploaded under (e.g. "عقد الإيجار" must really be a
// lease contract). Prevents the AI from blindly trusting slot labels.
// ============================================================================

const KNOWN_DOC_KINDS = [
  "lease_contract",        // عقد إيجار
  "commercial_register",   // سجل تجاري
  "municipality_license",  // رخصة بلدية
  "civil_defense_license", // رخصة دفاع مدني
  "id_document",           // هوية / إقامة / جواز
  "invoice",               // فاتورة شراء
  "inventory_list",        // قائمة جرد / كشف أصول
  "financial_statement",   // قوائم مالية / أرباح وخسائر
  "bank_statement",        // كشف حساب بنكي
  "salary_record",         // كشف رواتب
  "trademark_certificate", // شهادة علامة تجارية
  "vat_certificate",       // شهادة ضريبة القيمة المضافة
  "zakat_certificate",     // شهادة زكاة ودخل
  "other_business_doc",    // مستند تجاري آخر
  "irrelevant",            // غير ذي صلة بالأعمال (سيلفي، ميم، صورة شخصية...)
  "unreadable",            // غير قابل للقراءة (ضبابي، فارغ، تالف)
] as const;

const SLOT_TO_EXPECTED_KIND: Record<string, string> = {
  "عقد الإيجار": "lease_contract",
  "السجل التجاري": "commercial_register",
  "رخصة البلدية": "municipality_license",
  "رخصة الدفاع المدني": "civil_defense_license",
  "فواتير شراء المعدات": "invoice",
  "قائمة الجرد": "inventory_list",
};

const KIND_LABEL_AR: Record<string, string> = {
  lease_contract: "عقد إيجار",
  commercial_register: "سجل تجاري",
  municipality_license: "رخصة بلدية",
  civil_defense_license: "رخصة دفاع مدني",
  id_document: "وثيقة هوية",
  invoice: "فاتورة",
  inventory_list: "قائمة جرد",
  financial_statement: "قوائم مالية",
  bank_statement: "كشف حساب بنكي",
  salary_record: "كشف رواتب",
  trademark_certificate: "شهادة علامة تجارية",
  vat_certificate: "شهادة ضريبية",
  zakat_certificate: "شهادة زكاة",
  other_business_doc: "مستند تجاري آخر",
  irrelevant: "غير ذي صلة",
  unreadable: "غير قابل للقراءة",
};

// ---- MIME helpers ----
function getMimeType(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".xls")) return "application/ms-excel";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function isVisualMime(mime: string): boolean {
  // Gemini can read these directly via image_url
  return mime.startsWith("image/") || mime === "application/pdf";
}

function isTextMime(mime: string): boolean {
  return mime === "text/plain" || mime === "text/csv";
}

async function downloadAsBase64(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const mime = getMimeType(url);
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Skip very large files (> 8 MB) to keep request size sane
    if (bytes.length > 8 * 1024 * 1024) return null;
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mime };
  } catch (e) {
    console.error(`download failed ${url}:`, e);
    return null;
  }
}

async function downloadAsText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const text = await resp.text();
    return text.slice(0, 30_000);
  } catch {
    return null;
  }
}

const CLASSIFIER_TOOL = {
  type: "function" as const,
  function: {
    name: "classify_document",
    description: "Classify a single uploaded business document",
    parameters: {
      type: "object",
      properties: {
        detected_kind: {
          type: "string",
          enum: [...KNOWN_DOC_KINDS],
          description: "النوع الفعلي للمستند المستخرج من محتواه",
        },
        confidence: {
          type: "string",
          enum: ["عالي", "متوسط", "منخفض"],
        },
        summary_ar: {
          type: "string",
          description: "ملخص قصير (سطر أو سطرين) لما يحتويه الملف فعلياً",
        },
        readable: {
          type: "boolean",
          description: "هل الملف مقروء وواضح؟",
        },
        problems: {
          type: "array",
          items: { type: "string" },
          description: "مشاكل ملحوظة مثل: صورة ضبابية، نص غير عربي، صفحة مقطوعة، ملف فارغ...",
        },
      },
      required: ["detected_kind", "confidence", "summary_ar", "readable", "problems"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `أنت مدقق مستندات تجارية خبير في السوق السعودي.
مهمتك: فحص ملف واحد رُفع من قبل مالك إعلان تقبيل، وتحديد ما هو هذا الملف فعلياً بناءً على محتواه — وليس بناءً على اسمه أو الخانة التي رُفع فيها.

قواعد صارمة:
- لا تثق بالخانة التي رُفع فيها الملف. ركّز فقط على المحتوى الفعلي.
- إذا كان الملف صورة عشوائية (سيلفي، طبيعة، ميم، شعار، صورة منتج بدون نص قانوني) صنّفه irrelevant.
- إذا كان الملف ضبابياً أو فارغاً أو لا يمكن قراءته صنّفه unreadable.
- إذا كان مستنداً قانونياً/تجارياً واضحاً، حدد نوعه بدقة من القائمة المتاحة.
- استخدم summary_ar لوصف ما تراه فعلاً (مثلاً: "صورة شاحنة بيضاء بدون أي نص" أو "عقد إيجار مؤرخ 2024 لمحل في الرياض").`;

async function classifyOne(
  url: string,
  slotLabel: string,
  apiKey: string,
): Promise<{
  url: string;
  slot: string;
  expected_kind: string | null;
  detected_kind: string;
  confidence: string;
  summary_ar: string;
  readable: boolean;
  problems: string[];
  mismatch: boolean;
} | null> {
  const expected_kind = SLOT_TO_EXPECTED_KIND[slotLabel] || null;
  const mime = getMimeType(url);

  const userContent: any[] = [];
  const introText = `الخانة التي رُفع فيها الملف (للسياق فقط — لا تعتمد عليها): "${slotLabel}".
حدد بدقة ما هو هذا المستند فعلياً.`;

  if (isVisualMime(mime)) {
    const dl = await downloadAsBase64(url);
    if (!dl) return null;
    userContent.push({ type: "text", text: introText });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${dl.mime};base64,${dl.base64}` },
    });
  } else if (isTextMime(mime)) {
    const text = await downloadAsText(url);
    if (!text) return null;
    userContent.push({
      type: "text",
      text: `${introText}\n\n--- محتوى الملف النصي ---\n${text}\n--- نهاية الملف ---`,
    });
  } else {
    // DOCX/XLSX — Gemini can sometimes parse via inline_data, try as document
    const dl = await downloadAsBase64(url);
    if (!dl) {
      // Can't classify without content — return a "skipped" marker instead of false positive
      return {
        url,
        slot: slotLabel,
        expected_kind,
        detected_kind: "other_business_doc",
        confidence: "منخفض",
        summary_ar: "ملف من نوع غير قابل للقراءة المباشرة (Excel/Word)؛ لم يتم التحقق من المحتوى",
        readable: true,
        problems: ["لم يتم التحقق من تطابق المحتوى مع الخانة"],
        mismatch: false,
      };
    }
    userContent.push({ type: "text", text: introText });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${dl.mime};base64,${dl.base64}` },
    });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [CLASSIFIER_TOOL],
      tool_choice: { type: "function", function: { name: "classify_document" } },
    }),
  });

  if (!resp.ok) {
    console.error(`classify ${url} failed:`, resp.status, await resp.text().catch(() => ""));
    return null;
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  let result: any;
  try {
    result = JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }

  const detected_kind = String(result.detected_kind || "other_business_doc");
  // Mismatch = expected kind exists AND detected kind is different AND not unreadable
  const mismatch =
    !!expected_kind &&
    detected_kind !== expected_kind &&
    detected_kind !== "unreadable" &&
    // "other_business_doc" is ambiguous — only flag if irrelevant or clearly different category
    (detected_kind === "irrelevant" || KNOWN_DOC_KINDS.includes(detected_kind as any));

  // Refine: don't flag mismatch if detected is "other_business_doc" with low confidence
  const finalMismatch =
    mismatch &&
    !(detected_kind === "other_business_doc" && result.confidence === "منخفض");

  return {
    url,
    slot: slotLabel,
    expected_kind,
    detected_kind,
    confidence: String(result.confidence || "متوسط"),
    summary_ar: String(result.summary_ar || ""),
    readable: Boolean(result.readable),
    problems: Array.isArray(result.problems) ? result.problems.map((p: any) => String(p)) : [],
    mismatch: finalMismatch,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const documents = body?.documents;
    if (!Array.isArray(documents)) {
      return new Response(
        JSON.stringify({ error: "documents array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Flatten { type, files: [...] } → list of {url, slot}
    const tasks: Array<{ url: string; slot: string }> = [];
    for (const doc of documents) {
      const slot = String(doc?.type || "").trim() || "عام";
      if (Array.isArray(doc?.files)) {
        for (const url of doc.files) {
          if (typeof url === "string" && url.startsWith("http")) {
            tasks.push({ url, slot });
          }
        }
      }
    }

    // Cap at 20 files to control cost / latency
    const capped = tasks.slice(0, 20);

    // Run classification in parallel batches of 4
    const results: any[] = [];
    const BATCH = 4;
    for (let i = 0; i < capped.length; i += BATCH) {
      const batch = capped.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map((t) => classifyOne(t.url, t.slot, apiKey).catch((e) => {
          console.error("classifyOne error:", e);
          return null;
        })),
      );
      for (const r of batchResults) if (r) results.push(r);
    }

    const mismatches = results.filter((r) => r.mismatch);
    const unreadable = results.filter((r) => !r.readable || r.detected_kind === "unreadable");
    const irrelevant = results.filter((r) => r.detected_kind === "irrelevant");

    // Build human-readable warnings (Arabic)
    const warnings: string[] = [];
    for (const m of mismatches) {
      const expectedAr = m.expected_kind ? KIND_LABEL_AR[m.expected_kind] || m.expected_kind : m.slot;
      const detectedAr = KIND_LABEL_AR[m.detected_kind] || m.detected_kind;
      if (m.detected_kind === "irrelevant") {
        warnings.push(`الملف المرفوع في خانة "${m.slot}" لا يحتوي على ${expectedAr} — يبدو غير ذي صلة (${m.summary_ar}).`);
      } else {
        warnings.push(`الملف المرفوع في خانة "${m.slot}" ليس ${expectedAr} بل ${detectedAr} (${m.summary_ar}).`);
      }
    }
    for (const u of unreadable) {
      warnings.push(`الملف في خانة "${u.slot}" غير واضح أو غير قابل للقراءة: ${u.summary_ar}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_files: capped.length,
        classified: results.length,
        mismatches_count: mismatches.length,
        unreadable_count: unreadable.length,
        irrelevant_count: irrelevant.length,
        warnings,
        files: results,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("classify-documents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
