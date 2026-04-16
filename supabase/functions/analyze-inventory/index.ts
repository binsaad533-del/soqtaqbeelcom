import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت نظام ذكاء اصطناعي متخصص في تحليل المشاريع التجارية بأعلى مستوى من الدقة والاحترافية.

## مهامك الأساسية:

### 1. تحليل الصور واكتشاف الأصول
- اكتشف كل الأصول والمعدات المرئية في الصور
- ميّز بدقة بين:
  - أصل واحد تم تصويره من زوايا مختلفة (يُعد أصلاً واحداً فقط)
  - أصول متعددة متشابهة أو متطابقة (يُحسب كل واحد منها)

### 2. استخراج البيانات من جميع أنواع المرفقات
حلّل واستخرج البيانات من:
- **المستندات المصورة**: سجلات تجارية، رخص بلدية، عقود إيجار، شهادات
- **ملفات PDF**: عقود، تقارير، كشوفات حسابات، فواتير
- **ملفات Excel/جداول بيانات**: جرد مخزون، قوائم أصول، بيانات مالية، كشوفات
- **ملفات مضغوطة**: تعامل مع محتوياتها كملفات منفصلة
- **أي ملف آخر**: استخرج أقصى ما يمكن من البيانات

### 3. بناء وصف شامل ومهني للأصول
من جميع البيانات المستخرجة (صور + مستندات + ملفات)، أنشئ وصفاً احترافياً شاملاً يتضمن:
- **ملخص المشروع**: نوع النشاط، الموقع، المساحة
- **قائمة الأصول المفصلة**: كل أصل بحالته وكميته وفئته
- **البيانات المالية**: الإيجار، الإيرادات، المصاريف (إن وُجدت)
- **بيانات العقود والتراخيص**: أرقام السجلات، تواريخ الانتهاء، حالة الرخص
- **المخزون**: إن وُجد جرد مخزون في الملفات المرفقة
- **أي معلومات إضافية** مستخرجة من الملفات

## قواعد التمييز بين الأصول:
مؤشرات أنه نفس الأصل:
- نفس الخدوش أو العلامات، نفس الخلفية والموقع
- زوايا تصوير مختلفة لنفس الشيء، نفس الرقم التسلسلي

مؤشرات أنها أصول متعددة:
- ظهور عدة وحدات في نفس الإطار
- اختلافات طفيفة بين الوحدات، ترتيب منظم

## قواعد مهمة:
- استخرج كل البيانات الممكنة من كل ملف مرفق
- لا تتجاهل أي معلومة مهمة
- إذا وُجد جدول بيانات (Excel)، استخرج كل صفوفه وأعمدته المهمة
- إذا وُجد عقد أو فاتورة، استخرج المبالغ والتواريخ والأطراف
- الوصف يجب أن يكون بالعربية ومرتّب ومنظم بعناوين فرعية
- مساحة الموقع (area_sqm) مطلوبة بشدة — ابحث عنها في كل المستندات

