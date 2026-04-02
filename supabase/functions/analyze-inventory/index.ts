import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت نظام ذكاء اصطناعي متخصص في تحليل صور المشاريع التجارية واكتشاف الأصول والمعدات لإنشاء جرد دقيق، وكذلك استخراج المعلومات من المستندات التجارية.

مهامك:
1. تحليل الصور المرفقة واكتشاف كل الأصول والمعدات المرئية
2. استخراج المعلومات من أي مستندات مرفقة (سجل تجاري، عقد إيجار، رخص، فواتير)
3. التمييز الدقيق بين:
   - أصل واحد تم تصويره من زوايا مختلفة (يُعد أصلاً واحداً فقط)
   - أصول متعددة متشابهة أو متطابقة (يُحسب كل واحد منها)

قواعد التمييز:
- إذا ظهر نفس الأصل في عدة صور من زوايا مختلفة → أصل واحد فقط (quantity = 1)
- إذا ظهرت عدة وحدات متطابقة في نفس الصورة → أصل واحد بكمية متعددة
- إذا كانت الأصول مختلفة في اللون أو الحجم أو الشكل → أصول منفصلة

مؤشرات أنه نفس الأصل:
- نفس الخدوش أو العلامات
- نفس الخلفية والموقع
- زوايا تصوير مختلفة لنفس الشيء
- نفس الرقم التسلسلي أو الملصق

مؤشرات أنها أصول متعددة:
- ظهور عدة وحدات في نفس الإطار
- مسافات بين الوحدات
- اختلافات طفيفة بين الوحدات
- ترتيب منظم (صف من الكراسي مثلاً)

مستوى الثقة:
- high: متأكد تماماً من التصنيف
- medium: شبه متأكد لكن يحتاج تأكيد
- low: غير متأكد ويحتاج تأكيد المستخدم

للمستندات: إذا وُجدت مستندات (سجل تجاري، عقد إيجار، رخص)، استخرج منها:
- نوع النشاط، المدينة، الحي، الإيجار السنوي، مدة العقد، رقم السجل، اسم المنشأة

يجب أن ترد بتنسيق JSON فقط باستخدام الأداة المتوفرة.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrls, photoGroups, documentUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if ((!photoUrls || photoUrls.length === 0) && (!documentUrls || documentUrls.length === 0)) {
      return new Response(JSON.stringify({ error: "لا توجد صور أو مستندات للتحليل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build image content parts for the vision model
    const imageContent: any[] = [];
    
    // Add context about photo groups
    let groupContext = "مجموعات الصور:\n";
    if (photoGroups) {
      for (const [group, urls] of Object.entries(photoGroups)) {
        if (Array.isArray(urls) && urls.length > 0) {
          groupContext += `- ${group}: ${urls.length} صورة\n`;
        }
      }
    }

    imageContent.push({
      type: "text",
      text: `${groupContext}\nحلّل الصور التالية واكتشف كل الأصول والمعدات. انتبه جيداً للتمييز بين صور متعددة لنفس الأصل وبين أصول متعددة متشابهة. عدد الصور الكلي: ${(photoUrls || []).length}`
    });

    // Add each photo URL as image_url (up to 50)
    for (const url of (photoUrls || []).slice(0, 50)) {
      imageContent.push({
        type: "image_url",
        image_url: { url, detail: "high" }
      });
    }

    // Add document URLs for extraction
    if (documentUrls && documentUrls.length > 0) {
      imageContent.push({
        type: "text",
        text: `\n\nالمستندات المرفقة (${documentUrls.length} مستند) — حاول استخراج معلومات النشاط والموقع والإيجار وأي بيانات مفيدة منها:`
      });
      for (const url of documentUrls.slice(0, 10)) {
        imageContent.push({
          type: "image_url",
          image_url: { url, detail: "high" }
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: imageContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_inventory",
              description: "Report the discovered inventory assets from the analyzed photos",
              parameters: {
                type: "object",
                properties: {
                  assets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "اسم الأصل بالعربية" },
                        category: { type: "string", description: "فئة الأصل (معدات مطبخ، تبريد، أثاث، أجهزة، ديكور، تكييف، إضاءة، أخرى)" },
                        quantity: { type: "number", description: "عدد القطع المكتشفة" },
                        condition: { type: "string", enum: ["جديد", "شبه جديد", "جيد", "تالف"], description: "حالة الأصل" },
                        confidence: { type: "string", enum: ["high", "medium", "low"], description: "مستوى الثقة في التصنيف" },
                        detection_note: { type: "string", description: "ملاحظة قصيرة عن سبب التصنيف (مثال: ظهرت 3 وحدات في نفس الإطار، أو نفس الأصل من زاويتين)" },
                        photo_indices: { type: "array", items: { type: "number" }, description: "أرقام الصور التي ظهر فيها هذا الأصل (0-indexed)" },
                        is_same_asset_multiple_angles: { type: "boolean", description: "هل تم اكتشاف أن عدة صور هي لنفس الأصل من زوايا مختلفة؟" },
                      },
                      required: ["name", "category", "quantity", "condition", "confidence", "detection_note", "photo_indices", "is_same_asset_multiple_angles"]
                    }
                  },
                  analysis_summary: { type: "string", description: "ملخص عام قصير عن نتائج التحليل بالعربية" },
                  total_unique_assets: { type: "number", description: "العدد الإجمالي للأصول الفريدة المكتشفة" },
                  dedup_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "وصف إجراء إزالة التكرار" },
                        merged_count: { type: "number", description: "عدد الصور التي تم دمجها كأصل واحد" }
                      },
                      required: ["description", "merged_count"]
                    },
                    description: "قائمة بإجراءات إزالة التكرار التي تمت"
                  },
                  extracted_info: {
                    type: "object",
                    description: "معلومات مستخرجة من المستندات والصور (إن وجدت)",
                    properties: {
                      business_activity: { type: "string", description: "نوع النشاط التجاري" },
                      city: { type: "string", description: "المدينة" },
                      district: { type: "string", description: "الحي" },
                      annual_rent: { type: "string", description: "الإيجار السنوي" },
                      lease_duration: { type: "string", description: "مدة العقد" },
                      cr_number: { type: "string", description: "رقم السجل التجاري" },
                      entity_name: { type: "string", description: "اسم المنشأة" },
                    }
                  }
                },
                required: ["assets", "analysis_summary", "total_unique_assets", "dedup_actions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_inventory" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);

      if (t.includes("Unsupported image format")) {
        return new Response(JSON.stringify({ error: "بعض الصور المرفوعة بصيغة غير مدعومة للتحليل الذكي حالياً. أعد رفعها وسيتم تحويلها تلقائياً ثم جرّب مرة أخرى." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "حدث خطأ في تحليل الصور" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من تحليل الصور" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-inventory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
