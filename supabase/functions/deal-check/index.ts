import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type AnalysisPerspective = "seller" | "buyer";
type AnalysisMode = "create" | "update";

const ANALYSIS_VERSION = "v2";

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

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeListingForAnalysis(listing: any) {
  const inventoryPricingMode = listing?.inventory_pricing_mode || "per_item";
  const bulkInventoryPrice = normalizeNumber(listing?.bulk_inventory_price);

  const inventory = Array.isArray(listing?.inventory)
    ? listing.inventory
        .map((item: any) => ({
          name: normalizeText(item?.name),
          qty: normalizeNumber(item?.qty),
          condition: normalizeText(item?.condition),
          category: normalizeText(item?.category),
          unitPrice: normalizeNumber(item?.unitPrice),
        }))
        .filter((item: any) => item.name)
        .sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b), "ar"))
    : [];

  const inventoryTotalPrice = inventoryPricingMode === "bulk"
    ? bulkInventoryPrice
    : inventory.reduce((sum: number, item: any) => sum + ((item.unitPrice || 0) * (item.qty || 1)), 0) || null;

  const documents = Array.isArray(listing?.documents)
    ? listing.documents
        .map((doc: any) => ({
          name: normalizeText(doc?.name),
          type: normalizeText(doc?.type),
          status: normalizeText(doc?.status),
          filesCount: Array.isArray(doc?.files) ? doc.files.length : normalizeNumber(doc?.filesCount) ?? 0,
        }))
        .sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b), "ar"))
    : [];

  const dealOptions = Array.isArray(listing?.deal_options)
    ? listing.deal_options
        .map((opt: any) => ({
          type_id: normalizeText(opt?.type_id),
          priority: normalizeNumber(opt?.priority) ?? 0,
          is_primary: Boolean(opt?.is_primary),
        }))
        .filter((opt: any) => opt.type_id)
        .sort((a: any, b: any) => (a.priority - b.priority) || String(a.type_id).localeCompare(String(b.type_id), "ar"))
    : [];

  const crData = listing?.cr_extraction
    ? {
        cr_number: normalizeText(listing.cr_extraction.cr_number),
        entity_name: normalizeText(listing.cr_extraction.entity_name),
        business_activity: normalizeText(listing.cr_extraction.business_activity),
        city: normalizeText(listing.cr_extraction.city),
        district: normalizeText(listing.cr_extraction.district),
        issue_date: normalizeText(listing.cr_extraction.issue_date),
        expiry_date: normalizeText(listing.cr_extraction.expiry_date),
        legal_status: normalizeText(listing.cr_extraction.legal_status),
        extraction_confidence: normalizeText(listing.cr_extraction.extraction_confidence),
      }
    : null;

  return {
    title: normalizeText(listing?.title),
    business_activity: normalizeText(listing?.business_activity),
    category: normalizeText(listing?.category),
    primary_deal_type: normalizeText(listing?.primary_deal_type),
    deal_type: normalizeText(listing?.deal_type),
    city: normalizeText(listing?.city),
    district: normalizeText(listing?.district),
    price: normalizeNumber(listing?.price),
    annual_rent: normalizeNumber(listing?.annual_rent),
    lease_duration: normalizeText(listing?.lease_duration),
    lease_remaining: normalizeText(listing?.lease_remaining),
    municipality_license: normalizeText(listing?.municipality_license),
    civil_defense_license: normalizeText(listing?.civil_defense_license),
    surveillance_cameras: normalizeText(listing?.surveillance_cameras),
    liabilities: normalizeText(listing?.liabilities),
    disclosure_score: normalizeNumber(listing?.disclosure_score),
    ai_summary: normalizeText(listing?.ai_summary),
    cr_extraction: crData,
    inventory,
    inventory_pricing_mode: inventoryPricingMode,
    bulk_inventory_price: bulkInventoryPrice,
    inventory_total_price: inventoryTotalPrice,
    documents,
    deal_options: dealOptions,
  };
}

/** Extract all document file URLs from listing for multimodal AI analysis */
function extractDocumentUrls(listing: any): string[] {
  if (!Array.isArray(listing?.documents)) return [];
  const urls: string[] = [];
  for (const doc of listing.documents) {
    if (Array.isArray(doc?.files)) {
      for (const url of doc.files) {
        if (typeof url === "string" && url.startsWith("http")) {
          urls.push(url);
        }
      }
    }
  }
  return urls.slice(0, 20); // Limit to 20 document images
}

/** Build multimodal user message content with text + document images */
function buildMultimodalContent(textPrompt: string, documentUrls: string[]): any {
  if (documentUrls.length === 0) {
    return textPrompt;
  }
  const content: any[] = [
    { type: "text", text: textPrompt + "\n\n## ⚠️ الوثائق المرفقة أدناه (صور مستندات — حلّلها واستخرج منها أي بيانات مفيدة للتحليل):\nهذه الوثائق سرية ولا تُعرض للمشتري — لكن يجب استخدام بياناتها في التقييم." },
  ];
  for (const url of documentUrls) {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  }
  return content;
}

