import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Field-specific verification prompts for the three critical document types.
const FIELD_RULES: Record<string, { label: string; description: string; markers: string; rejectExamples: string }> = {
  asset_list: {
    label: "قائمة الأصول",
    description:
      "وثيقة (Excel/PDF/صورة جدول/قائمة مكتوبة) تحتوي على جدول أو قائمة منظمة للأصول والمعدات بأسماء وكميات و/أو حالات و/أو أسعار.",
    markers:
      "1) عمود/قائمة بأسماء الأصول (مثل: ثلاجة، فرن، طاولة، كاشير...)\n2) أعمدة إضافية مثل: الكمية، الحالة، السعر، الموديل، السنة\n3) ترتيب جدولي أو قائمة مرقّمة واضحة\n4) عدد عناصر معقول (عادةً ≥ 3)",
    rejectExamples:
      "صورة لمنتج واحد، صورة شخصية، إيصال شراء فردي، صورة محل بدون قائمة، فاتورة مفردة، هوية، سجل تجاري",
  },
  equipment_photos: {
    label: "صور المعدات",
    description:
      "صورة فوتوغرافية حقيقية لمعدة أو أجهزة أو أدوات أو أثاث تشغيلي يستخدم في النشاط التجاري (مثل: ثلاجات، أفران، مكائن قهوة، طاولات، رفوف، كاشير، شاشات، معدات مطبخ، معدات صالون...).",
    markers:
      "1) جهاز/معدة/أداة تشغيلية ظاهرة بوضوح\n2) صورة حقيقية وليست رسماً أو شعاراً\n3) المعدة منطقياً مرتبطة بنشاط تجاري",
    rejectExamples:
      "صورة شخص، طعام جاهز فقط، مستندات/أوراق، شاشة كمبيوتر بنص، شعار، رسم توضيحي، صورة سيارة شخصية، صورة سيلفي، لقطة شاشة",
  },
  ownership_proof: {
    label: "إثبات ملكية",
    description:
      "مستند رسمي يثبت ملكية الأصول أو المعدات أو النشاط، مثل: فاتورة شراء رسمية، عقد بيع، سند ملكية، شهادة جمركية، فاتورة ضريبية باسم البائع، أو كشف موثق.",
    markers:
      "1) نص رسمي مكتوب (فاتورة/عقد/سند)\n2) يحتوي على اسم بائع/مورد، تاريخ، أرقام، مبالغ، أو ختم\n3) يربط الأصل بالمالك بشكل واضح",
    rejectExamples:
      "صورة معدة فقط بدون مستند، صورة شخصية، صورة محل، صورة طعام، لقطة شاشة عشوائية، صورة هوية فقط (إلا إذا مرفقة كجزء من سند)، صورة فارغة",
  },
};

