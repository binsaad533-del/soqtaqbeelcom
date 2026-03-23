import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت محلل صفقات تجارية خبير متخصص في السوق السعودي. مهمتك تقديم تقييم جدوى أولية قصيرة وقوية لكل صفقة تقبيل أو بيع أصول أو فرصة تجارية.

يجب أن تحلل الصفقة بناءً على جميع البيانات المتاحة وتنتج تقريراً مهنياً بالعربية.

## قواعد صارمة:
- استخدم الأرقام الإنجليزية فقط (0-9) وليس العربية
- كن عملياً وتجارياً ومباشراً — لا تستخدم لغة الشات بوت العامة
- ميّز بوضوح بين: الأدلة، الاستنتاجات، والبيانات الناقصة
- لا تدّعي يقيناً زائفاً — إذا كانت البيانات غير كافية قل ذلك بوضوح
- هذا ليس تقييم رسمي مرخص — هو تحليل ذكي استرشادي

## مقارنة السوق (مهم جداً):
عند تقييم الأصول والمعدات، يجب أن تستخدم منصات السلع المستعملة السعودية كمراجع مقارنة:
- حراج (haraj.com.sa)
- مستعمل (mstaml.com)
- OpenSooq (opensooq.com)
- Facebook Marketplace
- أي مصدر سعودي آخر متاح

### قواعد المقارنة:
1. ابحث عن أصناف مشابهة بالنوع والفئة والحالة والمواصفات
2. قارن بذكاء — ميّز بين: تطابق دقيق، تطابق قريب، تطابق ضعيف
3. لا تنسخ أسعار المنصات بشكل أعمى — هي مؤشرات سوقية فقط وليست قيمة سوقية نهائية
4. ميّز بوضوح بين: سعر الطلب، المؤشر السوقي المقدّر، القيمة المؤكدة
5. خذ حالة الأصل بالاعتبار (جديد، مستعمل نظيف، مستعمل عادي، متهالك)
6. فضّل المقارنات السعودية أولاً
7. إذا كانت المقارنات ضعيفة أو محدودة، وضّح ذلك صراحة

### لكل أصل أو مجموعة أصول مهمة، قدّم:
- النطاق السوقي التقريبي المرصود
- جودة ثقة المقارنة (قوية / متوسطة / ضعيفة)
- هل توقعات البائع معقولة أم مبالغ فيها
- هل المنظومة المرئية تدعم القيمة المطلوبة

## تنسيق المخرج المطلوب:
أنتج JSON بالهيكل التالي (جميع الحقول مطلوبة):

