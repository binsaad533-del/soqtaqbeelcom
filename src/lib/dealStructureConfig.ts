// ============================================================
// Deal Structure Configuration — single source of truth
// ============================================================

export interface DealTypeConfig {
  id: string;
  label: string;
  desc: string;
  includes: string[];
  excludes: string[];
  mandatoryDisclosures: string[];
  requiredDocuments: string[];
  cautionNotes: string[];
}

export const DEAL_TYPES: DealTypeConfig[] = [
  {
    id: "full_takeover",
    label: "تقبيل كامل",
    desc: "نقل الأعمال بالكامل بما تملكه وما عليها من التزامات",
    includes: [
      "السجل التجاري",
      "الاسم التجاري",
      "العلامة التجارية",
      "الأصول والمعدات",
      "عقد الإيجار",
      "المخزون",
      "الحقوق التشغيلية",
      "الديون والالتزامات تجاه الغير",
    ],
    excludes: [],
    mandatoryDisclosures: [
      "جميع الديون",
      "جميع الالتزامات المالية",
      "التزامات الإيجار",
      "الرواتب والتزامات العمالة",
      "التزامات الموردين",
      "العقود السارية",
      "النزاعات القانونية إن وجدت",
      "الضرائب / الزكاة / المستحقات الحكومية",
      "ملكية الاسم التجاري / العلامة التجارية",
    ],
    requiredDocuments: [
      "السجل التجاري",
      "عقد الإيجار",
      "إفصاح الالتزامات",
      "قائمة الأصول",
      "التراخيص ذات الصلة",
    ],
    cautionNotes: [
      "يتحمل المشتري جميع الالتزامات السابقة",
      "يجب التحقق من النزاعات القانونية القائمة",
    ],
  },
  {
    id: "transfer_no_liabilities",
    label: "تقبيل نقل أعمال بدون التزامات سابقة",
    desc: "تقبيل نقل أعمال تشغيلية بعد تصفية الالتزامات السابقة من جانب البائع",
    includes: [
      "السجل التجاري",
      "الاسم التجاري",
      "العلامة التجارية",
      "الأصول والمعدات",
      "عقد الإيجار (بموافقة المؤجر)",
      "المخزون",
      "الحقوق التشغيلية",
    ],
    excludes: [
      "الديون السابقة",
      "الالتزامات السابقة",
    ],
    mandatoryDisclosures: [
      "إقرار البائع بتصفية الالتزامات السابقة",
      "تفاصيل الإيجار",
      "تفاصيل الحقوق التشغيلية",
      "تفاصيل نقل العمالة إن وجد",
      "تأكيد عدم تحمّل المشتري للالتزامات السابقة",
    ],
    requiredDocuments: [
      "السجل التجاري",
      "عقد الإيجار",
      "إقرار البائع بشأن الالتزامات",
      "قائمة الأصول",
    ],
    cautionNotes: [
      "يجب التأكد من موافقة المؤجر على نقل العقد",
      "يجب التحقق من تصفية الالتزامات فعلياً",
    ],
  },
  {
    id: "assets_setup",
    label: "تقبيل أصول + تجهيز تشغيلي (بدون سجل تجاري)",
    desc: "تقبيل تجهيز تشغيلي جاهز بدون نقل الكيان القانوني",
    includes: [
      "الأصول والمعدات",
      "التجهيزات والديكور",
      "المخزون",
      "الموقع (عبر نقل الإيجار أو عقد جديد)",
    ],
    excludes: [
      "السجل التجاري",
      "الاسم التجاري",
      "العلامة التجارية",
      "الالتزامات القانونية السابقة",
    ],
    mandatoryDisclosures: [
      "قائمة الأصول",
      "حالة المعدات",
      "ملخص المخزون",
      "تفاصيل ترتيب الموقع",
      "توضيح عدم شمول السجل التجاري",
      "توضيح عدم شمول الالتزامات السابقة",
    ],
    requiredDocuments: [
      "قائمة الأصول",
      "صور المعدات",
      "تفاصيل الإيجار أو إثبات الموقع",
    ],
    cautionNotes: [
      "يحتاج المشتري لاستخراج سجل تجاري جديد",
      "لا تشمل أي حقوق قانونية للنشاط السابق",
    ],
  },
  {
    id: "assets_only",
    label: "تقبيل أصول فقط",
    desc: "تقبيل بيع الأصول المادية فقط بدون نقل النشاط",
    includes: [
      "المعدات",
      "الأثاث",
      "التجهيزات",
      "المخزون",
    ],
    excludes: [
      "النشاط التجاري",
      "السجل التجاري",
      "الاسم التجاري",
      "الموقع",
      "الالتزامات",
    ],
    mandatoryDisclosures: [
      "قائمة تفصيلية بالأصول",
      "حالة كل أصل",
      "تأكيد الملكية",
      "الكمية حيثما ينطبق",
      "توضيح عدم شمول نقل النشاط",
    ],
    requiredDocuments: [
      "قائمة الأصول",
      "صور المعدات",
      "إثبات ملكية عند الحاجة",
    ],
    cautionNotes: [
      "لا يشمل أي حق في الموقع أو النشاط",
      "المشتري مسؤول عن النقل والتشغيل",
    ],
  },
];