const SYSTEM_PROMPT = (rule: typeof FIELD_RULES[string]) => `أنت نظام تحقق صارم في منصة "سوق تقبيل" السعودية. مهمتك الوحيدة هي التحقق مما إذا كان الملف المرفوع يطابق نوع المستند المتوقع.

نوع المستند المتوقع: **${rule.label}**

الوصف: ${rule.description}

علامات القبول (يجب أن يحتوي الملف على عدة منها):
${rule.markers}

أمثلة على ما يجب رفضه فوراً:
${rule.rejectExamples}

قواعد صارمة:
1. كن متشدداً — لا تقبل ملفاً إلا إذا كان واضحاً أنه يطابق النوع المتوقع.
2. إذا كانت الصورة ضبابية جداً أو لا يمكن تحديد محتواها، ارفضها مع ذكر السبب.
3. صف بدقة ما تراه فعلياً في حقل document_type_detected.
4. لا تخمن. كن صريحاً في rejection_reason إذا رفضت.
5. أجب باستخدام الأداة المتوفرة فقط.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentUrl, expectedType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!documentUrl || !expectedType) {
      return new Response(
        JSON.stringify({ error: "documentUrl و expectedType مطلوبان" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rule = FIELD_RULES[expectedType];
    if (!rule) {
      return new Response(
        JSON.stringify({ error: `نوع غير مدعوم: ${expectedType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlLower = documentUrl.toLowerCase().split("?")[0];
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];
    let isImage = imageExtensions.some((ext) => urlLower.endsWith(ext));
    let isPdf = urlLower.endsWith(".pdf");
    let isSpreadsheet = /\.(xlsx?|csv)$/i.test(urlLower);

    // Fallback: when extension is unknown (e.g., signed URLs without extension),
    // probe the Content-Type via HEAD so we don't reject valid uploads.
    if (!isImage && !isPdf && !isSpreadsheet) {
      try {
        const head = await fetch(documentUrl, { method: "HEAD" });
        const ct = (head.headers.get("content-type") || "").toLowerCase();
        if (ct.startsWith("image/")) isImage = true;
        else if (ct.includes("pdf")) isPdf = true;
        else if (ct.includes("spreadsheet") || ct.includes("excel") || ct.includes("csv")) isSpreadsheet = true;
      } catch (_) {
        // ignore — fall through to existing checks
      }
    }

    if (!isImage) {
      if (expectedType === "equipment_photos") {
        return new Response(
          JSON.stringify({
            is_valid: false,
            document_type_detected: isPdf ? "ملف PDF" : isSpreadsheet ? "ملف Excel/CSV" : "ملف غير صورة",
            rejection_reason: "حقل صور المعدات يقبل صوراً فقط (PNG/JPG/WebP/HEIC). يرفض رفع صورة فعلية للمعدة.",
            confidence: "high",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (expectedType === "asset_list" && (isSpreadsheet || isPdf)) {
        return new Response(
          JSON.stringify({
            is_valid: true,
            document_type_detected: isSpreadsheet ? "ملف Excel/CSV لقائمة الأصول" : "ملف PDF لقائمة الأصول",
            confidence: "medium",
            note: "تم قبول الملف بناءً على نوعه الهيكلي. سيتم تحليل المحتوى لاحقاً عند الجرد التلقائي.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (expectedType === "ownership_proof" && isPdf) {
        return new Response(
          JSON.stringify({
            is_valid: true,
            document_type_detected: "مستند PDF (فاتورة/عقد/سند مرجح)",
            confidence: "medium",
            note: "تم قبول الملف بناءً على كونه PDF — يفترض أن يكون فاتورة أو عقداً.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          is_valid: false,
          document_type_detected: "نوع ملف غير مدعوم للتحقق البصري",
          rejection_reason: "يرجى رفع صورة (PNG/JPG/WebP) أو PDF حسب نوع الحقل.",
          confidence: "high",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = [
      {
        type: "text",
        text: `تحقق بدقة: هل هذه الصورة فعلاً من نوع "${rule.label}"؟ إذا لم تكن كذلك، ارفضها مع ذكر السبب الواضح ونوع الملف الفعلي.`,
      },
      { type: "image_url", image_url: { url: documentUrl, detail: "high" } },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT(rule) },
          { role: "user", content },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_verification",
              description: `Verify whether the uploaded image matches the expected document type: ${rule.label}.`,
              parameters: {
                type: "object",
                properties: {
                  is_valid: {
                    type: "boolean",
                    description: `true فقط إذا كانت الصورة تطابق فعلياً "${rule.label}". false لأي شيء آخر.`,
                  },
                  document_type_detected: {
                    type: "string",
                    description: "وصف دقيق ومختصر لما تراه فعلياً في الصورة.",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "إذا is_valid=false، اشرح سبب الرفض بوضوح.",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "مستوى الثقة في التحقق.",
                  },
                  notes: {
                    type: "string",
                    description: "ملاحظات إضافية اختيارية.",
                  },
                },
                required: ["is_valid", "document_type_detected", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_verification" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI verify error:", response.status, t);
      return new Response(JSON.stringify({ error: "تعذّر التحقق من الملف" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "فشل تحليل الملف" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    if (result.is_valid === false) {
      console.warn("Document rejected:", { expectedType, detected: result.document_type_detected, reason: result.rejection_reason });
      return new Response(
        JSON.stringify({
          is_valid: false,
          document_type_detected: result.document_type_detected,
          rejection_reason: result.rejection_reason || `الملف لا يطابق نوع "${rule.label}".`,
          confidence: result.confidence,
          expected_label: rule.label,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ...result, expected_label: rule.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
