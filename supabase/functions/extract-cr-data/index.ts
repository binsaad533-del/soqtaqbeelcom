import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت نظام ذكاء اصطناعي متخصص في **التحقق من** و**استخراج البيانات** من وثائق السجلات التجارية السعودية الرسمية الصادرة عن وزارة التجارة.

================================================================
المرحلة الأولى — التحقق (CRITICAL — قبل أي استخراج)
================================================================

عليك أولاً تحديد ما إذا كان المستند المرفوع هو **فعلاً سجل تجاري سعودي رسمي صالح**.

علامات السجل التجاري السعودي الأصلي (يجب أن يحتوي على عدة منها):
1. شعار أو ترويسة "وزارة التجارة" أو "المملكة العربية السعودية"
2. عبارة صريحة "سجل تجاري" أو "Commercial Registration"
3. رقم سجل تجاري مكوّن من 10 أرقام يبدأ غالباً بـ 1010 (الرياض)، 2050 (الدمام)، 4030 (جدة)، إلخ.
4. اسم منشأة / كيان تجاري واضح
5. نشاط تجاري مذكور صراحة
6. تاريخ إصدار وتاريخ انتهاء بالتقويم الهجري أو الميلادي
7. رمز QR أو ختم رسمي للوزارة (في النسخ الحديثة)

أمثلة على ما **يجب رفضه**:
- صور لمنتجات، أشخاص، أماكن، طعام، سيارات، أو أي شيء غير وثائقي
- مستندات شخصية أخرى: هوية وطنية، إقامة، جواز سفر، رخصة قيادة
- وثائق غير ذات صلة: عقد إيجار، فاتورة، رخصة بلدية، شهادة دفاع مدني، شهادة زكاة
- لقطات شاشة عشوائية، صور تجريبية، صور فارغة أو غير واضحة تماماً
- مستندات أجنبية (سجلات تجارية من دول أخرى)
- صور نص عشوائي أو ملفات لا علاقة لها بالأعمال

================================================================
المرحلة الثانية — الاستخراج (فقط إذا كان المستند صالحاً)
================================================================

إذا — وفقط إذا — تأكدت أن المستند سجل تجاري سعودي رسمي، استخرج:
- رقم السجل التجاري
- اسم المنشأة / الكيان
- النشاط التجاري (الأساسي والفرعي إن وجد)
- المدينة
- العنوان أو الحي إن وجد
- تاريخ الإصدار / تاريخ الانتهاء
- الحالة (ساري / منتهي / موقوف)
- نوع المنشأة (فردية / شركة / مؤسسة)
- اسم المالك إن وجد

قواعد صارمة:
- إذا لم يكن المستند سجلاً تجارياً سعودياً → ضع is_valid_cr=false واذكر السبب بدقة في rejection_reason. لا تستخرج أي بيانات.
- لا تخمن. الحقول غير المقروءة = null.
- إذا كانت الصورة سجل تجاري لكنها ضبابية بشدة، اعتبرها صالحة بثقة منخفضة.

أجب باستخدام الأداة المتوفرة فقط.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!documentUrl) {
      return new Response(JSON.stringify({ error: "لا يوجد مستند للتحليل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the URL points to a non-image file (PDF, docx, etc.)
    const urlLower = documentUrl.toLowerCase().split("?")[0];
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];
    const isImage = imageExtensions.some((ext) => urlLower.endsWith(ext));
    if (!isImage) {
      return new Response(
        JSON.stringify({
          error: "يرجى رفع صورة للسجل التجاري (PNG أو JPG أو WebP). لا يمكن تحليل ملفات PDF أو Word مباشرة.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content: any[] = [
      {
        type: "text",
        text: "تحقّق أولاً من أن هذه صورة سجل تجاري سعودي رسمي. إذا لم تكن كذلك، ارفضها مع سبب واضح. وإلا، استخرج البيانات.",
      },
      {
        type: "image_url",
        image_url: { url: documentUrl, detail: "high" },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_cr_data",
              description: "Verify and report on the uploaded document. Set is_valid_cr=false for anything that is not a Saudi commercial registration document.",
              parameters: {
                type: "object",
                properties: {
                  is_valid_cr: {
                    type: "boolean",
                    description: "true فقط إذا كان المستند سجلاً تجارياً سعودياً رسمياً صادراً من وزارة التجارة. false لأي شيء آخر (صورة، هوية، إيجار، رخصة، إلخ).",
                  },
                  document_type_detected: {
                    type: "string",
                    description: "وصف مختصر لنوع المستند المكتشف فعلياً (مثال: 'صورة مطعم', 'هوية وطنية', 'سجل تجاري سعودي', 'فاتورة', 'صورة غير واضحة').",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "إذا is_valid_cr=false، اشرح بدقة لماذا تم الرفض وما هو المستند المتوقع.",
                  },
                  cr_number: { type: "string", description: "رقم السجل التجاري" },
                  entity_name: { type: "string", description: "اسم المنشأة" },
                  business_activity: { type: "string", description: "النشاط التجاري الأساسي" },
                  secondary_activities: {
                    type: "array",
                    items: { type: "string" },
                    description: "الأنشطة الفرعية إن وجدت",
                  },
                  city: { type: "string", description: "المدينة" },
                  district: { type: "string", description: "الحي أو العنوان" },
                  issue_date: { type: "string", description: "تاريخ الإصدار" },
                  expiry_date: { type: "string", description: "تاريخ الانتهاء" },
                  status: {
                    type: "string",
                    enum: ["ساري", "منتهي", "موقوف", "غير واضح"],
                    description: "حالة السجل",
                  },
                  entity_type: { type: "string", description: "نوع المنشأة (فردية / شركة / مؤسسة)" },
                  owner_name: { type: "string", description: "اسم المالك" },
                  extraction_confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "مستوى الثقة الكلي في الاستخراج",
                  },
                  extraction_notes: {
                    type: "string",
                    description: "ملاحظات عن جودة الاستخراج أو المشاكل",
                  },
                  fields_confidence: {
                    type: "object",
                    properties: {
                      cr_number: { type: "string", enum: ["high", "medium", "low"] },
                      entity_name: { type: "string", enum: ["high", "medium", "low"] },
                      business_activity: { type: "string", enum: ["high", "medium", "low"] },
                      city: { type: "string", enum: ["high", "medium", "low"] },
                      district: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    description: "مستوى الثقة لكل حقل",
                  },
                },
                required: ["is_valid_cr", "document_type_detected", "extraction_confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_cr_data" } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ في تحليل السجل التجاري" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من قراءة السجل التجاري" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    // ENFORCE validation: if AI determined this isn't a CR, return a 422 with a clear error
    if (result.is_valid_cr === false) {
      const detected = result.document_type_detected || "مستند غير معروف";
      const reason = result.rejection_reason || "المستند المرفوع ليس سجلاً تجارياً سعودياً.";
      console.warn("CR validation rejected:", { detected, reason, documentUrl });
      return new Response(
        JSON.stringify({
          error: `❌ الملف المرفوع ليس سجلاً تجارياً سعودياً صالحاً.\n\nنوع المستند المكتشف: ${detected}\nالسبب: ${reason}\n\nيرجى رفع صورة واضحة للسجل التجاري الرسمي الصادر من وزارة التجارة.`,
          is_valid_cr: false,
          document_type_detected: detected,
          rejection_reason: reason,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-cr-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
