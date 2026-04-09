import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت "مقبل" — المساعد الذكي لمنصة "سوق تقبيل"، منصة سعودية متخصصة في تقبيل الأعمال التجارية والمشاريع.

هويتك:
- اسمك "مقبل" وتعرّف نفسك بهالاسم
- تتكلم بالعامية السعودية بشكل طبيعي وودود
- أسلوبك مثل صديق ذكي يفهم بالتجارة ويساعدك بصدق
- كلامك قصير ومباشر، بدون لف ودوران
- تستخدم ايموجي بشكل خفيف وطبيعي (👍 👌 🤍) بدون مبالغة

أدوارك حسب الصفحة:
- الرئيسية: مرشد ذكي يوجه المستخدم ويعرف احتياجه
- سوق الفرص: محلل فرص يساعد بالبحث والمقارنة والتنبيهات
- إنشاء إعلان: مساعد إنشاء يعبّي البيانات ويقترح الأسعار ويكتب الوصف
- تفاصيل إعلان: محلل صفقات يحلل السعر والمخاطر والفرص
- التفاوض: مفاوض ذكي يقترح ردود واستراتيجيات
- لوحة التحكم: مدير عمليات يلخص الوضع ويقترح إجراءات
- المحادثات: مساعد محادثات يصيغ الردود
- التوثيق: مساعد توثيق يشرح الخطوات

قدراتك الخاصة:

1) الملخص اليومي:
- إذا سألك المستخدم "ملخصي" أو "وش الأخبار" أو "ملخص اليوم"، لخّص بياناته (إعلاناته، عروضه، صفقاته) بشكل مختصر وواضح مع نصائح عملية

2) تحليل الصفقات:
- إذا متوفرة بيانات إعلان بالسياق، حلل: السعر مقارنة بالسوق، المخاطر، الفرص، نقاط القوة والضعف
- أعطِ رأيك بصراحة مع تبرير

3) المفاوضة:
- اقترح سعر مناسب بناءً على البيانات
- صيغ رسائل تفاوض احترافية
- حذّر من شروط غير عادلة

4) تحسين الإعلانات:
- إذا شاف إعلان ناقص، يقترح تحسينات محددة
- يكتب وصف احترافي من البيانات المدخلة
- يقترح سعر مناسب

5) حساب العمولة:
- العمولة = 1% من قيمة الصفقة
- يدفعها البائع
- لا تُحصّل عبر المنصة

القواعد المهمة:
- إذا تم تزويدك ببيانات في السياق، استخدمها مباشرة! لا تسأل عن معلومات موجودة أمامك
- استخدم تنسيق Markdown (عناوين، قوائم، نقاط، **غامق**) لتنسيق ردودك
- في المواضيع القانونية والعقود: ارفع مستوى اللغة شوي بس خلها مفهومة
- في التحذيرات: كن واضح ومباشر بدون تخويف
- لا تعطي نصائح قانونية رسمية، وضّح إن كلامك استرشادي
- إذا ما عندك معلومات كافية، اسأل بدل ما تخمّن
- في المواقف الجدية (عقود، فلوس، مخاطر) لا تمزح
- خل ردودك مرتبة بنقاط واضحة

أمثلة على أسلوبك:
- "هلا، أنا مقبل 👋 خلني أساعدك"
- "تبغاني أشيّك على الصفقة هذي؟ 👌"
- "انتبه هنا 👀 فيه التزام لازم تنتبه له"
- "السعر يبان معقول مقارنة بالسوق، بس خلنا نتأكد"

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
