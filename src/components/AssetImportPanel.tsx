import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileSpreadsheet,
  Upload,
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import AiInlineStar from "@/components/AiInlineStar";
import SarSymbol from "@/components/SarSymbol";
import type { InventoryItem } from "@/pages/create-listing/types";

/* ── Types ── */
interface ColumnMapping {
  original_header: string;
  mapped_field: string;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

interface DataQuality {
  empty_rows?: number;
  duplicate_rows?: number;
  suspicious_values?: Array<{ row: number; column: string; value: string; reason: string }>;
  incomplete_rows?: number;
}

interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  rawRowCount: number;
}

const STANDARD_FIELDS: Record<string, string> = {
  asset_name: "اسم الأصل",
  description: "الوصف",
  category: "التصنيف",
  quantity: "الكمية",
  unit: "الوحدة",
  condition: "الحالة",
  brand: "العلامة التجارية",
  model: "الموديل",
  serial_number: "الرقم التسلسلي",
  purchase_date: "تاريخ الشراء",
  purchase_cost: "تكلفة الشراء",
  estimated_value: "القيمة التقديرية",
  market_value: "القيمة السوقية",
  location: "الموقع",
  notes: "ملاحظات",
  unmapped: "— تجاهل —",
};

const CONDITION_MAP: Record<string, string> = {
  new: "جديد",
  "like new": "شبه جديد",
  good: "جيد",
  used: "جيد",
  fair: "جيد",
  damaged: "تالف",
  broken: "تالف",
  poor: "تالف",
  جديد: "جديد",
  "شبه جديد": "شبه جديد",
  مستعمل: "جيد",
  جيد: "جيد",
  تالف: "تالف",
  ممتاز: "جديد",
};

interface Props {
  listingId: string | null;
  onImport: (items: InventoryItem[]) => void;
  existingInventory: InventoryItem[];
  onFileUploaded?: (url: string) => void;
  uploadFile: (listingId: string, file: File, folder: string) => Promise<{ url: string | null; error?: string; path?: string }>;
}

