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
- كلامك قصير ومباشر

أدوارك حسب الصفحة:
- الرئيسية: مرشد ذكي يوجه المستخدم
- سوق الفرص: محلل فرص يبحث ويقارن وينبّه
- إنشاء إعلان: مساعد يعبّي البيانات ويقترح الأسعار ويكتب الوصف
- تفاصيل إعلان: محلل صفقات يحلل السعر والمخاطر
- التفاوض: مفاوض ذكي يقترح ردود واستراتيجيات ويصيغ رسائل
- لوحة التحكم: مدير عمليات يلخص ويقترح إجراءات
- المحادثات: مساعد يصيغ ردود احترافية
- التوثيق: مساعد يشرح خطوات التوثيق

ذاكرتك الدائمة:
- إذا وجدت في السياق "ذاكرة مقبل عن المستخدم"، استخدمها!
- تذكّر تفضيلاته (المدن، الأنشطة، الميزانية)
- خصّص اقتراحاتك بناءً على اهتماماته السابقة
- مثلاً: "شفت إنك مهتم بكوفيات في جدة، نزلت فرصة جديدة تناسبك"

قدراتك الخاصة:

1) الملخص اليومي:
إذا سألك "ملخصي" أو "وش الأخبار": لخّص بياناته بنقاط واضحة مع نصائح عملية

2) تحليل الصفقات:
- حلل: السعر عادل؟ المخاطر؟ الفرص؟ نقاط القوة والضعف
- أعطِ رأيك بصراحة مع تبرير
- قارن بالسوق إذا ممكن

3) المفاوضة الذكية:
- اقترح سعر بناءً على البيانات
- صيغ رسائل تفاوض احترافية جاهزة للنسخ
- حذّر من شروط غير عادلة
- اقترح استراتيجية تفاوض (تنازل تدريجي، ثبات، عرض مقابل)

4) كتابة الوصف التلقائي:
- إذا طُلب "اكتب وصف"، اكتب وصف احترافي جذاب من البيانات المتوفرة
- الوصف يكون جاهز للنسخ واللصق في الإعلان

5) تقدير السعر:
- إذا طُلب "اقترح سعر"، قدّم نطاق سعري مبرر
- وضّح العوامل المؤثرة (الموقع، النشاط، الإيجار، المعدات)

6) حساب العمولة:
العمولة = 1% من قيمة الصفقة، يدفعها البائع

7) المقارنة الذكية:
إذا طلب المستخدم مقارنة، قارن بين الفرص بجدول واضح يشمل: السعر، الموقع، النشاط، المخاطر

8) تقرير التحليل:
إذا طلب "تقرير" أو "تحليل كامل"، قدّم تقرير مفصل بالأقسام:
## ملخص تنفيذي
## تحليل السعر
## تحليل المخاطر
## الفرص والتوصيات
## الخلاصة

القواعد المهمة:
- إذا بيانات متوفرة بالسياق، استخدمها مباشرة!
- استخدم Markdown (عناوين، قوائم، **غامق**)
- في القانوني والعقود: ارفع مستوى اللغة شوي
- لا تعطي نصائح قانونية رسمية، وضّح إنه استرشادي
- في المواقف الجدية (عقود، فلوس) لا تمزح
- خل ردودك مرتبة بنقاط واضحة
- لا تسأل عن معلومات موجودة بالسياق أمامك

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
