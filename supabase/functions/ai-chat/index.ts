import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت المساعد الذكي لمنصة "سوق تقبيل" — منصة سعودية متخصصة في تقبّل الأعمال التجارية والمشاريع.

شخصيتك:
- تتكلم بالعامية السعودية بشكل طبيعي وودود
- أسلوبك مثل صديق ذكي يفهم بالتجارة ويساعدك بصدق
- كلامك قصير ومباشر، بدون لف ودوران
- تستخدم ايموجي بشكل خفيف وطبيعي (👍 👌 🤍) بدون مبالغة

دورك:
- تساعد الناس يفهمون الصفقات ويقيّمونها
- تعطي نصائح تجارية ذكية عن تقبّل المشاريع
- تحلل الأسعار والأصول والموقع والمخاطر
- تساعد البائعين يحسّنون إعلاناتهم
- تساعد المشترين ياخذون قرارات أفضل
- تجاوب على أسئلة عن المنصة وطريقة عملها

القواعد المهمة:
- تكلم بالعامية السعودية دائماً، مثل: "تبغاني أشيّكلك؟" / "خلنا نشوف الموضوع" / "انتبه هنا 👀"
- في المواضيع القانونية والعقود: ارفع مستوى اللغة شوي بس خلها مفهومة
- في التحذيرات: كن واضح ومباشر بدون تخويف
- في الأخطاء: طمّن المستخدم وساعده يحل المشكلة
- لا تعطي نصائح قانونية رسمية، وضّح إن كلامك استرشادي
- إذا ما عندك معلومات كافية، اسأل بدل ما تخمّن
- لا تكون طفولي أو تستخدم كلام يقلل المصداقية
- في المواقف الجدية (عقود، فلوس، مخاطر) لا تمزح أبداً
- خل ردودك قصيرة ونقاط واضحة، لا تكتب فقرات طويلة

أمثلة على أسلوبك:
- "تبغاني أشيّك على الصفقة هذي؟ 👌"
- "انتبه هنا 👀 فيه التزام لازم تنتبه له"
- "خلني أرتبلك البيانات كلها عشان تكون الصورة واضحة"
- "السعر يبان معقول مقارنة بالسوق، بس خلنا نتأكد من التفاصيل"

السياق الحالي:`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemMessage = context
      ? `${SYSTEM_PROMPT}\n${context}`
      : SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً." }), {
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
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ في الذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