// Map of deal type IDs for quick lookup
export const DEAL_TYPE_MAP: Record<string, DealTypeConfig> = Object.fromEntries(DEAL_TYPES.map(dt => [dt.id, dt]));

// Aliases so DB values like "full_transfer" / "assets_operating" resolve too
DEAL_TYPE_MAP["full_transfer"] ??= DEAL_TYPE_MAP["full_takeover"];
DEAL_TYPE_MAP["assets_operating"] ??= DEAL_TYPE_MAP["assets_setup"];
DEAL_TYPE_MAP["full"] ??= DEAL_TYPE_MAP["full_takeover"];

// Conflicting combinations that must be warned about
export interface ConflictRule {
  types: [string, string];
  message: string;
  severity: "warning" | "critical";
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    types: ["full_takeover", "transfer_no_liabilities"],
    message: "التقبيل الكامل يشمل الالتزامات، بينما «نقل بدون التزامات» يستثنيها — لا يمكن الجمع بينهما. اختر واحداً فقط.",
    severity: "critical",
  },
  {
    types: ["full_takeover", "assets_only"],
    message: "التقبيل الكامل يشمل الأصول بالفعل — اختيار «أصول فقط» كبديل قد يسبب التباساً. تأكد من التمييز الواضح بين الخيارين.",
    severity: "warning",
  },
  {
    types: ["full_takeover", "assets_setup"],
    message: "التقبيل الكامل يشمل الأصول والتجهيز بالفعل — إضافة «أصول + تجهيز» كبديل قد يربك المشتري.",
    severity: "warning",
  },
  {
    types: ["assets_setup", "assets_only"],
    message: "«أصول + تجهيز تشغيلي» يشمل الأصول بالفعل — إضافة «أصول فقط» قد تكون مكررة. تأكد أن هناك فرق واضح بين العرضين.",
    severity: "warning",
  },
];

export function detectConflicts(selectedTypes: string[]): ConflictRule[] {
  if (selectedTypes.length < 2) return [];
  const conflicts: ConflictRule[] = [];
  for (const rule of CONFLICT_RULES) {
    if (selectedTypes.includes(rule.types[0]) && selectedTypes.includes(rule.types[1])) {
      conflicts.push(rule);
    }
  }
  return conflicts;
}

export function getRequiredDisclosures(selectedTypes: string[]): string[] {
  const set = new Set<string>();
  for (const typeId of selectedTypes) {
    const config = DEAL_TYPE_MAP[typeId];
    if (config) config.mandatoryDisclosures.forEach(d => set.add(d));
  }
  return Array.from(set);
}

export function getRequiredDocuments(selectedTypes: string[]): string[] {
  const set = new Set<string>();
  for (const typeId of selectedTypes) {
    const config = DEAL_TYPE_MAP[typeId];
    if (config) config.requiredDocuments.forEach(d => set.add(d));
  }
  return Array.from(set);
}
