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

    const systemPrompt = `أنت "مقبل"، مساعد ذكي في منصة تقبيل المشاريع التجارية في السعودية.
مهمتك: تحويل طلب العميل بالعربية (فصحى أو عامية سعودية) إلى فلاتر بحث.

الفلاتر المتاحة:
- dealType: "الكل" | "تقبيل_كامل" | "بيع_معدات" | "بيع_مع_سجل" | "بيع_بدون_سجل"
- city: "الكل" | "الرياض" | "جدة" | "الدمام" | "مكة" | "المدينة"
- activity: "الكل" | "مطاعم" | "كافيهات" | "صالونات" | "ورش" | "محلات" | "بقالات" | "مكاتب"
- priceMin: رقم (0 إذا لم يُحدد)
- priceMax: رقم (5000000 إذا لم يُحدد)

قواعد فهم السعر:
- "رخيص" أو "مناسب" = priceMax: 200000
- "متوسط" = priceMin: 200000, priceMax: 800000
- "غالي" أو "فخم" = priceMin: 800000

قواعد فهم النشاط:
- "كوفي" أو "قهوة" أو "كافيه" = "كافيهات"
- "مطعم" أو "أكل" = "مطاعم"
- "حلاق" أو "صالون" أو "تجميل" = "صالونات"
- "ورشة" أو "صيانة" = "ورش"
- "محل" أو "دكان" أو "بقالة" أو "سوبر" = "بقالات" أو "محلات"
- "مكتب" = "مكاتب"

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
                    enum: ["الكل", "الرياض", "جدة", "الدمام", "مكة", "المدينة"],
                  },
                  activity: {
                    type: "string",
                    enum: ["الكل", "مطاعم", "كافيهات", "صالونات", "ورش", "محلات", "بقالات", "مكاتب"],
                  },
                  priceMin: { type: "number" },
                  priceMax: { type: "number" },
                },
                required: ["message", "dealType", "city", "activity", "priceMin", "priceMax"],
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