{
  "dealOverview": "نظرة عامة موجزة عن الصفقة",
  "businessActivity": "تحليل النشاط التجاري وتصنيفه",
  "assetAssessment": "تقييم الأصول والمعدات",
  "locationAssessment": "تقييم الموقع من منظور تجاري",
  "competitionSnapshot": "لمحة عن المنافسة والسوق",
  "operationalReadiness": "الجاهزية التشغيلية",
  "marketComparison": {
    "comparablesReviewed": 0,
    "matchQuality": "قوية | متوسطة | ضعيفة | غير متاحة",
    "observedPriceRange": "النطاق السعري المرصود أو غير متاح",
    "marketPosition": "أقل من السوق | قريب من السوق | أعلى من السوق | غير محدد",
    "confidence": "عالي | متوسط | منخفض",
    "details": "تفاصيل المقارنة مع المنصات المستخدمة والأصناف المقارنة",
    "assetBreakdown": [
      {
        "assetName": "اسم الأصل",
        "marketRange": "النطاق السعري المرصود",
        "sellerPrice": "سعر البائع المقدّر",
        "verdict": "معقول | مبالغ فيه | أقل من السوق | غير واضح",
        "source": "المنصة المرجعية"
      }
    ]
  },
  "risks": ["مخاطرة 1", "مخاطرة 2"],
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "missingInfo": ["معلومة ناقصة 1", "معلومة ناقصة 2"],
  "rating": "واحد من: فرصة ممتازة | فرصة جيدة | مقبولة مع حذر | مخاطر عالية | غير مكتملة",
  "ratingColor": "واحد من: green | blue | yellow | red | gray",
  "recommendation": "توصية قصيرة وواضحة",
  "negotiationGuidance": ["نقطة تفاوض 1", "نقطة تفاوض 2"],
  "fairnessVerdict": "تقييم عدالة السعر: جذاب | معقول | مبالغ فيه | غير واضح",
  "confidenceLevel": "مستوى ثقة التحليل: عالي | متوسط | منخفض"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing } = await req.json();

    if (!listing) {
      return new Response(
        JSON.stringify({ error: "Listing data is required" }),
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

    const userPrompt = buildAnalysisPrompt(listing);

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "deal_check_result",
              description: "Return a structured deal check analysis with marketplace comparison",
              parameters: {
                type: "object",
                properties: {
                  dealOverview: { type: "string" },
                  businessActivity: { type: "string" },
                  assetAssessment: { type: "string" },
                  locationAssessment: { type: "string" },
                  competitionSnapshot: { type: "string" },
                  operationalReadiness: { type: "string" },
                  marketComparison: {
                    type: "object",
                    properties: {
                      comparablesReviewed: { type: "number" },
                      matchQuality: { type: "string", enum: ["قوية", "متوسطة", "ضعيفة", "غير متاحة"] },
                      observedPriceRange: { type: "string" },
                      marketPosition: { type: "string", enum: ["أقل من السوق", "قريب من السوق", "أعلى من السوق", "غير محدد"] },
                      confidence: { type: "string", enum: ["عالي", "متوسط", "منخفض"] },
                      details: { type: "string" },
                      assetBreakdown: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            assetName: { type: "string" },
                            marketRange: { type: "string" },
                            sellerPrice: { type: "string" },
                            verdict: { type: "string", enum: ["معقول", "مبالغ فيه", "أقل من السوق", "غير واضح"] },
                            source: { type: "string" },
                          },
                          required: ["assetName", "marketRange", "verdict", "source"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["comparablesReviewed", "matchQuality", "observedPriceRange", "marketPosition", "confidence", "details", "assetBreakdown"],
                    additionalProperties: false,
                  },
                  risks: { type: "array", items: { type: "string" } },
                  strengths: { type: "array", items: { type: "string" } },
                  missingInfo: { type: "array", items: { type: "string" } },
                  rating: { type: "string", enum: ["فرصة ممتازة", "فرصة جيدة", "مقبولة مع حذر", "مخاطر عالية", "غير مكتملة"] },
                  ratingColor: { type: "string", enum: ["green", "blue", "yellow", "red", "gray"] },
                  recommendation: { type: "string" },
                  negotiationGuidance: { type: "array", items: { type: "string" } },
                  fairnessVerdict: { type: "string", enum: ["جذاب", "معقول", "مبالغ فيه", "غير واضح"] },
                  confidenceLevel: { type: "string", enum: ["عالي", "متوسط", "منخفض"] },
                },
                required: [
                  "dealOverview", "businessActivity", "assetAssessment", "locationAssessment",
                  "competitionSnapshot", "operationalReadiness", "marketComparison", "risks", "strengths",
                  "missingInfo", "rating", "ratingColor", "recommendation",
                  "negotiationGuidance", "fairnessVerdict", "confidenceLevel",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "deal_check_result" } },
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
        JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من إنتاج التحليل" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deal-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAnalysisPrompt(listing: any): string {
  const sections: string[] = [];

  sections.push("# بيانات الصفقة المطلوب تحليلها\n");

  if (listing.title) sections.push(`## العنوان: ${listing.title}`);
  if (listing.category) sections.push(`## النشاط: ${listing.category}`);
  if (listing.dealType) sections.push(`## نوع الصفقة: ${listing.dealType}`);
  if (listing.city) sections.push(`## المدينة: ${listing.city}`);
  if (listing.district) sections.push(`## الحي: ${listing.district}`);
  if (listing.price) sections.push(`## السعر المطلوب: ${listing.price} ريال سعودي`);

  // Lease info
  if (listing.rent || listing.leaseDuration || listing.remainingLease) {
    sections.push("\n## بيانات الإيجار:");
    if (listing.rent) sections.push(`- الإيجار السنوي: ${listing.rent} ريال`);
    if (listing.leaseDuration) sections.push(`- مدة العقد: ${listing.leaseDuration}`);
    if (listing.remainingLease) sections.push(`- المتبقي من العقد: ${listing.remainingLease}`);
  }

  // Licenses
  if (listing.licenseStatus || listing.civilDefense || listing.cameras) {
    sections.push("\n## التراخيص والامتثال:");
    if (listing.licenseStatus) sections.push(`- رخصة البلدية: ${listing.licenseStatus}`);
    if (listing.civilDefense) sections.push(`- الدفاع المدني: ${listing.civilDefense}`);
    if (listing.cameras) sections.push(`- كاميرات المراقبة: ${listing.cameras}`);
  }

  // Liabilities
  if (listing.liabilities) sections.push(`\n## الالتزامات: ${listing.liabilities}`);

  // Included / Excluded
  if (listing.included?.length) {
    sections.push("\n## يشمل التقبّل:");
    listing.included.forEach((item: string) => sections.push(`- ${item}`));
  }
  if (listing.excluded?.length) {
    sections.push("\n## لا يشمل التقبّل:");
    listing.excluded.forEach((item: string) => sections.push(`- ${item}`));
  }

  // Inventory
  if (listing.inventory?.length) {
    sections.push("\n## جرد الأصول (قارن كل صنف مع منصات السوق المستعمل السعودي):");
    listing.inventory.forEach((item: any) => {
      const details = [
        item.name,
        item.qty ? `${item.qty} وحدة` : null,
        item.condition ? `حالة: ${item.condition}` : null,
        item.category ? `فئة: ${item.category}` : null,
        item.brand ? `ماركة: ${item.brand}` : null,
        item.model ? `موديل: ${item.model}` : null,
      ].filter(Boolean).join(" — ");
      sections.push(`- ${details}`);
    });
  }

  // Documents
  if (listing.documents?.length) {
    sections.push("\n## المستندات:");
    listing.documents.forEach((doc: any) => {
      sections.push(`- ${doc.name}: ${doc.status}`);
    });
  }

  // Disclosure
  if (listing.disclosureScore) sections.push(`\n## نسبة الإفصاح: ${listing.disclosureScore}%`);

  // Summary
  if (listing.summary) sections.push(`\n## ملخص البائع:\n${listing.summary}`);

  sections.push("\n---");
  sections.push("## تعليمات إضافية:");
  sections.push("1. استخدم منصات حراج ومستعمل وأوبن سوق وفيسبوك ماركت بلس كمراجع مقارنة للأصول");
  sections.push("2. قدّم تفصيل مقارنة لكل أصل رئيسي مع مصدر المقارنة");
  sections.push("3. وضّح جودة المقارنة ومستوى الثقة");
  sections.push("4. لا تنسخ أسعار المنصات كقيمة نهائية — هي مؤشرات فقط");
  sections.push("\nحلل هذه الصفقة وأنتج تقرير الجدوى الأولية باستخدام الأداة deal_check_result.");

  return sections.join("\n");
}
