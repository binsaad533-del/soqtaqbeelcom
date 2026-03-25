import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEAL_TYPE_SCOPES: Record<string, { label: string; analyzeFields: string[]; skipFields: string[]; focusAreas: string[] }> = {
  full_takeover: {
    label: "تقبيل كامل",
    analyzeFields: ["assets", "lease", "cr", "tradeName", "liabilities", "licenses", "operations", "staff"],
    skipFields: [],
    focusAreas: ["الأصول والمعدات", "عقد الإيجار", "السجل التجاري", "الالتزامات المالية", "التراخيص", "العمالة", "استمرارية العمل"],
  },
  transfer_no_liabilities: {
    label: "نقل أعمال بدون التزامات",
    analyzeFields: ["assets", "lease", "cr", "tradeName", "licenses", "operations"],
    skipFields: ["liabilities"],
    focusAreas: ["الأصول والمعدات", "عقد الإيجار", "السجل التجاري", "التراخيص", "التحقق من تصفية الالتزامات"],
  },
  assets_setup: {
    label: "أصول + تجهيز تشغيلي",
    analyzeFields: ["assets", "location"],
    skipFields: ["cr", "tradeName", "liabilities"],
    focusAreas: ["الأصول والمعدات", "التجهيزات والديكور", "المخزون", "ترتيب الموقع"],
  },
  assets_only: {
    label: "أصول فقط",
    analyzeFields: ["assets"],
    skipFields: ["cr", "tradeName", "lease", "liabilities", "licenses", "operations"],
    focusAreas: ["المعدات والأجهزة", "حالة الأصول", "الكمية", "واقعية السعر", "النقل والتسليم"],
  },
};

function buildDealTypeContext(listing: any): string {
  const primaryType = listing.primary_deal_type || listing.deal_type || "full_takeover";
  const dealOptions = listing.deal_options || [];
  const scope = DEAL_TYPE_SCOPES[primaryType] || DEAL_TYPE_SCOPES["full_takeover"];

  let context = `\n## نوع الصفقة الرئيسي: ${scope.label} (${primaryType})`;
  context += `\n### نطاق التحليل المطلوب:`;
  context += `\n- ركّز على: ${scope.focusAreas.join("، ")}`;

  if (scope.skipFields.length > 0) {
    context += `\n- ⚠️ لا تحلل ولا تسأل عن: ${scope.skipFields.map(f => {
      const map: Record<string, string> = { cr: "السجل التجاري", tradeName: "الاسم التجاري / العلامة التجارية", lease: "عقد الإيجار / نقل الموقع", liabilities: "الالتزامات السابقة", licenses: "التراخيص", operations: "العمليات التشغيلية", staff: "العمالة", assets: "الأصول" };
      return map[f] || f;
    }).join("، ")}`;
    context += `\n- إذا كانت هذه الحقول غير موجودة في البيانات، لا تطلبها كمعلومات ناقصة ولا تعتبرها مخاطرة`;
  }

  if (dealOptions.length > 1) {
    context += `\n\n### خيارات الصفقة البديلة:`;
    for (const opt of dealOptions) {
      if (opt.is_primary) continue;
      const altScope = DEAL_TYPE_SCOPES[opt.type_id];
      if (altScope) {
        context += `\n- ${altScope.label}: ركّز على ${altScope.focusAreas.slice(0, 3).join("، ")}`;
      }
    }
    context += `\n\n### مطلوب: حلل كل مكوّن من الصفقة بشكل منفصل ثم قدّم توصية مجمّعة`;
  }

  return context;
}

const SELLER_PERSPECTIVE = `
## منظور التحليل: البائع (قبل النشر)
- خاطب البائع مباشرةً بضمير المخاطب ("إعلانك"، "سعرك"، "صفقتك")
- قدّم توصيات عملية لتحسين الإعلان قبل النشر
- وصِّ بسعر أقل بـ 10% من متوسط السوق لجذب المشترين بسرعة
- في التوصية والإرشادات: اقترح تحسينات على البيانات والصور والسعر
- نبّه البائع إلى النقاط التي قد تُثير تساؤلات المشترين
- في negotiationGuidance: قدّم نصائح للبائع حول كيف يتفاوض ويدافع عن سعره
- مثال على التوصية: "ننصحك بتسعير صفقتك بـ X ريال (أقل بـ 10% من متوسط السوق) لتسريع البيع"`;