يجب أن ترد باستخدام الأداة المتوفرة فقط.`;

/** Try to extract text content from non-image files (PDF text layer, Excel, etc.) */
async function fetchFileAsText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "";

    // For text-based files, read directly
    if (
      contentType.includes("text/") ||
      contentType.includes("csv") ||
      contentType.includes("json") ||
      contentType.includes("xml")
    ) {
      return await resp.text();
    }

    // For Excel/spreadsheet files, parse with SheetJS
    const ext = getFileExtension(url);
    if (["xlsx", "xls", "xlsm", "xlsb"].includes(ext) ||
        contentType.includes("spreadsheet") ||
        contentType.includes("excel")) {
      return await parseExcelToText(resp);
    }

    return null;
  } catch (e) {
    console.error("fetchFileAsText error:", e);
    return null;
  }
}

/** Parse Excel file to readable text, batching large files */
async function parseExcelToText(resp: Response): Promise<string | null> {
  try {
    const arrayBuffer = await resp.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });

    let result = "";
    const MAX_ROWS_PER_SHEET = 500;
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Convert to array of arrays for better control
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (rows.length === 0) continue;

      result += `\n=== ورقة: ${sheetName} (${rows.length} صف) ===\n`;

      // Take header + up to MAX_ROWS_PER_SHEET rows
      const headerRow = rows[0];
      const dataRows = rows.slice(1, MAX_ROWS_PER_SHEET + 1);

      // Format as tab-separated for AI readability
      if (headerRow && headerRow.length > 0) {
        result += headerRow.join("\t") + "\n";
        result += "---\n";
      }

      for (const row of dataRows) {
        const nonEmpty = row.some((cell: any) => cell !== "" && cell != null);
        if (nonEmpty) {
          result += row.join("\t") + "\n";
          totalRows++;
        }
      }

      if (rows.length > MAX_ROWS_PER_SHEET + 1) {
        result += `\n... (تم عرض أول ${MAX_ROWS_PER_SHEET} صف من ${rows.length - 1} صف بيانات) ...\n`;
      }
    }

    if (totalRows === 0) return null;

    // Limit total text size to 30KB for AI context
    if (result.length > 30000) {
      result = result.slice(0, 30000) + "\n\n... (تم اقتطاع النص — الملف كبير جداً) ...";
    }

    console.info(`[parseExcelToText] Parsed ${totalRows} rows from ${workbook.SheetNames.length} sheets`);
    return result;
  } catch (e) {
    console.error("[parseExcelToText] Failed to parse Excel:", e);
    return null;
  }
}

function getFileExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return ext.split("?")[0];
  } catch {
    return "";
  }
}

function isImageFile(url: string): boolean {
  const ext = getFileExtension(url);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "tif"].includes(ext);
}

/** Formats the AI model can accept as image_url (images + PDF) */
function isAiVisuallySupported(url: string): boolean {
  const ext = getFileExtension(url);
  return isImageFile(url) || ext === "pdf";
}

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
      text: `${groupContext}\nحلّل الصور التالية واكتشف كل الأصول والمعدات. انتبه جيداً للتمييز بين صور متعددة لنفس الأصل وبين أصول متعددة متشابهة. عدد الصور الكلي: ${(photoUrls || []).length}`,
    });

    // Add each photo URL as image_url (up to 30, use low detail for large batches)
    const allPhotos = (photoUrls || []).slice(0, 30);
    const detailLevel = allPhotos.length > 10 ? "low" : allPhotos.length > 5 ? "auto" : "high";
    for (const url of allPhotos) {
      imageContent.push({
        type: "image_url",
        image_url: { url, detail: detailLevel },
      });
    }

    // Process ALL document files - images, PDFs, Excel, and text files
    if (documentUrls && documentUrls.length > 0) {
      const imageDocUrls: string[] = [];
      const textContents: { filename: string; content: string }[] = [];
      const binaryFileUrls: { url: string; ext: string }[] = [];

      for (const url of documentUrls.slice(0, 30)) {
        const ext = getFileExtension(url);

        if (isImageFile(url)) {
          imageDocUrls.push(url);
        } else if (["csv", "txt", "json", "xml", "tsv"].includes(ext)) {
          const text = await fetchFileAsText(url);
          if (text) {
            textContents.push({ filename: `file.${ext}`, content: text.slice(0, 15000) });
          }
        } else if (isAiVisuallySupported(url)) {
          // PDF — can be sent as image_url for Gemini multimodal
          binaryFileUrls.push({ url, ext });
        } else {
          // XLSX, DOCX, ZIP, etc. — try text/data extraction
          const text = await fetchFileAsText(url);
          if (text && text.length > 50) {
            // Allow larger content for spreadsheets (up to 30KB)
            const isSpreadsheet = ["xlsx", "xls", "xlsm", "xlsb"].includes(ext);
            const maxLen = isSpreadsheet ? 30000 : 15000;
            textContents.push({ filename: `file.${ext}`, content: text.slice(0, maxLen) });
          } else {
            console.warn(`Skipping unsupported file format for AI vision: .${ext} — ${url}`);
            textContents.push({ filename: `file.${ext}`, content: `[ملف ${ext.toUpperCase()} مرفق — لا يمكن تحليله بصرياً، يُرجى رفعه كـ PDF أو صورة للتحليل الكامل]` });
          }
        }
      }

      // Add document images for visual analysis
      if (imageDocUrls.length > 0) {
        imageContent.push({
          type: "text",
          text: `\n\n📄 مستندات مصورة (${imageDocUrls.length} مستند) — استخرج كل المعلومات الممكنة:`,
        });
        for (const url of imageDocUrls) {
          imageContent.push({
            type: "image_url",
            image_url: { url, detail: "high" },
          });
        }
      }

      // Add binary documents (PDF, XLSX, etc.) for Gemini multimodal processing
      if (binaryFileUrls.length > 0) {
        imageContent.push({
          type: "text",
          text: `\n\n📁 ملفات مرفقة (${binaryFileUrls.length} ملف: ${binaryFileUrls.map((f) => f.ext.toUpperCase()).join(", ")}) — حلّل محتوياتها واستخرج كل البيانات:`,
        });
        for (const { url } of binaryFileUrls) {
          imageContent.push({
            type: "image_url",
            image_url: { url, detail: "high" },
          });
        }
      }

      // Add extracted text content
      if (textContents.length > 0) {
        let textBlock = `\n\n📊 بيانات نصية مستخرجة من الملفات المرفقة:\n`;
        for (const { filename, content } of textContents) {
          textBlock += `\n--- ملف: ${filename} ---\n${content}\n`;
        }
        imageContent.push({ type: "text", text: textBlock });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: allPhotos.length > 10 ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: imageContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_inventory",
              description: "Report the discovered inventory assets and comprehensive listing description",
              parameters: {
                type: "object",
                properties: {
                  assets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "اسم الأصل بالعربية" },
                        category: { type: "string", description: "فئة الأصل (معدات مطبخ، تبريد، أثاث، أجهزة، ديكور، تكييف، إضاءة، مخزون، أخرى)" },
                        quantity: { type: "number", description: "عدد القطع المكتشفة" },
                        condition: { type: "string", enum: ["جديد", "شبه جديد", "جيد", "تالف"], description: "حالة الأصل" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        detection_note: { type: "string", description: "ملاحظة عن سبب التصنيف" },
                        photo_indices: { type: "array", items: { type: "number" } },
                        is_same_asset_multiple_angles: { type: "boolean" },
                        estimated_value: { type: "string", description: "القيمة التقديرية إن أمكن تحديدها من المستندات" },
                        source: { type: "string", description: "مصدر اكتشاف الأصل: صورة، مستند، جدول بيانات" },
                      },
                      required: ["name", "category", "quantity", "condition", "confidence", "detection_note", "photo_indices", "is_same_asset_multiple_angles"],
                    },
                  },
                  analysis_summary: { type: "string", description: "ملخص عام قصير عن نتائج التحليل بالعربية" },
                  total_unique_assets: { type: "number" },
                  dedup_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        merged_count: { type: "number" },
                      },
                      required: ["description", "merged_count"],
                    },
                  },
                  generated_description: {
                    type: "string",
                    description: `وصف احترافي شامل ومفصل للمشروع والأصول بالعربية، مبني من كل البيانات المستخرجة من الصور والمستندات والملفات. يجب أن يكون:
