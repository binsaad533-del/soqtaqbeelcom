import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت محلل أصول بصري خبير. مهمتك تحليل صور نشاط تجاري واستخراج قائمة منظمة بجميع الأصول والمعدات المرئية.

## التعليمات:
1. افحص كل صورة بعناية وحدد جميع المعدات والأجهزة والأثاث والأدوات المرئية
2. صنّف كل عنصر حسب النوع (آلة CNC، ضاغط هواء، طاولة عمل، كرسي مكتب، إلخ)
3. قدّر حالة كل عنصر: جديد / جيد / مستعمل / تالف
4. قدّر الكمية إذا تكرر العنصر في عدة صور
5. لا تكرر نفس العنصر إذا ظهر في أكثر من صورة
6. ركّز على المعدات ذات القيمة التجارية (الآلات، الأجهزة، الأثاث المكتبي، معدات الإنتاج)
7. تجاهل العناصر العامة مثل الجدران والأرضيات والإضاءة العادية

## مخرجات مطلوبة:
- قائمة منظمة بالأصول المكتشفة
- ملخص عام للأصول
- مستوى الثقة في الاكتشاف`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrls, businessActivity } = await req.json();

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "لا توجد صور للتحليل" }),
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

    // Limit to 30 images for cost/performance
    const selectedUrls = photoUrls.slice(0, 30);

    const userContent: any[] = [
      {
        type: "text",
        text: `حلل الصور التالية لنشاط تجاري${businessActivity ? ` (${businessActivity})` : ""} واستخرج جميع الأصول والمعدات المرئية. عدد الصور: ${selectedUrls.length}`,
      },
    ];

    for (const url of selectedUrls) {
      userContent.push({
        type: "image_url",
        image_url: { url },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detected_assets",
              description: "Report all detected assets from the images",
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
                        details: { type: "string", description: "تفاصيل إضافية مثل الماركة أو الموديل إن وجد" },
                      },
                      required: ["name", "type", "condition", "quantity"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "ملخص عام للأصول المكتشفة في جملتين" },
                  totalEstimatedItems: { type: "number", description: "إجمالي عدد العناصر المكتشفة" },
                  confidence: { type: "string", enum: ["عالي", "متوسط", "منخفض"], description: "مستوى الثقة في دقة الاكتشاف" },
                  imagesAnalyzed: { type: "number" },
                },
                required: ["assets", "summary", "totalEstimatedItems", "confidence", "imagesAnalyzed"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detected_assets" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام خدمات الذكاء الاصطناعي" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من تحليل الصور" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const output = {
      ...result,
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
