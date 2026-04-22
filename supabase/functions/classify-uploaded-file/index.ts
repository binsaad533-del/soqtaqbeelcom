// supabase/functions/classify-uploaded-file/index.ts
// Commit 2: AI Router for unified file upload classification
// Calls Lovable AI Gateway (Gemini 2.5 Flash) with tool-calling for structured output.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
type Category =
  | "equipment_photo"
  | "property_photo"
  | "invoice_document"
  | "legal_document"
  | "asset_list"
  | "rejected"
  | "unclassified";

type Confidence = "high" | "medium" | "low";

interface ClassificationResult {
  category: Category;
  confidence: Confidence;
  reasoning: string;
  suggested_subcategory: string | null;
  rejection_reason: string | null;
}

interface RequestBody {
  listing_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

// ────────────────────────────────────────────────────────
// AI Prompt
// ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت مصنّف ملفات ذكي لمنصة "سوق تقبيل" (سوق الفرص التجارية السعودي).
مهمتك: تصنيف ملف رفعه بائع لإعلان تقبيل (بيع نشاط تجاري) إلى إحدى ست فئات بدقة.

الفئات الست:

1. equipment_photo — صور المعدات والأصول المادية
   - أي جسم مادي قابل للبيع: معدة، آلة، أداة، قطعة غيار، أثاث تشغيلي
   - حتى لو الإضاءة ضعيفة أو الزاوية صعبة
   - أمثلة: ماكينة CNC، فرن، ثلاجة عرض، طاولة، كرسي، رف عرض

2. property_photo — صور المكان (المحل/المصنع/المكتب)
   - داخلي أو خارجي أو واجهة أو لوحة إعلان أو شارع
   - suggested_subcategory: "interior" | "exterior" | "facade" | "signage" | "street" | "building"

3. invoice_document — فواتير وعروض أسعار
   - فاتورة، عرض سعر (Quotation)، إيصال شراء، Purchase Order
   - فاتورة ضريبية (Tax Invoice)
   - حتى لو بدون ختم رسمي

4. legal_document — وثائق قانونية رسمية
   - عقد إيجار، سجل تجاري، رخصة بلدية، شهادة ملكية، ترخيص دفاع مدني
   - suggested_subcategory: "commercial_register" | "lease_contract" | "municipality_license" | "civil_defense" | "ownership" | "other"
   - مهم: لو رأيت "السجل التجاري" أو "Commercial Registration" أو رقم سجل (10 خانات) → commercial_register

5. asset_list — قوائم جرد للأصول
   - جدول Excel/PDF/صورة فيه أسماء أصول + كميات + حالات
   - قائمة معدات مكتوبة (ليست فاتورة ولا عقد)

6. rejected — مرفوض (فقط للحالات الواضحة جداً)
   أمثلة الرفض الواضح فقط:
   - selfie أو صورة وجه شخصي
   - طعام أو مشروبات
   - لقطة شاشة لتطبيق (واتساب، انستقرام، إلخ)
   - حيوانات
   - منظر طبيعي (جبال، بحر) لا علاقة له بنشاط تجاري
   - صورة فاضية أو معطوبة أو سوداء بالكامل
   - دردشة واتساب أو رسائل نصية

⚠️ قاعدة حاكمة جوهرية:
عند الشك بين فئتين → اختر الأقرب مع confidence منخفض.
لا ترفض إلا عند اليقين التام بأن الملف لا يخدم إعلان تقبيل.
الافتراض الأساسي: البائع رفع الملف لسبب وجيه — مهمتك إيجاد الفئة الأنسب.

reasoning: شرح قصير بالعربية (سطر أو سطرين) لقرارك.
rejection_reason: اتركه null إلا لو category = "rejected".`;

// ────────────────────────────────────────────────────────
// Tool schema for structured output
// ────────────────────────────────────────────────────────
const CLASSIFICATION_TOOL = {
  type: "function" as const,
  function: {
    name: "classify_file",
    description: "تصنيف ملف رفعه البائع إلى إحدى الفئات الست",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [
            "equipment_photo",
            "property_photo",
            "invoice_document",
            "legal_document",
            "asset_list",
            "rejected",
          ],
          description: "الفئة المختارة",
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "مستوى الثقة في القرار",
        },
        reasoning: {
          type: "string",
          description: "شرح قصير بالعربية لسبب التصنيف",
        },
        suggested_subcategory: {
          type: ["string", "null"],
          description:
            "للـ property_photo: interior/exterior/facade/signage/street/building. للـ legal_document: commercial_register/lease_contract/municipality_license/civil_defense/ownership/other. وإلا: null",
        },
        rejection_reason: {
          type: ["string", "null"],
          description: "سبب الرفض بالعربية، فقط لو category=rejected",
        },
      },
      required: [
        "category",
        "confidence",
        "reasoning",
        "suggested_subcategory",
        "rejection_reason",
      ],
      additionalProperties: false,
    },
  },
};

// ────────────────────────────────────────────────────────
// Helper: detect if file is an image based on type/extension
// ────────────────────────────────────────────────────────
function isImageFile(fileType: string, fileName: string): boolean {
  if (fileType?.startsWith("image/")) return true;
  const ext = fileName.toLowerCase().split(".").pop() || "";
  return ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"].includes(ext);
}

function isPdfFile(fileType: string, fileName: string): boolean {
  if (fileType === "application/pdf") return true;
  return fileName.toLowerCase().endsWith(".pdf");
}

// ────────────────────────────────────────────────────────
// Build messages for AI Gateway
// ────────────────────────────────────────────────────────
function buildMessages(body: RequestBody) {
  const isImage = isImageFile(body.file_type, body.file_name);
  const isPdf = isPdfFile(body.file_type, body.file_name);

  const userParts: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `صنّف الملف التالي:
- اسم الملف: ${body.file_name}
- نوع الملف: ${body.file_type || "غير محدد"}
- رابط الملف: ${body.file_url}

${
  isImage
    ? "الملف صورة — حلّلها بصرياً."
    : isPdf
    ? "الملف PDF — استنتج الفئة من اسم الملف ومن المحتوى البصري للصفحة الأولى إن أمكن."
    : "الملف ليس صورة ولا PDF — استنتج من اسم الملف ونوعه."
}

استدعِ classify_file لإرجاع التصنيف.`,
    },
  ];

  // Attach image for visual analysis
  if (isImage) {
    userParts.push({
      type: "image_url",
      image_url: { url: body.file_url },
    });
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userParts },
  ];
}

// ────────────────────────────────────────────────────────
// Call Lovable AI Gateway
// ────────────────────────────────────────────────────────
async function callAIGateway(
  body: RequestBody,
  apiKey: string
): Promise<{ result: ClassificationResult; gatewayError?: string }> {
  const messages = buildMessages(body);

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [CLASSIFICATION_TOOL],
        tool_choice: { type: "function", function: { name: "classify_file" } },
      }),
    }
  );

  // Handle gateway-specific errors
  if (response.status === 429) {
    return {
      result: {
        category: "unclassified",
        confidence: "low",
        reasoning: "تجاوز حد الطلبات — سيتم إعادة المحاولة لاحقاً",
        suggested_subcategory: null,
        rejection_reason: null,
      },
      gatewayError: "rate_limit",
    };
  }

  if (response.status === 402) {
    return {
      result: {
        category: "unclassified",
        confidence: "low",
        reasoning: "خطأ في الاتصال بالذكاء الاصطناعي (رصيد منخفض)",
        suggested_subcategory: null,
        rejection_reason: null,
      },
      gatewayError: "payment_required",
    };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("[classify-uploaded-file] AI gateway error:", response.status, errText);
    return {
      result: {
        category: "unclassified",
        confidence: "low",
        reasoning: `فشل التصنيف التلقائي (HTTP ${response.status})`,
        suggested_subcategory: null,
        rejection_reason: null,
      },
      gatewayError: `http_${response.status}`,
    };
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function?.name !== "classify_file") {
    console.error("[classify-uploaded-file] No tool call in response:", JSON.stringify(data));
    return {
      result: {
        category: "unclassified",
        confidence: "low",
        reasoning: "فشل النموذج في إرجاع تصنيف منظم",
        suggested_subcategory: null,
        rejection_reason: null,
      },
      gatewayError: "no_tool_call",
    };
  }

  try {
    const args = JSON.parse(toolCall.function.arguments);
    return {
      result: {
        category: args.category as Category,
        confidence: (args.confidence ?? "low") as Confidence,
        reasoning: args.reasoning ?? "",
        suggested_subcategory: args.suggested_subcategory ?? null,
        rejection_reason: args.rejection_reason ?? null,
      },
    };
  } catch (e) {
    console.error("[classify-uploaded-file] Failed to parse tool args:", e);
    return {
      result: {
        category: "unclassified",
        confidence: "low",
        reasoning: "فشل قراءة استجابة النموذج",
        suggested_subcategory: null,
        rejection_reason: null,
      },
      gatewayError: "parse_error",
    };
  }
}

// ────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("[classify-uploaded-file] LOVABLE_API_KEY missing");
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestBody;

    // Basic validation
    if (!body.listing_id || !body.file_url || !body.file_name) {
      return new Response(
        JSON.stringify({ error: "listing_id, file_url, file_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[classify-uploaded-file] start:", {
      listing_id: body.listing_id,
      file_name: body.file_name,
      file_type: body.file_type,
    });

    // Call AI Gateway
    const { result, gatewayError } = await callAIGateway(body, LOVABLE_API_KEY);

    console.log(
      "[classify-uploaded-file] decision:",
      JSON.stringify({
        file_name: body.file_name,
        ai_category: result.category,
        ai_confidence: result.confidence,
        reasoning: result.reasoning,
        gatewayError: gatewayError ?? null,
      })
    );

    // Persist to DB (upsert by unique constraint on listing_id + file_url)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const row = {
      listing_id: body.listing_id,
      file_url: body.file_url,
      file_name: body.file_name,
      file_type: body.file_type ?? null,
      ai_category: result.category,
      ai_confidence: result.confidence,
      ai_reasoning: result.reasoning,
      ai_subcategory: result.suggested_subcategory,
      // Defaults: seller can override later in Review Dialog
      final_category: result.category,
      final_subcategory: result.suggested_subcategory,
      is_confirmed: false,
    };

    const { data: saved, error: dbError } = await supabase
      .from("file_classifications")
      .upsert(row, { onConflict: "listing_id,file_url" })
      .select()
      .single();

    if (dbError) {
      console.error("[classify-uploaded-file] DB upsert error:", dbError);
      return new Response(
        JSON.stringify({
          error: "Failed to save classification",
          details: dbError.message,
          classification: result,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Status code maps:
    // - 429 → propagate so client can throttle
    // - 402 → propagate so client shows credit toast
    // - else → 200 (even on unclassified, row is saved)
    const status =
      gatewayError === "rate_limit"
        ? 429
        : gatewayError === "payment_required"
        ? 402
        : 200;

    return new Response(
      JSON.stringify({
        success: status === 200,
        classification: saved,
        gatewayError: gatewayError ?? null,
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[classify-uploaded-file] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