export default function AssetImportPanel({ listingId, onImport, existingInventory, onFileUploaded, uploadFile }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"idle" | "parsing" | "mapping" | "review" | "done">("idle");
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [quality, setQuality] = useState<DataQuality>({});
  const [aiSummary, setAiSummary] = useState("");
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [importedCount, setImportedCount] = useState(0);

  /* ── Parse Excel/CSV ── */
  const parseFile = useCallback(async (f: File) => {
    setFile(f);
    setStep("parsing");

    try {
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", codepage: 65001 });

      if (!workbook.SheetNames?.length) {
        toast.error("الملف فارغ — لا توجد أوراق عمل");
        setStep("idle");
        return;
      }

      const parsedSheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        const headers = json.length > 0 ? Object.keys(json[0]) : [];

        // Clean data
        const cleaned = json
          .map((row) => {
            const cleaned: Record<string, any> = {};
            for (const [k, v] of Object.entries(row)) {
              cleaned[k] = typeof v === "string" ? v.trim() : v;
            }
            return cleaned;
          })
          .filter((row) => {
            // Remove completely empty rows
            return Object.values(row).some((v) => v !== "" && v != null);
          });

        return { name, headers, rows: cleaned, rawRowCount: json.length };
      });

      setSheets(parsedSheets);
      setActiveSheet(0);

      const primary = parsedSheets[0];
      if (!primary || primary.headers.length === 0) {
        toast.error("لم يتم العثور على أعمدة في الورقة الأولى");
        setStep("idle");
        return;
      }

      if (primary.rows.length === 0) {
        toast.error("الملف لا يحتوي على بيانات");
        setStep("idle");
        return;
      }

      toast.success(`تم قراءة ${primary.rows.length} صف من ${primary.headers.length} عمود`);

      // Call AI for column mapping
      setStep("mapping");
      try {
        const { data, error } = await supabase.functions.invoke("map-asset-columns", {
          body: {
            headers: primary.headers,
            sampleRows: primary.rows.slice(0, 10),
            sheetName: primary.name,
          },
        });

        if (error) {
          console.error("[AssetImport] AI mapping error:", error);
          // Fallback: try keyword-based mapping
          setMappings(fallbackMapping(primary.headers));
          toast.info("تم استخدام المطابقة التلقائية — يمكنك تعديلها يدوياً");
        } else {
          setMappings(data.mappings || fallbackMapping(primary.headers));
          setQuality(data.data_quality || {});
          setAiSummary(data.summary || "");
          setSuggestedCategories(data.suggested_categories || []);
        }
      } catch (err) {
        console.error("[AssetImport] AI call failed:", err);
        setMappings(fallbackMapping(primary.headers));
        toast.info("تم استخدام المطابقة التلقائية — يمكنك تعديلها يدوياً");
      }

      setStep("review");
    } catch (err) {
      console.error("[AssetImport] Parse error:", err);
      toast.error("تعذّر قراءة الملف — تأكد من أنه ملف Excel أو CSV صالح");
      setStep("idle");
    }
  }, []);

  /* ── Fallback keyword mapping ── */
  const fallbackMapping = (headers: string[]): ColumnMapping[] => {
    const keywords: Record<string, string[]> = {
      asset_name: ["اسم", "name", "عنصر", "item", "asset", "الأصل", "المعدة", "الجهاز", "بند"],
      description: ["وصف", "description", "desc", "تفصيل", "detail"],
      category: ["تصنيف", "فئة", "category", "type", "نوع"],
      quantity: ["كمية", "عدد", "qty", "quantity", "count", "العدد"],
      unit: ["وحدة", "unit"],
      condition: ["حالة", "condition", "status", "state"],
      brand: ["علامة", "ماركة", "brand", "manufacturer"],
      model: ["موديل", "model", "طراز"],
      serial_number: ["رقم تسلسلي", "serial", "الرقم التسلسلي", "s/n"],
      purchase_date: ["تاريخ الشراء", "purchase date", "date"],
      purchase_cost: ["تكلفة", "cost", "سعر الشراء", "purchase cost", "purchase price"],
      estimated_value: ["قيمة تقديرية", "estimated", "القيمة", "value", "سعر", "price", "قيمة"],
      market_value: ["قيمة سوقية", "market", "market value"],
      location: ["موقع", "location", "مكان", "place"],
      notes: ["ملاحظات", "notes", "note", "remarks", "ملاحظة"],
    };

    return headers.map((header) => {
      const lc = header.toLowerCase().trim();
      for (const [field, kws] of Object.entries(keywords)) {
        if (kws.some((kw) => lc.includes(kw.toLowerCase()))) {
          return { original_header: header, mapped_field: field, confidence: "medium" as const };
        }
      }
      return { original_header: header, mapped_field: "unmapped", confidence: "low" as const };
    });
  };

  /* ── Build inventory items from mapped data ── */
  const buildInventoryItems = useCallback((): InventoryItem[] => {
    const sheet = sheets[activeSheet];
    if (!sheet) return [];

    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
      if (m.mapped_field !== "unmapped") {
        fieldMap[m.original_header] = m.mapped_field;
      }
    });

    const items: InventoryItem[] = [];
    const seen = new Set<string>();

    sheet.rows.forEach((row, idx) => {
      if (excludedRows.has(idx)) return;

      // Build item from mapped fields
      const mapped: Record<string, any> = {};
      for (const [header, value] of Object.entries(row)) {
        const field = fieldMap[header];
        if (field) mapped[field] = value;
      }

      const name = String(mapped.asset_name || mapped.description || `عنصر ${idx + 1}`).trim();
      if (!name || name === `عنصر ${idx + 1}` && !mapped.quantity && !mapped.estimated_value) return;

      // Deduplicate
      const key = `${name}-${mapped.quantity || 1}-${mapped.condition || ""}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const rawCondition = String(mapped.condition || "").trim().toLowerCase();
      const normalizedCondition = CONDITION_MAP[rawCondition] || "جيد";

      const qty = Math.max(1, Math.round(Number(mapped.quantity) || 1));
      const unitPrice = parseFloat(String(mapped.estimated_value || mapped.purchase_cost || mapped.market_value || "0").replace(/[^\d.]/g, "")) || null;

      items.push({
        id: `excel-${Date.now()}-${idx}`,
        name,
        qty,
        condition: normalizedCondition,
        category: String(mapped.category || "أخرى").trim(),
        included: true,
        confidence: "high",
        detectionNote: `مستورد من Excel — ${file?.name || "ملف"}`,
        photoIndices: [],
        isSameAssetMultipleAngles: false,
        userConfirmed: true,
        unitPrice,
      });
    });

    return items;
  }, [sheets, activeSheet, mappings, excludedRows, file]);

  /* ── Confirm Import ── */
  const handleConfirmImport = useCallback(async () => {
    if (!listingId) {
      toast.error("يجب حفظ المسودة أولاً قبل استيراد الأصول");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload original file as attachment
      if (file) {
        const result = await uploadFile(listingId, file, "documents");
        if (result.url) {
          onFileUploaded?.(result.url);
          console.info("[AssetImport] Original file uploaded:", result.url);
        } else {
          console.warn("[AssetImport] File upload failed:", result.error);
          toast.warning(`تم استيراد البيانات لكن فشل حفظ الملف الأصلي: ${result.error || "خطأ غير معروف"}`);
        }
      }

      // 2. Build and merge inventory items
      const newItems = buildInventoryItems();
      if (newItems.length === 0) {
        toast.error("لا توجد أصول صالحة للاستيراد");
        setUploading(false);
        return;
      }

      // Merge with existing, avoid duplicates by name
      const existingNames = new Set(existingInventory.map((i) => i.name.toLowerCase()));
      const uniqueNew = newItems.filter((i) => !existingNames.has(i.name.toLowerCase()));
      const duplicateCount = newItems.length - uniqueNew.length;

      const merged = [...existingInventory, ...uniqueNew];

      // 3. Save to database
      const { error } = await supabase
        .from("listings")
        .update({ inventory: merged as any })
        .eq("id", listingId);

      if (error) {
        console.error("[AssetImport] DB save error:", error);
        toast.error(`فشل حفظ الأصول: ${error.message}`);
        setUploading(false);
        return;
      }

      // 4. Notify parent
      onImport(merged);
      setImportedCount(uniqueNew.length);
      setStep("done");

      const msg = duplicateCount > 0
        ? `تم استيراد ${uniqueNew.length} أصل بنجاح (${duplicateCount} مكرر تم تجاهله)`
        : `تم استيراد ${uniqueNew.length} أصل بنجاح`;
      toast.success(msg, { icon: "📊" });
    } catch (err) {
      console.error("[AssetImport] Import error:", err);
      toast.error("حدث خطأ أثناء الاستيراد");
    } finally {
      setUploading(false);
    }
  }, [listingId, file, buildInventoryItems, existingInventory, onImport, uploadFile, onFileUploaded]);

  /* ── Handle file select ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xls", "xlsx", "csv"].includes(ext || "")) {
      toast.error("نوع الملف غير مدعوم — يُقبل فقط: XLS, XLSX, CSV");
      return;
    }

    if (f.size > 25 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 25 MB");
      return;
    }

    parseFile(f);
    e.target.value = "";
  };

  /* ── Reset ── */
  const handleReset = () => {
    setStep("idle");
    setFile(null);
    setSheets([]);
    setMappings([]);
    setQuality({});
    setAiSummary("");
    setExcludedRows(new Set());
    setImportedCount(0);
  };

  /* ── Computed stats ── */
  const currentSheet = sheets[activeSheet];
  const previewItems = step === "review" ? buildInventoryItems() : [];
  const totalQty = previewItems.reduce((s, i) => s + i.qty, 0);
  const totalValue = previewItems.reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0);
  const categories = [...new Set(previewItems.map((i) => i.category).filter(Boolean))];

  return (
    <div className="border border-border/50 rounded-2xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet size={18} strokeWidth={1.5} className="text-primary" />
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold">استيراد الأصول من Excel</h3>
            <p className="text-[10px] text-muted-foreground">XLS · XLSX · CSV — استيراد ذكي مع تعيين الأعمدة تلقائياً</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step === "done" && (
            <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
              ✓ {importedCount} أصل
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* ── IDLE: Upload zone ── */}
          {step === "idle" && (
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-muted/10 hover:bg-primary/5 p-6 text-center cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Upload size={22} strokeWidth={1.5} className="text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">ارفع ملف الأصول (Excel أو CSV)</p>
              <p className="text-xs text-muted-foreground mb-2">سيتم تحليل الأعمدة تلقائياً بالذكاء الاصطناعي</p>
              <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                <span>XLS</span>
                <span>·</span>
                <span>XLSX</span>
                <span>·</span>
                <span>CSV</span>
                <span>·</span>
                <span>حتى 25 MB</span>
              </div>
            </div>
          )}

          {/* ── PARSING ── */}
          {step === "parsing" && (
            <div className="text-center py-6">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm font-medium">جاري قراءة الملف...</p>
              <p className="text-xs text-muted-foreground">{file?.name}</p>
            </div>
          )}

          {/* ── MAPPING ── */}
          {step === "mapping" && (
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <AiInlineStar />
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium">الذكاء الاصطناعي يحلل أعمدة الملف...</p>
              <p className="text-xs text-muted-foreground">يتم مطابقة الأعمدة مع الحقول المعيارية</p>
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === "review" && currentSheet && (
            <div className="space-y-4">
              {/* Sheet selector */}
              {sheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">ورقة العمل:</span>
                  <div className="flex gap-1.5">
                    {sheets.map((s, i) => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setActiveSheet(i);
                          setExcludedRows(new Set());
                          // Re-map if switching sheets
                          setMappings(fallbackMapping(s.headers));
                        }}
                        className={cn(
                          "text-[11px] px-2.5 py-1 rounded-lg transition-colors",
                          i === activeSheet
                            ? "bg-primary/15 text-primary font-medium border border-primary/30"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {aiSummary && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AiInlineStar />
                    <span className="text-xs font-medium">ملخص التحليل</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-muted/20 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{previewItems.length}</div>
                  <div className="text-[10px] text-muted-foreground">أصل سيتم استيراده</div>
                </div>
                <div className="bg-muted/20 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{totalQty}</div>
                  <div className="text-[10px] text-muted-foreground">إجمالي الكميات</div>
                </div>
                <div className="bg-muted/20 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{categories.length}</div>
                  <div className="text-[10px] text-muted-foreground">تصنيف</div>
                </div>
                <div className="bg-muted/20 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground">
                    {totalValue > 0 ? totalValue.toLocaleString("en-US") : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    إجمالي القيمة {totalValue > 0 && <SarSymbol size={8} />}
                  </div>
                </div>
              </div>

              {/* Data quality warnings */}
              {(quality.empty_rows || quality.duplicate_rows || quality.incomplete_rows) ? (
                <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                    <AlertTriangle size={14} />
                    ملاحظات على جودة البيانات
                  </div>
                  {quality.empty_rows ? <p className="text-[11px] text-muted-foreground">• {quality.empty_rows} صف فارغ تم تجاهله</p> : null}
                  {quality.duplicate_rows ? <p className="text-[11px] text-muted-foreground">• {quality.duplicate_rows} صف مكرر تم دمجه</p> : null}
                  {quality.incomplete_rows ? <p className="text-[11px] text-muted-foreground">• {quality.incomplete_rows} صف ناقص البيانات</p> : null}
                </div>
              ) : null}

              {/* Column mappings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold">تعيين الأعمدة</h4>
                  <span className="text-[10px] text-muted-foreground">{mappings.filter((m) => m.mapped_field !== "unmapped").length} عمود معيّن</span>
                </div>
                <div className="border border-border/30 rounded-xl overflow-hidden divide-y divide-border/20">
                  {mappings.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-muted/20">
                      <span className="flex-1 min-w-0 truncate font-medium text-foreground" dir="auto">
                        {m.original_header}
                      </span>
                      <span className="text-muted-foreground mx-1">→</span>
                      {editingMapping === idx ? (
                        <select
                          value={m.mapped_field}
                          onChange={(e) => {
                            setMappings((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, mapped_field: e.target.value, confidence: "high" } : item
                              )
                            );
                            setEditingMapping(null);
                          }}
                          onBlur={() => setEditingMapping(null)}
                          autoFocus
                          className="text-[11px] bg-background border border-primary/30 rounded px-1.5 py-0.5 outline-none"
                        >
                          {Object.entries(STANDARD_FIELDS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingMapping(idx)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                            m.mapped_field === "unmapped"
                              ? "bg-muted/40 text-muted-foreground"
                              : m.confidence === "high"
                              ? "bg-success/10 text-success"
                              : m.confidence === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {STANDARD_FIELDS[m.mapped_field] || m.mapped_field}
                          <Edit3 size={9} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">معاينة البيانات ({previewItems.length} أصل)</h4>
                <div className="border border-border/30 rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-8"></th>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">الاسم</th>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">التصنيف</th>
                          <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">الكمية</th>
                          <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">الحالة</th>
                          <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">القيمة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {currentSheet.rows.slice(0, 50).map((_, rowIdx) => {
                          const item = previewItems.find((p) => p.id === `excel-${file ? "" : ""}` || p.detectionNote?.includes(`${rowIdx}`));
                          // Simpler: use ordered items
                          return null;
                        })}
                        {previewItems.slice(0, 50).map((item, i) => {
                          const rowIdx = parseInt(item.id.split("-").pop() || "0");
                          const isExcluded = excludedRows.has(rowIdx);
                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                "transition-colors",
                                isExcluded ? "opacity-40 bg-destructive/5 line-through" : "hover:bg-muted/10"
                              )}
                            >
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  onClick={() =>
                                    setExcludedRows((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(rowIdx)) next.delete(rowIdx);
                                      else next.add(rowIdx);
                                      return next;
                                    })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                  title={isExcluded ? "تضمين" : "استثناء"}
                                >
                                  {isExcluded ? <RefreshCw size={11} /> : <X size={11} />}
                                </button>
                              </td>
                              <td className="px-2 py-1.5 font-medium" dir="auto">{item.name}</td>
                              <td className="px-2 py-1.5 text-muted-foreground" dir="auto">{item.category}</td>
                              <td className="px-2 py-1.5 text-center">{item.qty}</td>
                              <td className="px-2 py-1.5" dir="auto">{item.condition}</td>
                              <td className="px-2 py-1.5 text-left" dir="ltr">
                                {item.unitPrice ? `${(item.unitPrice * item.qty).toLocaleString("en-US")}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {previewItems.length > 50 && (
                    <div className="text-center py-2 bg-muted/20 text-[10px] text-muted-foreground">
                      و {previewItems.length - 50} أصل إضافي...
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1"
                >
                  <Trash2 size={14} />
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={uploading || previewItems.length === 0}
                  className="flex-1 gradient-primary text-primary-foreground"
                >
                  {uploading ? (
                    <><Loader2 size={14} className="animate-spin" /> جاري الاستيراد...</>
                  ) : (
                    <><Check size={14} /> تأكيد استيراد {previewItems.length} أصل</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold">تم استيراد {importedCount} أصل بنجاح</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {categories.length > 0 && `${categories.length} تصنيف`}
                  {totalValue > 0 && ` · إجمالي القيمة ${totalValue.toLocaleString("en-US")} ر.س`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <FileSpreadsheet size={14} />
                استيراد ملف آخر
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