async function createInputSignature(listing: any, perspective: AnalysisPerspective): Promise<string> {
  const payload = JSON.stringify({
    listing,
    perspective,
    analysisVersion: ANALYSIS_VERSION,
  });
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

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

function buildSellerPerspective(): string {
  return `
## منظور التحليل: البائع (تحليل عام محايد)
- ⚠️ ممنوع مخاطبة البائع بالاسم أو بضمير المخاطب (لا "يا أحمد"، لا "إعلانك"، لا "ننصحك"، لا "أنت")
- استخدم صيغة الغائب والعبارات المحايدة فقط: "الإعلان"، "الصفقة"، "يُنصح"، "يُلاحظ"، "قد يؤثر"
- قدّم التوصيات كرؤية سوقية عامة وليس كنصيحة شخصية
- وصِّ بسعر أقل بـ 10% من متوسط السوق لجذب المشترين بسرعة
- في التوصية والإرشادات: اقترح تحسينات على البيانات والصور والسعر بصيغة محايدة
- نبّه إلى النقاط التي قد تُثير تساؤلات المشترين
- في negotiationGuidance: قدّم إرشادات تفاوض عامة بصيغة محايدة
- مثال صحيح: "يُنصح بتسعير الصفقة بـ X ريال (أقل بـ 10% من متوسط السوق) لتسريع البيع"
- مثال خاطئ: "يا أحمد، ننصحك بتسعير صفقتك..."`;
}

const BUYER_PERSPECTIVE = `
## منظور التحليل: المشتري (تحليل عام محايد)
- ⚠️ ممنوع مخاطبة المشتري بالاسم أو بضمير المخاطب (لا "يمكنك"، لا "أنت"، لا "انتبه")
- استخدم صيغة الغائب والعبارات المحايدة فقط: "الصفقة"، "يُلاحظ"، "يُنصح"، "قد يكون"، "من المهم"
- قدّم التحليل كتقييم سوقي محايد وليس كنصيحة شخصية
- قيّم ما إذا كان السعر المعروض عادلاً بناءً على بيانات السوق
- في التوصية: وضّح ما إذا كانت الصفقة تستحق الدخول فيها بصيغة محايدة
- نبّه إلى المخاطر والنقاط التي تستدعي الفحص الميداني
- في negotiationGuidance: قدّم إرشادات تفاوض عامة بصيغة محايدة
- مثال صحيح: "يمكن التفاوض لخفض السعر إلى X ريال بناءً على حالة الأصول"
- مثال خاطئ: "يمكنك التفاوض..."، "انتبه لهذه النقطة"`;

function buildConsistencyRules(mode: AnalysisMode): string {
  if (mode === "update") {
    return `
## قاعدة الثبات عند التحديث:
- هذا تحديث لتحليل سابق، وليس تحليلاً جديداً من الصفر
- حافظ على نفس الحكم العام ونفس عدالة السعر ونفس مستوى المخاطر إذا لم تتغير الأدلة المرتبطة بها
- غيّر فقط البنود المتأثرة فعلياً بالبيانات المعدلة
- إذا كان التغيير في السعر فقط، حدّث التقييم السعري والتوصية والتفاوض فقط ما لم يظهر سبب آخر واضح
- إذا كان التغيير في البيانات أو المستندات فقط، حدّث missingInfo والثقة والمخاطر ذات الصلة فقط
- لا تبدّل بين أوصاف متناقضة مثل "فرصة جيدة" و"مخاطر عالية" دون سبب جديد صريح في البيانات`; 
  }

  return `
## قاعدة الثبات الأساسية:
- إذا تكررت نفس المدخلات أو مدخلات مكافئة، يجب أن يبقى rating وfairnessVerdict وconfidenceLevel والتوصية السعريّة متسقة
- لا تغيّر الحكم لمجرد اختلاف أسلوب الصياغة
- عند الشك، قدّم حكماً محافظاً وثابتاً يستند إلى الأدلة`; 
}

function buildSystemPrompt(perspective: AnalysisPerspective, mode: AnalysisMode): string {
  const perspectiveBlock = perspective === "seller" ? buildSellerPerspective() : BUYER_PERSPECTIVE;

  return `أنت محلل صفقات تجارية خبير متخصص في السوق السعودي. مهمتك تقديم تقييم جدوى أولية دقيقة وثابتة لكل صفقة.

## تحليل الوثائق المرفقة:
- إذا تم إرفاق صور مستندات (سجل تجاري، عقد إيجار، رخص، فواتير)، حلّلها واستخرج منها كل المعلومات المفيدة
- استخدم البيانات المستخرجة من الوثائق في التقييم والتحليل
- هذه الوثائق سرية ولا تُعرض للمشتري — لكن بياناتها أساسية للتحليل الدقيق
- إذا وجدت تناقضاً بين بيانات الإفصاح والوثائق المرفقة، نبّه إلى ذلك

${perspectiveBlock}
${buildConsistencyRules(mode)}

## قاعدة أساسية — احترام نوع الصفقة:
- يجب أن يكون تحليلك محصوراً بنطاق نوع الصفقة المحدد
- إذا كانت الصفقة "أصول فقط": لا تسأل عن السجل التجاري أو الاسم التجاري أو عقد الإيجار أو الالتزامات السابقة
- الحقول غير المشمولة في نطاق الصفقة ليست "معلومات ناقصة" ولا "مخاطر"

## منهج تقييم ثابت:
- احسب الحكم بناءً على 5 محاور ثابتة فقط: السعر مقابل السوق، اكتمال البيانات، جودة الأصول/التشغيل، وضوح النشاط، والمخاطر النظامية
- لا تغيّر rating أو fairnessVerdict إلا إذا تغيّر واحد من هذه المحاور بدليل واضح
- اذكر الأدلة أولاً ثم الاستنتاج

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

## تسعير الأصول:
- إذا كانت البيانات تحتوي على inventory_pricing_mode = "per_item" وكل قطعة لها unitPrice:
  - حلل سعر كل قطعة مقارنة بالسوق
  - استخدم inventory_total_price كمؤشر لقيمة الأصول الإجمالية
  - إذا كان إجمالي أسعار الأصول أعلى من السعر الكلي للصفقة، نبّه
- إذا كانت inventory_pricing_mode = "bulk":
  - استخدم bulk_inventory_price كسعر إجمالي للأصول
  - قارنه بعدد القطع وحالتها لتقييم عدالته
- إذا لم يتم تحديد أسعار للأصول، اذكر ذلك كمعلومة ناقصة (إن كانت الأصول ضمن نطاق الصفقة)

## حالة الأصول:
- حالة كل قطعة محددة بواحدة من: "جديد"، "شبه جديد"، "نظيف"، "تالف"
- الأصول بحالة "تالف" تُخصم قيمتها بشكل كبير من التقييم السوقي
- الأصول بحالة "جديد" تُقيّم بالقرب من سعر السوق الجديد
- "شبه جديد" و"نظيف" تقييمهما بين 50%-80% من سعر الجديد حسب النوع
- إذا كانت أغلب الأصول بحالة "تالف"، نبّه إلى ذلك كمخاطرة

## مستندات الأصول المطلوبة:
- إذا كانت الصفقة تشمل أصول/معدات ولم يتم رفع فواتير شراء أو عقود صيانة للأجهزة:
  - اذكر ذلك في missingInfo كمعلومة ناقصة مهمة
  - مثال: "لم يتم إرفاق فواتير شراء الأصول أو عقود صيانة الأجهزة — وجودها يعزز مصداقية الإعلان ويساعد في التحقق من حالة المعدات وقيمتها الفعلية"
- فواتير الشراء وعقود الصيانة تُعتبر أدلة داعمة لتقييم الأصول وتزيد ثقة المشتري

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

function buildPreviousAnalysisReference(previousAnalysis: any): string | null {
  if (!previousAnalysis || typeof previousAnalysis !== "object") return null;

  const reference = {
    rating: previousAnalysis.rating,
    fairnessVerdict: previousAnalysis.fairnessVerdict,
    confidenceLevel: previousAnalysis.confidenceLevel,
    recommendation: previousAnalysis.recommendation,
    risks: previousAnalysis.risks,
    strengths: previousAnalysis.strengths,
    missingInfo: previousAnalysis.missingInfo,
    marketComparison: previousAnalysis.marketComparison,
  };

  return JSON.stringify(reference, null, 2);
}

function buildAnalysisPrompt(listing: any, mode: AnalysisMode, previousAnalysis: any, inputSignature: string): string {
  const sections: string[] = [];

  sections.push("# بيانات الصفقة المطلوب تحليلها\n");
  sections.push(`## بصمة المدخلات الحالية: ${inputSignature}`);
  sections.push(buildDealTypeContext(listing));

  if (listing.title) sections.push(`\n## العنوان: ${listing.title}`);
  if (listing.business_activity || listing.category) sections.push(`## النشاط: ${listing.business_activity || listing.category}`);

  const primaryType = listing.primary_deal_type || listing.deal_type;
  const scope = DEAL_TYPE_SCOPES[primaryType] || DEAL_TYPE_SCOPES["full_takeover"];

  sections.push(`## نوع الصفقة: ${scope.label}`);
  if (listing.city) sections.push(`## المدينة: ${listing.city}`);
  if (listing.district) sections.push(`## الحي: ${listing.district}`);
  if (listing.price) sections.push(`## السعر المطلوب: ${listing.price} ريال سعودي`);

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
    sections.push("⚠️ هذه البيانات تم استخراجها فعلياً من المستند — لا تعتبرها ناقصة ولا تطلبها كمعلومات مفقودة.");
  }

  if (scope.analyzeFields.includes("lease")) {
    if (listing.annual_rent || listing.lease_duration || listing.lease_remaining) {
      sections.push("\n## بيانات الإيجار:");
      if (listing.annual_rent) sections.push(`- الإيجار السنوي: ${listing.annual_rent} ريال`);
      if (listing.lease_duration) sections.push(`- مدة العقد: ${listing.lease_duration}`);
      if (listing.lease_remaining) sections.push(`- المتبقي من العقد: ${listing.lease_remaining}`);
    }
  }

  if (scope.analyzeFields.includes("licenses")) {
    if (listing.municipality_license || listing.civil_defense_license || listing.surveillance_cameras) {
      sections.push("\n## التراخيص والامتثال:");
      if (listing.municipality_license) sections.push(`- رخصة البلدية: ${listing.municipality_license}`);
      if (listing.civil_defense_license) sections.push(`- الدفاع المدني: ${listing.civil_defense_license}`);
      if (listing.surveillance_cameras) sections.push(`- كاميرات المراقبة: ${listing.surveillance_cameras}`);
    }
  }

  if (scope.analyzeFields.includes("liabilities") && listing.liabilities) {
    sections.push(`\n## الالتزامات: ${listing.liabilities}`);
  }

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

  if (listing.documents?.length) {
    sections.push("\n## المستندات:");
    listing.documents.forEach((doc: any) => {
      const label = doc.name || doc.type || "مستند";
      const suffix = doc.filesCount ? ` (${doc.filesCount} ملف)` : "";
      sections.push(`- ${label}${suffix}: ${doc.status || "مرفق"}`);
    });
  }

  if (listing.disclosure_score) sections.push(`\n## نسبة الإفصاح: ${listing.disclosure_score}%`);
  if (listing.ai_summary) sections.push(`\n## ملخص البائع:\n${listing.ai_summary}`);

  const previousReference = buildPreviousAnalysisReference(previousAnalysis);
  if (mode === "update" && previousReference) {
    sections.push("\n## التحليل السابق المرجعي (حدّثه فقط عند وجود سبب واضح):");
    sections.push(previousReference);
  }

  sections.push("\n---");
  sections.push("## تعليمات:");
  sections.push(`1. حلل هذه الصفقة حصرياً كصفقة "${scope.label}"`);
  sections.push("2. لا تطلب معلومات خارج نطاق نوع الصفقة المحدد");
  sections.push("3. إذا تم تقديم بيانات مستخرجة من السجل التجاري أعلاه، استخدمها في التحليل ولا تعتبرها ناقصة");
  sections.push(mode === "update"
    ? "4. هذا تحديث لتحليل سابق — أبقِ العناصر غير المتأثرة ثابتة، وغيّر فقط ما أثّرت عليه التعديلات الحالية"
    : "4. حافظ على ثبات الحكم إذا أُعيد إرسال نفس البيانات مرة أخرى");

  if (scope.analyzeFields.includes("assets")) {
    sections.push("5. استخدم منصات حراج ومستعمل وأوبن سوق كمراجع مقارنة للأصول");
  } else {
    sections.push("5. تخطّ مقارنة الأصول — ليست ضمن نطاق هذه الصفقة");
  }

  sections.push("6. أنتج تقرير الجدوى باستخدام الأداة deal_check_result");

  return sections.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing, perspective: rawPerspective, sellerName, mode: rawMode, previousAnalysis } = await req.json();
    const perspective: AnalysisPerspective = rawPerspective === "seller" ? "seller" : "buyer";
    const mode: AnalysisMode = rawMode === "update" ? "update" : "create";

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

    const normalizedListing = normalizeListingForAnalysis(listing);
    const documentUrls = extractDocumentUrls(listing);
    const inputSignature = await createInputSignature(normalizedListing, perspective);
    const userPrompt = buildAnalysisPrompt(normalizedListing, mode, previousAnalysis, inputSignature);
    const userContent = buildMultimodalContent(userPrompt, documentUrls);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0.1,
        top_p: 0.1,
        messages: [
          { role: "system", content: buildSystemPrompt(perspective, mode) },
          { role: "user", content: userContent },
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
    const analysis = {
      ...result,
      _meta: {
        analysisVersion: ANALYSIS_VERSION,
        inputSignature,
        mode,
        perspective,
        generatedAt: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify({ success: true, analysis }), {
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