- مرتب بعناوين فرعية واضحة (مثل: نبذة عن المشروع، الأصول والمعدات، البيانات المالية، التراخيص، الموقع)
- شامل لكل المعلومات المستخرجة من جميع المرفقات
- مكتوب بأسلوب مهني جذاب للمشتري المحتمل
- يتضمن تفاصيل المخزون والبيانات المالية إن وُجدت في الملفات
- لا يتجاوز 2000 حرف`,
                  },
                  extracted_info: {
                    type: "object",
                    description: "معلومات مستخرجة من المستندات والملفات",
                    properties: {
                      business_activity: { type: "string" },
                      city: { type: "string" },
                      district: { type: "string" },
                      annual_rent: { type: "string" },
                      lease_duration: { type: "string" },
                      cr_number: { type: "string" },
                      entity_name: { type: "string" },
                      area_sqm: { type: "string" },
                      asking_price: { type: "string", description: "السعر المطلوب للتقبيل أو البيع إن وُجد في أي مستند أو إعلان مرفق" },
                      monthly_revenue: { type: "string", description: "الإيرادات الشهرية إن وُجدت" },
                      monthly_expenses: { type: "string", description: "المصاريف الشهرية إن وُجدت" },
                      employee_count: { type: "string", description: "عدد الموظفين إن وُجد" },
                      license_expiry: { type: "string", description: "تاريخ انتهاء الرخصة" },
                      contract_details: { type: "string", description: "تفاصيل العقود المستخرجة" },
                      inventory_from_files: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            item_name: { type: "string" },
                            quantity: { type: "number" },
                            unit_price: { type: "number" },
                            total_price: { type: "number" },
                          },
                        },
                        description: "جرد مخزون مستخرج من ملفات Excel أو PDF",
                      },
                    },
                  },
                  files_processed: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        file_type: { type: "string", description: "نوع الملف (صورة، PDF، Excel، نص)" },
                        data_extracted: { type: "string", description: "ملخص البيانات المستخرجة من هذا الملف" },
                      },
                    },
                    description: "قائمة بالملفات التي تمت معالجتها وما استُخرج منها",
                  },
                  document_photo_indices: {
                    type: "array",
                    items: { type: "number" },
                    description: "أرقام الصور (0-indexed من قائمة photoUrls) التي تحتوي على وثائق إدارية مثل: سجل تجاري، عقد إيجار، رخصة بلدية، شهادة، فاتورة، هوية، أو أي مستند نصي — وليست صور أصول أو معدات أو ديكور المحل. هذه الصور ستُخفى من معرض الصور العام.",
                  },
                },
                required: ["assets", "analysis_summary", "total_unique_assets", "dedup_actions", "generated_description", "document_photo_indices"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_inventory" } },
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
      console.error("AI error:", response.status, t);

      if (t.includes("Unsupported image format")) {
        return new Response(
          JSON.stringify({
            error: "بعض الملفات المرفوعة بصيغة غير مدعومة للتحليل الذكي حالياً. أعد رفعها بصيغة أخرى وجرّب مرة أخرى.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "حدث خطأ في تحليل الملفات" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من تحليل الملفات" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
