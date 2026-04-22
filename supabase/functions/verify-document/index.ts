import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Field-specific verification prompts for the three critical document types.
const FIELD_RULES: Record<string, { label: string; description: string; markers: string; rejectExamples: string }> = {
  asset_list: {
    label: "قائمة الأصول",
    description:
      "وثيقة (Excel/PDF/صورة جدول/قائمة مكتوبة) تحتوي على جدول أو قائمة منظمة للأصول والمعدات بأسماء وكميات و/أو حالات و/أو أسعار.",
    markers:
      "1) عمود/قائمة بأسماء الأصول (مثل: ثلاجة، فرن، طاولة، كاشير...)\n2) أعمدة إضافية مثل: الكمية، الحالة، السعر، الموديل، السنة\n3) ترتيب جدولي أو قائمة مرقّمة واضحة\n4) عدد عناصر معقول (عادةً ≥ 3)",
    rejectExamples:
      "صورة لمنتج واحد، صورة شخصية، إيصال شراء فردي، صورة محل بدون قائمة، فاتورة مفردة، هوية، سجل تجاري",
  },
  equipment_photos: {
    label: "صور المعدات",
    description:
      "صورة فوتوغرافية لمعدة أو أجهزة أو أدوات أو أثاث أو قطع غيار أو أي شيء تشغيلي قد يستخدم في نشاط تجاري (مثل: ثلاجات، أفران، مكائن قهوة، طاولات، رفوف، كاشير، شاشات، معدات مطبخ، معدات صالون، ماكينات صناعية، أدوات يدوية، قطع غيار، حتى لو كانت غير مألوفة أو متخصصة).",
    markers:
      "1) أي جسم مادي يبدو معدة/جهاز/أداة/أثاث/قطعة غيار\n2) لا يلزم الوضوح المثالي — تكفي القدرة على تمييز أنه ليس وجهاً أو طعاماً أو شاشة\n3) حتى لو كانت زاوية صعبة أو إضاءة ضعيفة أو لقطة قريبة جداً (close-up)",
    rejectExamples:
      "selfie أو وجه شخصي، طعام/مشروبات جاهزة فقط، لقطة شاشة لتطبيق أو نص، سيارة شخصية، منظر طبيعي، حيوان، صورة فاضية أو سوداء كلياً أو معطوبة",
  },
  ownership_proof: {
    label: "إثبات ملكية",
    description:
      "مستند رسمي يثبت ملكية الأصول أو المعدات أو النشاط، مثل: فاتورة شراء رسمية، عقد بيع، سند ملكية، شهادة جمركية، فاتورة ضريبية باسم البائع، أو كشف موثق من جهة رسمية.",
    markers:
      "1) نص رسمي مكتوب (فاتورة/عقد/سند/شهادة)\n2) يحتوي على: اسم بائع/مورد + تاريخ + رقم مستند + مبلغ + ختم/توقيع\n3) يربط أصلاً معيناً بمالك معيّن بشكل صريح وقانوني\n4) لغة قانونية/مالية رسمية (مثل: 'يقر'، 'يثبت'، 'تم البيع'، 'اشترى'، 'فاتورة رقم'، 'ضريبة قيمة مضافة')",
    rejectExamples:
      "قائمة أصول/معدات بدون اسم بائع وتاريخ وتوقيع، جدول جرد مخزون، صورة معدة فقط، صورة شخصية، صورة محل، صورة طعام، لقطة شاشة عشوائية، صورة هوية فقط، ملف فارغ، ملاحظات شخصية، قائمة موظفين، أي ملف لا يحوي صياغة رسمية لإثبات ملكية",
  },
};

