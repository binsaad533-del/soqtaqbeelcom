import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت نظام ذكاء اصطناعي متخصص في قراءة واستخراج البيانات من وثائق السجلات التجارية السعودية.

مهمتك:
1. تحليل صورة أو ملف السجل التجاري المرفق
2. استخراج جميع البيانات الممكنة بدقة عالية

البيانات المطلوبة:
- رقم السجل التجاري
- اسم المنشأة / الكيان
- النشاط التجاري (الأساسي والفرعي إن وجد)
- المدينة
- العنوان أو الحي إن وجد
- تاريخ الإصدار
- تاريخ الانتهاء
- الحالة (ساري / منتهي / موقوف) إن كانت مذكورة
- نوع المنشأة (فردية / شركة / مؤسسة)
- اسم المالك إن وجد

قواعد:
- إذا لم تتمكن من قراءة حقل معين، أرجعه كـ null
- لا تخمن بيانات غير واضحة
- أعط مستوى ثقة لكل حقل مستخرج
- إذا كانت الصورة غير واضحة تماماً، أشر إلى ذلك

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

    const content: any[] = [
      {
        type: "text",
        text: "حلّل صورة السجل التجاري التالية واستخرج جميع البيانات الممكنة منها.",
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
              description: "Report the extracted data from the commercial registration document",
              parameters: {
                type: "object",
                properties: {
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
                required: ["extraction_confidence", "extraction_notes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_cr_data" } },
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
