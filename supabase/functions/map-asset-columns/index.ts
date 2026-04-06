import { corsHeaders } from "@supabase/supabase-js/cors";

const SYSTEM_PROMPT = `أنت محلل بيانات متخصص في تعيين أعمدة ملفات Excel إلى حقول الأصول المعيارية.

الحقول المعيارية المطلوب مطابقتها:
- asset_name: اسم الأصل أو العنصر
- description: وصف تفصيلي
- category: التصنيف (أثاث، أجهزة كهربائية، معدات، مركبات، أخرى)
- quantity: الكمية
- unit: الوحدة (قطعة، مجموعة، صندوق...)
- condition: الحالة (جديد، شبه جديد، جيد، تالف)
- brand: العلامة التجارية
- model: الموديل
- serial_number: الرقم التسلسلي
- purchase_date: تاريخ الشراء
- purchase_cost: تكلفة الشراء
- estimated_value: القيمة التقديرية
- market_value: القيمة السوقية الحالية
- location: الموقع
- notes: ملاحظات

القواعد:
1. طابق الأعمدة حتى لو كانت بالعربية أو الإنجليزية أو مختلطة
2. إذا لم يكن هناك مطابقة واضحة، استخدم "unmapped"
3. أرجع confidence لكل مطابقة: "high" أو "medium" أو "low"
4. حلل أيضاً البيانات واكتشف:
   - الصفوف الفارغة أو الناقصة
   - القيم المشبوهة (أرقام سالبة، قيم مرتفعة جداً)
   - الصفوف المكررة
5. اقترح تصنيفات للأصول إن أمكن
6. أرجع ملخصاً عربياً للبيانات`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { headers, sampleRows, sheetName } = await req.json();

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return new Response(JSON.stringify({ error: "لا توجد أعمدة في الملف" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `قم بتحليل الأعمدة التالية من ملف Excel (ورقة: ${sheetName || "الأولى"}) وطابقها مع الحقول المعيارية للأصول.

الأعمدة الموجودة في الملف:
${headers.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}

عينة من البيانات (أول ${Math.min(sampleRows?.length || 0, 5)} صفوف):
${JSON.stringify(sampleRows?.slice(0, 5) || [], null, 2)}

المطلوب:
1. طابق كل عمود مع الحقل المعياري المناسب
2. حلل جودة البيانات
3. اكتشف المشاكل المحتملة
4. قدم ملخصاً`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "مفتاح API غير متوفر" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_column_mapping",
              description: "Report column mapping results",
              parameters: {
                type: "object",
                properties: {
                  mappings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_header: { type: "string" },
                        mapped_field: {
                          type: "string",
                          enum: [
                            "asset_name", "description", "category", "quantity",
                            "unit", "condition", "brand", "model", "serial_number",
                            "purchase_date", "purchase_cost", "estimated_value",
                            "market_value", "location", "notes", "unmapped",
                          ],
                        },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        reason: { type: "string" },
                      },
                      required: ["original_header", "mapped_field", "confidence"],
                    },
                  },
                  data_quality: {
                    type: "object",
                    properties: {
                      empty_rows: { type: "number" },
                      duplicate_rows: { type: "number" },
                      suspicious_values: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            row: { type: "number" },
                            column: { type: "string" },
                            value: { type: "string" },
                            reason: { type: "string" },
                          },
                        },
                      },
                      incomplete_rows: { type: "number" },
                    },
                  },
                  suggested_categories: {
                    type: "array",
                    items: { type: "string" },
                  },
                  summary: { type: "string" },
                },
                required: ["mappings", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_column_mapping" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[map-asset-columns] AI error:", errText);
      return new Response(JSON.stringify({ error: "فشل تحليل الأعمدة" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "لم يتم الحصول على نتائج من التحليل" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[map-asset-columns] Error:", err);
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
