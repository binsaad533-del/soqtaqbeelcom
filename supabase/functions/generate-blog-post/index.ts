import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOPICS = [
  "نصائح عملية لتقييم محل تجاري قبل شرائه",
  "حقوق المشتري في عقود التقبيل التجاري",
  "حقوق البائع في عقود التقبيل التجاري",
  "كيف تحدد السعر العادل لنشاطك التجاري",
  "أخطاء شائعة عند تقبيل مشروع تجاري",
  "الفرق بين تقبيل النشاط وبيع السجل التجاري",
  "أهمية جرد الأصول والمخزون عند التقبيل",
  "كيف تحمي نفسك من الاحتيال في صفقات التقبيل",
  "الخطوات القانونية لنقل ملكية مشروع تجاري في السعودية",
  "متى يكون الوقت المناسب لبيع مشروعك؟",
  "كيف تختار الموقع المناسب لمشروعك الجديد",
  "أهمية السجل التجاري في عمليات التقبيل",
  "دليلك لفهم عقد الإيجار قبل التقبيل",
  "كيف تتفاوض على سعر التقبيل بذكاء",
  "ما هي المستندات المطلوبة لإتمام صفقة التقبيل",
  "مؤشرات نجاح المشروع التجاري قبل الشراء",
  "كيف تقرأ القوائم المالية للمشروع قبل التقبيل",
  "أفضل القطاعات التجارية للاستثمار في السعودية",
  "التقبيل الجزئي: متى يكون الخيار الأفضل؟",
  "كيف تستفيد من التقنية في إدارة مشروعك بعد التقبيل",
  "دليل المبتدئين لدخول سوق التقبيل التجاري",
  "كيف تتعامل مع الالتزامات المالية عند التقبيل",
  "أهمية التوثيق الرقمي في صفقات التقبيل",
  "نصائح لتجنب النزاعات بعد إتمام التقبيل",
  "كيف يساعد الذكاء الاصطناعي في تقييم الصفقات",
  "مقارنة بين أنواع هياكل صفقات التقبيل",
  "أهمية فحص الالتزامات القائمة قبل الشراء",
  "كيف تبني علاقة ثقة بين البائع والمشتري",
  "الأسئلة الـ10 التي يجب طرحها قبل أي صفقة تقبيل",
  "تجارب ناجحة في سوق التقبيل السعودي",
  "كيف تستعد لبيع مشروعك التجاري",
  "أهمية الشفافية في الإفصاح عن بيانات المشروع",
  "دور منصات التقبيل الرقمية في تسهيل الصفقات",
  "كيف تقيّم قيمة العلامة التجارية عند التقبيل",
  "نصائح للمشتري الجديد بعد إتمام التقبيل",
  "كيف تدير الانتقال بسلاسة بعد شراء مشروع",
  "أهم التراخيص المطلوبة لمزاولة النشاط التجاري",
  "كيف يؤثر الموقع على قيمة التقبيل",
  "فهم رسوم الخدمات والعمولات في منصات التقبيل",
  "مستقبل سوق التقبيل التجاري في المملكة",
];

const CATEGORIES = [
  { ar: "نصائح", en: "Tips" },
  { ar: "قانوني", en: "Legal" },
  { ar: "تقييم", en: "Valuation" },
  { ar: "تحليل السوق", en: "Market Analysis" },
  { ar: "تقنية", en: "Technology" },
  { ar: "إدارة", en: "Management" },
  { ar: "تفاوض", en: "Negotiation" },
  { ar: "أمان", en: "Security" },
];

function generateSlug(title: string): string {
  return title
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 80) + "-" + Date.now().toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Count existing posts to pick a topic
    const { count } = await supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true });

    const topicIndex = (count || 0) % TOPICS.length;
    const topic = TOPICS[topicIndex];
    const category = CATEGORIES[topicIndex % CATEGORIES.length];

    // Generate article with AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت كاتب محتوى متخصص في سوق التقبيل التجاري في المملكة العربية السعودية. اكتب مقالات احترافية وعملية تفيد البائعين والمشترين.
            
يجب أن يكون الرد بتنسيق JSON بالضبط كالتالي:
{
  "title_ar": "العنوان بالعربي",
  "title_en": "Title in English",
  "content_ar": "المحتوى الكامل بالعربي (استخدم ## للعناوين الفرعية و - للنقاط)",
  "content_en": "Full content in English",
  "excerpt_ar": "ملخص قصير بالعربي (جملتين)",
  "excerpt_en": "Short summary in English (2 sentences)",
  "meta_description_ar": "وصف ميتا للسيو بالعربي (أقل من 160 حرف)",
  "meta_description_en": "SEO meta description in English (under 160 chars)",
  "tags": ["وسم1", "وسم2", "وسم3", "وسم4"],
  "read_time_minutes": 5
}

المقال يجب أن يكون:
- عملي ومفيد وليس نظري
- يحتوي على نصائح قابلة للتطبيق
- يذكر منصة "سوق تقبيل" كمرجع موثوق (بشكل طبيعي وليس إعلاني)
- طوله بين 800-1200 كلمة
- يراعي SEO بكلمات مفتاحية مناسبة`
          },
          {
            role: "user",
            content: `اكتب مقالاً عن: ${topic}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, will retry later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    let article;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      article = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Invalid AI response format");
    }

    const slug = generateSlug(article.title_ar);

    // Insert as draft
    const { data, error } = await supabase.from("blog_posts").insert({
      title_ar: article.title_ar,
      title_en: article.title_en || null,
      content_ar: article.content_ar,
      content_en: article.content_en || null,
      excerpt_ar: article.excerpt_ar,
      excerpt_en: article.excerpt_en || null,
      slug,
      tags: article.tags || [],
      category_ar: category.ar,
      category_en: category.en,
      meta_description_ar: article.meta_description_ar,
      meta_description_en: article.meta_description_en || null,
      read_time_minutes: article.read_time_minutes || 5,
      status: "draft",
      generated_by_ai: true,
    }).select().single();

    if (error) throw error;

    console.log("Blog post generated:", data.id, article.title_ar);

    return new Response(JSON.stringify({ success: true, post: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
