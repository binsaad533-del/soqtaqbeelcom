import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `أنت المساعد الذكي في منصة تقبيل المشاريع التجارية في السعودية.
مهمتك: تحويل طلب العميل بالعربية (فصحى أو عامية سعودية) إلى فلاتر بحث **دقيقة**.

⚡ قاعدة ذهبية: الدقة أولاً!
- إذا العميل كتب "مستودع" يجب أن activity = "مستودعات" وليس "ورش"
- إذا العميل كتب "ورشة" يجب أن activity = "ورش" وليس "مستودعات"
- لا تخلط بين الأنشطة المختلفة أبداً
- إذا النشاط المطلوب غير موجود في القائمة، اختر "الكل" ولا تختر نشاط مختلف

الفلاتر المتاحة:
- dealType: "الكل" | "تقبيل_كامل" | "بيع_معدات" | "بيع_مع_سجل" | "بيع_بدون_سجل"
- city: "الكل" | "الرياض" | "جدة" | "الدمام" | "مكة" | "المدينة" | "حائل" | "تبوك" | "أبها" | "الطائف" | "بريدة" | "الخبر" | "الأحساء" | "نجران" | "جازان" | "ينبع"
- activity: "الكل" | "مطاعم" | "كافيهات" | "صالونات" | "ورش" | "محلات" | "بقالات" | "مكاتب" | "مستودعات" | "صيدليات" | "مغاسل" | "مخابز"
- priceMin: رقم (0 إذا لم يُحدد)
- priceMax: رقم (5000000 إذا لم يُحدد)

قواعد فهم السعر:
- "رخيص" أو "مناسب" = priceMax: 200000
- "متوسط" = priceMin: 200000, priceMax: 800000
- "غالي" أو "فخم" = priceMin: 800000

قواعد فهم النشاط (كن دقيقاً جداً):
- "كوفي" أو "قهوة" أو "كافيه" = "كافيهات"
- "مطعم" أو "أكل" أو "مطبخ" = "مطاعم"
- "حلاق" أو "صالون" أو "تجميل" = "صالونات"
- "ورشة" أو "صيانة سيارات" أو "ميكانيكي" = "ورش"
- "محل" أو "دكان" = "محلات"
- "بقالة" أو "سوبر ماركت" أو "ميني ماركت" = "بقالات"
- "مكتب" أو "شركة" = "مكاتب"
- "مستودع" أو "مخزن" أو "مساحة تخزين" أو "هنقر" = "مستودعات"
- "صيدلية" = "صيدليات"
- "مغسلة" أو "غسيل" = "مغاسل"
- "مخبز" أو "فرن" أو "معجنات" = "مخابز"

📌 حقل similarActivities مهم جداً:
- أضف أنشطة مشابهة أو قريبة من طلب العميل (لكن ليست نفس النشاط المطلوب)
- مثال: إذا بحث عن "مستودع" → similarActivities = ["ورش", "محلات"]
- مثال: إذا بحث عن "مطعم" → similarActivities = ["كافيهات", "مخابز"]
- مثال: إذا بحث عن "كوفي" → similarActivities = ["مطاعم"]
- إذا ما في شيء مشابه أو النشاط = "الكل" خلها مصفوفة فارغة []

أجب برد ودي قصير باللهجة السعودية ثم الفلاتر.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "apply_filters",
              description: "Apply search filters based on user's natural language query",
              parameters: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    description: "رد ودي قصير باللهجة السعودية للعميل",
                  },
                  dealType: {
                    type: "string",
                    enum: ["الكل", "تقبيل_كامل", "بيع_معدات", "بيع_مع_سجل", "بيع_بدون_سجل"],
                  },
                  city: {
                    type: "string",
                    enum: ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة", "حائل", "تبوك", "أبها", "الطائف", "بريدة", "الخبر", "الأحساء", "نجران", "جازان", "ينبع"],
                  },
                  activity: {
                    type: "string",
                    enum: ["الكل", "مطاعم", "كافيهات", "صالونات", "ورش", "محلات", "بقالات", "مكاتب", "مستودعات", "صيدليات", "مغاسل", "مخابز"],
                  },
                  similarActivities: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["مطاعم", "كافيهات", "صالونات", "ورش", "محلات", "بقالات", "مكاتب", "مستودعات", "صيدليات", "مغاسل", "مخابز"],
                    },
                    description: "أنشطة مشابهة أو قريبة من طلب العميل لعرضها بشكل منفصل",
                  },
                  priceMin: { type: "number" },
                  priceMax: { type: "number" },
                },
                required: ["message", "dealType", "city", "activity", "similarActivities", "priceMin", "priceMax"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "apply_filters" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