const BUYER_PERSPECTIVE = `
## منظور التحليل: المشتري (بعد النشر)
- خاطب المشتري مباشرةً بضمير المخاطب ("هذه الصفقة أمامك"، "يمكنك"، "انتبه")
- ساعد المشتري على اتخاذ قرار الشراء
- قيّم ما إذا كان السعر المعروض عادلاً بالنسبة للمشتري
- في التوصية: وضّح للمشتري هل يستحق الدخول في هذه الصفقة أم لا
- نبّه المشتري إلى المخاطر والنقاط التي يجب فحصها ميدانياً
- في negotiationGuidance: قدّم نصائح للمشتري حول كيف يتفاوض ويحصل على سعر أفضل
- مثال: "يمكنك التفاوض لخفض السعر إلى X ريال بناءً على حالة الأصول"`;

function buildSystemPrompt(perspective: "seller" | "buyer"): string {
  const perspectiveBlock = perspective === "seller" ? SELLER_PERSPECTIVE : BUYER_PERSPECTIVE;
  
  return `أنت محلل صفقات تجارية خبير متخصص في السوق السعودي. مهمتك تقديم تقييم جدوى أولية قصيرة وقوية لكل صفقة.

${perspectiveBlock}

## قاعدة أساسية — احترام نوع الصفقة:
- يجب أن يكون تحليلك محصوراً بنطاق نوع الصفقة المحدد
- إذا كانت الصفقة "أصول فقط": لا تسأل عن السجل التجاري أو الاسم التجاري أو عقد الإيجار أو الالتزامات السابقة
- الحقول غير المشمولة في نطاق الصفقة ليست "معلومات ناقصة" ولا "مخاطر"

## قواعد صارمة:
- استخدم الأرقام الإنجليزية فقط (0-9)
- كن عملياً وتجارياً ومباشراً
- ميّز بوضوح بين: الأدلة، الاستنتاجات، والبيانات الناقصة
- لا تدّعي يقيناً زائفاً
- هذا ليس تقييم رسمي مرخص — هو تحليل ذكي استرشادي

## ⚠️ كشف الأسعار المشبوهة والاحتيال (قاعدة حرجة):
هذه القاعدة لها أولوية قصوى على جميع القواعد الأخرى.

### القاعدة الأساسية — حد الـ 50%:
- إذا كان السعر المطلوب أقل من 50% من القيمة السوقية المقدّرة → الصفقة **مشبوهة**
- إذا كان السعر المطلوب أعلى من 150% من القيمة السوقية المقدّرة (أي أكثر بـ 50%) → الصفقة **مشبوهة**
- في كلتا الحالتين: rating = "مخاطر عالية"، ratingColor = "red"، fairnessVerdict = "غير واضح"
- أضف تحذير واضح في risks يوضح الفرق بين السعر والقيمة السوقية

### أمثلة:
- أصل قيمته السوقية 1000 ريال معروض بـ 400 ريال (أقل من 50%) = مشبوه
- أصل قيمته السوقية 1000 ريال معروض بـ 1600 ريال (أكثر من 50%) = مشبوه
- أصل قيمته السوقية 1000 ريال معروض بـ 2 ريال = مشبوه جداً + تحذير احتيال
- أصل قيمته السوقية 1000 ريال معروض بـ 700-1300 ريال = نطاق معقول

### قاعدة ذهبية:
- لا تصنّف أبداً صفقة بسعر غير منطقي كـ "فرصة ممتازة" أو "فرصة جيدة"
- السعر المنخفض جداً ليس "فرصة" — هو علامة خطر واحتيال محتمل
- السعر المرتفع جداً ليس "حذر فقط" — هو علامة مبالغة أو تضليل
- فقط الأسعار ضمن نطاق ±50% من القيمة السوقية يمكن أن تُصنّف إيجابياً

## ⚠️ كشف الأوصاف المشبوهة وغير المفهومة:
- إذا كان عنوان الصفقة أو وصف النشاط غير مفهوم أو عشوائي أو بلا معنى تجاري واضح:
  - صنّف الصفقة كـ "مخاطر عالية" مع تحذير: "وصف الصفقة غير واضح أو مشبوه"
  - أضف في risks: "عنوان أو وصف الصفقة غير مفهوم — قد يشير إلى صفقة غير جدية أو محاولة احتيال"
- أمثلة على أوصاف مشبوهة: حروف عشوائية، كلمات بلا سياق، رموز فقط، نص مكرر بلا معنى
- الوصف التجاري الواضح يجب أن يحدد نوع النشاط بوضوح (مطعم، محل تجاري، مصنع، إلخ)


عند تقييم الأصول، استخدم منصات: حراج، مستعمل، OpenSooq، Facebook Marketplace
- قارن بذكاء حسب النوع والفئة والحالة
- ميّز بين: سعر الطلب، المؤشر السوقي المقدّر، القيمة المؤكدة
- إذا لم يكن هناك أصول في الصفقة، تخطّ تقييم الأصول
- إذا كان الفرق بين السعر المطلوب والقيمة السوقية أكثر من 80% (أعلى أو أقل)، نبّه بوضوح

## تنسيق المخرج:
أنتج JSON بالهيكل المطلوب. لكل حقل تحليل:
- إذا كان خارج نطاق الصفقة، اكتب "خارج نطاق هذه الصفقة" بدل تحليل مفصل
- missingInfo يجب أن تحتوي فقط على معلومات ناقصة ضمن نطاق الصفقة المحدد`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing, perspective: rawPerspective } = await req.json();
    const perspective: "seller" | "buyer" = rawPerspective === "seller" ? "seller" : "buyer";

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
              description: "Return a structured deal check analysis respecting the deal type scope",
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

  // Add deal type context FIRST - this is the most important part
  sections.push(buildDealTypeContext(listing));

  if (listing.title) sections.push(`\n## العنوان: ${listing.title}`);
  if (listing.business_activity || listing.category) sections.push(`## النشاط: ${listing.business_activity || listing.category}`);
  
  const primaryType = listing.primary_deal_type || listing.deal_type;
  const scope = DEAL_TYPE_SCOPES[primaryType] || DEAL_TYPE_SCOPES["full_takeover"];
  
  sections.push(`## نوع الصفقة: ${scope.label}`);
  if (listing.city) sections.push(`## المدينة: ${listing.city}`);
  if (listing.district) sections.push(`## الحي: ${listing.district}`);
  if (listing.price) sections.push(`## السعر المطلوب: ${listing.price} ريال سعودي`);

  // CR extraction data — include when available (especially for cr_only)
  const crData = listing.cr_extraction;
  if (crData) {
    sections.push("\n## بيانات مستخرجة من السجل التجاري (تم قراءتها من الوثيقة):");
    if (crData.cr_number) sections.push(`- رقم السجل التجاري: ${crData.cr_number}`);
    if (crData.entity_name) sections.push(`- اسم المنشأة: ${crData.entity_name}`);
    if (crData.business_activity) sections.push(`- النشاط التجاري: ${crData.business_activity}`);
    if (crData.city) sections.push(`- المدينة: ${crData.city}`);
    if (crData.district) sections.push(`- الحي: ${crData.district}`);
    if (crData.issue_date) sections.push(`- تاريخ الإصدار: ${crData.issue_date}`);
    if (crData.expiry_date) sections.push(`- تاريخ الانتهاء: ${crData.expiry_date}`);
    if (crData.legal_status) sections.push(`- الحالة القانونية: ${crData.legal_status}`);
    if (crData.extraction_confidence) sections.push(`- دقة الاستخراج: ${crData.extraction_confidence}`);
    sections.push("⚠️ هذه البيانات تم استخراجها فعلياً من مستند السجل التجاري — لا تعتبرها ناقصة ولا تطلبها كمعلومات مفقودة.");
  }

  // Lease info - only if relevant to deal type
  if (scope.analyzeFields.includes("lease")) {
    if (listing.annual_rent || listing.lease_duration || listing.lease_remaining) {
      sections.push("\n## بيانات الإيجار:");
      if (listing.annual_rent) sections.push(`- الإيجار السنوي: ${listing.annual_rent} ريال`);
      if (listing.lease_duration) sections.push(`- مدة العقد: ${listing.lease_duration}`);
      if (listing.lease_remaining) sections.push(`- المتبقي من العقد: ${listing.lease_remaining}`);
    }
  }

  // Licenses - only if relevant
  if (scope.analyzeFields.includes("licenses")) {
    if (listing.municipality_license || listing.civil_defense_license || listing.surveillance_cameras) {
      sections.push("\n## التراخيص والامتثال:");
      if (listing.municipality_license) sections.push(`- رخصة البلدية: ${listing.municipality_license}`);
      if (listing.civil_defense_license) sections.push(`- الدفاع المدني: ${listing.civil_defense_license}`);
      if (listing.surveillance_cameras) sections.push(`- كاميرات المراقبة: ${listing.surveillance_cameras}`);
    }
  }

  // Liabilities - only if relevant
  if (scope.analyzeFields.includes("liabilities")) {
    if (listing.liabilities) sections.push(`\n## الالتزامات: ${listing.liabilities}`);
  }

  // Deal structure includes/excludes
  const dealOptions = listing.deal_options || [];
  if (dealOptions.length > 0) {
    sections.push("\n## هيكل الصفقة المختار:");
    for (const opt of dealOptions) {
      const optScope = DEAL_TYPE_SCOPES[opt.type_id];
      if (optScope) {
        sections.push(`- ${opt.is_primary ? "رئيسي" : "بديل"}: ${optScope.label}`);
      }
    }
  }

  // Inventory - only if assets are in scope
  if (scope.analyzeFields.includes("assets") && listing.inventory?.length) {
    sections.push("\n## جرد الأصول (قارن كل صنف مع منصات السوق المستعمل السعودي):");
    listing.inventory.forEach((item: any) => {
      const details = [
        item.name,
        item.qty ? `${item.qty} وحدة` : null,
        item.condition ? `حالة: ${item.condition}` : null,
        item.category ? `فئة: ${item.category}` : null,
      ].filter(Boolean).join(" — ");
      sections.push(`- ${details}`);
    });
  }

  // Documents
  if (listing.documents?.length) {
    sections.push("\n## المستندات:");
    listing.documents.forEach((doc: any) => {
      sections.push(`- ${doc.name || doc.type}: ${doc.status || "مرفق"}`);
    });
  }

  if (listing.disclosure_score) sections.push(`\n## نسبة الإفصاح: ${listing.disclosure_score}%`);
  if (listing.ai_summary) sections.push(`\n## ملخص البائع:\n${listing.ai_summary}`);

  sections.push("\n---");
  sections.push("## تعليمات:");
  sections.push(`1. حلل هذه الصفقة حصرياً كصفقة "${scope.label}"`);
  sections.push("2. لا تطلب معلومات خارج نطاق نوع الصفقة المحدد");
  sections.push("3. إذا تم تقديم بيانات مستخرجة من السجل التجاري أعلاه، استخدمها في التحليل ولا تعتبرها ناقصة");
  
  if (scope.analyzeFields.includes("assets")) {
    sections.push("4. استخدم منصات حراج ومستعمل وأوبن سوق كمراجع مقارنة للأصول");
  } else {
    sections.push("4. تخطّ مقارنة الأصول — ليست ضمن نطاق هذه الصفقة");
  }
  
  sections.push("5. أنتج تقرير الجدوى باستخدام الأداة deal_check_result");

  return sections.join("\n");
}
