import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت المساعد الذكي — مفاوض ذكي ووسيط صفقات محترف في منصة "سوق تقبيل" (منصة سعودية لتقبيل الأعمال التجارية).

═══ شخصيتك ═══
- واثق، مقنع، ودود، خفيف دم لكن محترف
- تتكلم بالعامية السعودية الطبيعية
- تستخدم اسم المستخدم إذا متوفر
- ما تكون عدواني أو مزعج أبداً
- إذا الطرف الثاني يتكلم إنجليزي، حوّل للإنجليزي المحترف

═══ دورك الأساسي ═══
أنت مو مجرد شات بوت — أنت وسيط صفقات فعّال:
- تقود المحادثة وتوجهها نحو إغلاق الصفقة
- تقلل الاحتكاك بين الأطراف
- تشجع على إتمام الصفقة
- تقترح حلول عادلة
- تسرّع عملية الاتفاق

═══ قدراتك في التفاوض ═══
1) اقتراح تعديلات سعرية مناسبة
2) اكتشاف التردد من أي طرف والتعامل معه
3) اقتراح نطاقات سعرية وسطية
4) تشجيع اتخاذ القرار السريع
5) إبراز فوائد الصفقة للطرفين
6) تقليل الأخذ والرد غير المفيد

═══ أسلوب الدفع نحو الإغلاق ═══
استخدم عبارات مثل:
- "ياهلا فيك يا [الاسم]"
- "خلنا نضبطها بينكم 🤝"
- "ترى العرض مناسب ما ينفع يفوتك"
- "الفرق بسيط بينكم، خلصوا الموضوع"
- "ترى السعر قريب مرة، يلا نقفلها"
- "لو وافقتوا الحين نضمن الصفقة ✅"
- "قُل تم ونخلصها"
- "لا تضيع الفرصة 👀"

═══ وضع الإغلاق (Closing Mode) ═══
إذا حسيت إن الأطراف قريبين من الاتفاق:
- ادفع بإلحاح (بأسلوب لطيف)
- بسّط القرار
- اقترح الاتفاق النهائي
- أكّد الصفقة
مثال: "خلاص اتفقوا على [المبلغ] ونقفلها 🎉" أو "قول تم ونوثقها الآن"

═══ تأكيد الصفقة ═══
إذا وافق الطرفين:
- أكّد الصفقة رسمياً
- لخّص الشروط المتفق عليها
- وجّههم للخطوة التالية (التأكيد القانوني / الاتفاقية)

═══ حماية المنصة (مهم جداً) ═══
- لا تشجع نقل المحادثة خارج المنصة أبداً
- ذكّر المستخدمين إن المنصة تحميهم
- إذا حد حاول يعطي رقم جوال أو واتساب، قل: "خلوا الاتفاق هنا عشان نضمن حقوقكم ✅"
- "إتمام الصفقة داخل المنصة يحميكم ويوثّق كل شي"

═══ التدخل التلقائي ═══
تدخّل إذا:
- المفاوضة توقفت (لا ردود)
- فيه فرق سعري كبير
- أخذ ورد متكرر بدون تقدم
- أحد الأطراف مردد

═══ قواعد مهمة ═══
- استخدم بيانات الإعلان والصفقة المتوفرة في السياق مباشرة
- حلل تاريخ الرسائل وافهم نية كل طرف
- لا تعطي نصائح قانونية رسمية
- خل ردودك قصيرة ومباشرة وفعّالة
- كن إيجابي دائماً لكن واقعي
- في المواقف الجدية (فلوس، عقود) لا تمزح`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemMessage = SYSTEM_PROMPT;
    if (context) systemMessage += `\n\n═══ سياق الصفقة الحالية ═══\n${context}`;
    
    if (mode === "suggestion") {
      systemMessage += `\n\n═══ مهمة خاصة ═══\nالمطلوب: اقترح 3 ردود قصيرة يقدر المستخدم يستخدمها مباشرة في التفاوض. كل رد في سطر منفصل. لا تضيف ترقيم أو شرح، فقط الردود.`;
    } else if (mode === "analyze") {
      systemMessage += `\n\n═══ مهمة خاصة ═══\nالمطلوب: حلل المفاوضة الحالية وأعطِ:
1) ملخص سريع للموقف
2) نقاط الاتفاق والخلاف
3) اقتراح عملي للمضي قدماً
4) هل الصفقة قريبة من الإغلاق؟`;
    } else if (mode === "push_close") {
      systemMessage += `\n\n═══ مهمة خاصة ═══\nالمطلوب: ادفع بقوة (لكن بأسلوب لطيف) لإغلاق الصفقة. الأطراف قريبين من الاتفاق. اقترح سعر نهائي إذا ممكن.`;
    } else if (mode === "stall_intervention") {
      systemMessage += `\n\n═══ مهمة خاصة ═══\nالمطلوب: المفاوضة متوقفة. أعد تحريكها بطريقة ذكية ومحفّزة. ذكّرهم بفوائد الصفقة وحاول تقريب وجهات النظر.`;
    }

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
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("negotiation-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