const SYSTEM_PROMPT = (rule: typeof FIELD_RULES[string], expectedType: string) => {
  const isEquipmentPhotos = expectedType === "equipment_photos";

  const baseHeader = `أنت نظام تحقق في منصة "سوق تقبيل" السعودية. مهمتك التحقق مما إذا كان الملف المرفوع يطابق نوع المستند المتوقع.

نوع المستند المتوقع: **${rule.label}**

الوصف: ${rule.description}

علامات القبول:
${rule.markers}

أمثلة على ما يجب رفضه:
${rule.rejectExamples}
`;

  if (isEquipmentPhotos) {
    return `${baseHeader}
قواعد خاصة بصور المعدات (3 مستويات):

✅ القبول (is_valid: true) ينقسم إلى:
   - confidence: "high" → صورة واضحة لمعدة/جهاز/أداة/قطعة غيار يمكن التعرف عليها بسهولة.
   - confidence: "medium" → صورة لجسم يبدو معدة لكن: إضاءة ضعيفة، زاوية صعبة، معدة غير مألوفة/متخصصة، أو لقطة قريبة جداً (close-up). في هذه الحالة، اكتب في حقل notes: "الصورة مقبولة — قد تحتاج معاينة ميدانية من جساس للتحقق".

❌ الرفض (is_valid: false) — فقط للحالات الواضحة التالية:
   - selfie أو صورة وجه شخصية
   - طعام أو مشروبات جاهزة فقط
   - لقطة شاشة لنص أو تطبيق
   - سيارة شخصية، منظر طبيعي، حيوانات
   - صورة فاضية / سوداء كلياً / معطوبة

عند الرفض، اكتب rejection_reason واضحاً وموجهاً للمستخدم بالعربية، مثل:
"الصورة تبدو صورة شخصية (selfie) — الرجاء رفع صورة للمعدة"
"الصورة تبدو طعاماً جاهزاً — الرجاء رفع صورة للمعدات التشغيلية"

⚠️ مبدأ حاكم: لا ترفض لمجرد ضعف الإضاءة أو غرابة المعدة. اقبل بـ medium بدلاً من الرفض. الرفض فقط عندما يكون المحتوى واضحاً أنه ليس معدة.

صف بدقة ما تراه فعلياً في حقل document_type_detected.
أجب باستخدام الأداة المتوفرة فقط.`;
  }

  return `${baseHeader}
قواعد صارمة (إلزامية):
1. كن متشدداً جداً — لا تقبل ملفاً إلا إذا تطابق فعلياً مع كل علامات القبول الجوهرية.
2. **اختبار التطابق المعكوس**: إذا كان الملف يطابق نوعاً آخر من المستندات (مثلاً: قائمة أصول عند طلب إثبات ملكية)، ارفضه فوراً مع توضيح أن نوعه الفعلي مختلف.
3. لا تقبل ملفاً لمجرد أنه "مرتبط بالموضوع" — يجب أن يكون من النوع المحدد بالضبط.
4. إذا كانت الصورة ضبابية جداً أو لا يمكن تحديد محتواها، ارفضها مع ذكر السبب.
5. صف بدقة ما تراه فعلياً في حقل document_type_detected.
6. لا تخمن. كن صريحاً في rejection_reason إذا رفضت.
7. أجب باستخدام الأداة المتوفرة فقط.
8. عند الشك، ارفض. الرفض الخاطئ أفضل من القبول الخاطئ.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentUrl, expectedType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!documentUrl || !expectedType) {
      return new Response(
        JSON.stringify({ error: "documentUrl و expectedType مطلوبان" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rule = FIELD_RULES[expectedType];
    if (!rule) {
      return new Response(
        JSON.stringify({ error: `نوع غير مدعوم: ${expectedType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const urlLower = documentUrl.toLowerCase().split("?")[0];
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];
    let isImage = imageExtensions.some((ext) => urlLower.endsWith(ext));
    let isPdf = urlLower.endsWith(".pdf");
    let isSpreadsheet = /\.(xlsx?|csv)$/i.test(urlLower);

    // Fallback: when extension is unknown (e.g., signed URLs without extension),
    // probe the Content-Type via HEAD so we don't reject valid uploads.
    if (!isImage && !isPdf && !isSpreadsheet) {
      try {
        const head = await fetch(documentUrl, { method: "HEAD" });
        const ct = (head.headers.get("content-type") || "").toLowerCase();
        if (ct.startsWith("image/")) isImage = true;
        else if (ct.includes("pdf")) isPdf = true;
        else if (ct.includes("spreadsheet") || ct.includes("excel") || ct.includes("csv")) isSpreadsheet = true;
      } catch (_) {
        // ignore — fall through to existing checks
      }
    }

    // equipment_photos must be a real photo
    if (!isImage && expectedType === "equipment_photos") {
      return new Response(
        JSON.stringify({
          is_valid: false,
          document_type_detected: isPdf ? "ملف PDF" : isSpreadsheet ? "ملف Excel/CSV" : "ملف غير صورة",
          rejection_reason: "حقل صور المعدات يقبل صوراً فقط (PNG/JPG/WebP/HEIC). يجب رفع صورة فعلية للمعدة.",
          confidence: "high",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unsupported (e.g., random binary, video, etc.)
    if (!isImage && !isPdf && !isSpreadsheet) {
      return new Response(
        JSON.stringify({
          is_valid: false,
          document_type_detected: "نوع ملف غير مدعوم",
          rejection_reason: "يرجى رفع صورة (PNG/JPG/WebP) أو PDF أو Excel/CSV حسب نوع الحقل.",
          confidence: "high",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI content payload — supports images, PDFs (as base64 data URL), and spreadsheets (parsed to text).
    let content: Array<Record<string, unknown>>;

    if (isImage) {
      content = [
        {
          type: "text",
          text: `تحقق بدقة: هل هذه الصورة فعلاً من نوع "${rule.label}"؟ إذا لم تكن كذلك، ارفضها مع ذكر السبب الواضح ونوع الملف الفعلي.`,
        },
        { type: "image_url", image_url: { url: documentUrl, detail: "high" } },
      ];
    } else if (isPdf) {
      // Fetch the PDF and embed as base64 data URL — Gemini Vision can read PDF pages.
      const pdfResp = await fetch(documentUrl);
      if (!pdfResp.ok) throw new Error(`Failed to fetch PDF: ${pdfResp.status}`);
      const buf = new Uint8Array(await pdfResp.arrayBuffer());
      // Cap at 10MB to stay within model limits.
      if (buf.byteLength > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({
            is_valid: false,
            document_type_detected: "ملف PDF كبير جداً",
            rejection_reason: "الملف يتجاوز 10MB، يرجى رفع نسخة مضغوطة أو لقطة من الصفحات الأهم.",
            confidence: "high",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Base64-encode in chunks (btoa cannot handle large strings via spread).
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      const b64 = btoa(bin);
      const dataUrl = `data:application/pdf;base64,${b64}`;
      content = [
        {
          type: "text",
          text: `تحقق بصرامة من محتوى ملف PDF التالي: هل يطابق فعلاً نوع "${rule.label}"؟ افحص النص والجداول والشعارات الرسمية. ارفض إذا كان كتاباً تعليمياً، روايةً، نشرة عامة، صفحة فارغة، أو أي محتوى لا يطابق المعايير.`,
        },
        { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
      ];
    } else {
      // Spreadsheet/CSV — fetch and intelligently extract readable content.
      const sheetResp = await fetch(documentUrl);
      if (!sheetResp.ok) throw new Error(`Failed to fetch spreadsheet: ${sheetResp.status}`);
      const buf = new Uint8Array(await sheetResp.arrayBuffer());
      const isXlsx = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

      let extracted = "";
      let kind = "CSV/نصي";

      if (isXlsx) {
        kind = "Excel (xlsx)";
        // Use jsr:@zip-js/zip-js to unzip the xlsx in-memory and read sharedStrings + first sheet.
        try {
          const zipMod = await import("https://deno.land/x/zipjs@v2.7.45/index.js");
          const reader = new zipMod.ZipReader(new zipMod.Uint8ArrayReader(buf));
          const entries = await reader.getEntries();
          const wanted = ["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"];
          const parts: string[] = [];
          for (const entry of entries) {
            if (!wanted.includes(entry.filename)) continue;
            const xml = await entry.getData!(new zipMod.TextWriter());
            // Strip XML tags, keep readable strings.
            const cleaned = String(xml)
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            parts.push(`[${entry.filename}]\n${cleaned.slice(0, 4000)}`);
          }
          await reader.close();
          extracted = parts.join("\n\n");
          if (!extracted) {
            extracted = "(تعذّر استخراج أي نص من الملف — قد يكون فارغاً أو محمياً بكلمة سر)";
          }
        } catch (zipErr) {
          console.error("xlsx unzip failed:", zipErr);
          extracted = "(فشل فك ضغط ملف xlsx — قد يكون تالفاً)";
        }
      } else {
        // CSV / plain text
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 50 * 1024));
        extracted = text;
      }

      content = [
        {
          type: "text",
          text: `تحقق بصرامة من محتوى ملف ${kind} التالي: هل يطابق فعلاً نوع "${rule.label}"؟\n\nابحث عن: جدول/قائمة أصول أو معدات بأسماء وكميات و/أو حالات/أسعار (≥3 عناصر).\nارفض فوراً إذا كان: قائمة موظفين/رواتب، فاتورة وحيدة، ملاحظات عامة، نص عشوائي، ملف فارغ، أو أي محتوى لا يطابق الوصف.\n\nمحتوى الملف المستخرج:\n\`\`\`\n${extracted.slice(0, 8000)}\n\`\`\``,
        },
      ];
    }


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT(rule, expectedType) },
          { role: "user", content },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_verification",
              description: `Verify whether the uploaded image matches the expected document type: ${rule.label}.`,
              parameters: {
                type: "object",
                properties: {
                  is_valid: {
                    type: "boolean",
                    description: `true فقط إذا كانت الصورة تطابق فعلياً "${rule.label}". false لأي شيء آخر.`,
                  },
                  document_type_detected: {
                    type: "string",
                    description: "وصف دقيق ومختصر لما تراه فعلياً في الصورة.",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "إذا is_valid=false، اشرح سبب الرفض بوضوح.",
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "مستوى الثقة في التحقق.",
                  },
                  notes: {
                    type: "string",
                    description: "ملاحظات إضافية اختيارية.",
                  },
                },
                required: ["is_valid", "document_type_detected", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_verification" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول لاحقاً." }), {
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
      console.error("AI verify error:", response.status, t);
      return new Response(JSON.stringify({ error: "تعذّر التحقق من الملف" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "فشل تحليل الملف" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    if (result.is_valid === false) {
      console.warn("Document rejected:", { expectedType, detected: result.document_type_detected, reason: result.rejection_reason });
      return new Response(
        JSON.stringify({
          is_valid: false,
          document_type_detected: result.document_type_detected,
          rejection_reason: result.rejection_reason || `الملف لا يطابق نوع "${rule.label}".`,
          confidence: result.confidence,
          expected_label: rule.label,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ...result, expected_label: rule.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
