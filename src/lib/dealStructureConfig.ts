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
    label: "تقبّل كامل",
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
    label: "نقل أعمال بدون التزامات سابقة",
    desc: "نقل أعمال تشغيلية بعد تصفية الالتزامات السابقة من جانب البائع",
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
    label: "أصول + تجهيز تشغيلي (بدون سجل تجاري)",
    desc: "تجهيز تشغيلي جاهز بدون نقل الكيان القانوني",
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
    label: "أصول فقط",
    desc: "بيع الأصول المادية فقط بدون نقل النشاط",
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
  {
    id: "cr_only",
    label: "سجل تجاري فقط",
    desc: "نقل الكيان القانوني فقط",
    includes: [
      "السجل التجاري",
      "الأنشطة المسجلة",
    ],
    excludes: [
      "الأصول",
      "العمليات التشغيلية",
      "الموقع",
    ],
    mandatoryDisclosures: [
      "حالة السجل التجاري",
      "الأنشطة المسجلة",
      "الالتزامات المرتبطة بالسجل",
      "المشكلات القانونية أو الحكومية إن وجدت",
      "الضرائب / الزكاة / المستحقات",
    ],
    requiredDocuments: [
      "ملف السجل التجاري",
      "تفاصيل الأنشطة",
      "إقرار الالتزامات",
    ],
    cautionNotes: [
      "يجب الإفصاح عن جميع الالتزامات والمستحقات المرتبطة",
      "قد تكون هناك التزامات حكومية مخفية",
    ],
  },
  {
    id: "location_only",
    label: "موقع فقط (نقل إيجار)",
    desc: "نقل الموقع فقط",
    includes: [
      "الموقع",
      "عقد الإيجار (بموافقة المؤجر)",
    ],
    excludes: [
      "النشاط التجاري",
      "السجل التجاري",
      "الأصول",
    ],
    mandatoryDisclosures: [
      "تفاصيل عقد الإيجار",
      "حالة موافقة المؤجر",
      "مبلغ الإيجار",
      "المدة المتبقية من العقد",
      "أي قيود على الموقع",
    ],
    requiredDocuments: [
      "عقد الإيجار",
      "موافقة المؤجر إن توفرت",
      "تفاصيل الدفع والمدة",
    ],
    cautionNotes: [
      "يتطلب موافقة المؤجر على النقل",
      "قد يختلف الإيجار الجديد عن الحالي",
    ],
  },
];

// Map of deal type IDs for quick lookup
export const DEAL_TYPE_MAP = Object.fromEntries(DEAL_TYPES.map(dt => [dt.id, dt]));

// Conflicting combinations that must be warned about
export interface ConflictRule {
  types: [string, string];
  message: string;
  severity: "warning" | "critical";
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    types: ["full_takeover", "assets_only"],
    message: "التقبّل الكامل يشمل الأصول بالفعل — اختيار «أصول فقط» كبديل قد يسبب التباساً. تأكد من التمييز الواضح بين الخيارين.",
    severity: "warning",
  },
  {
    types: ["cr_only", "full_takeover"],
    message: "لا يمكن تقديم «سجل تجاري فقط» كبديل لـ «تقبّل كامل» — الفرق جوهري في نطاق الصفقة.",
    severity: "warning",
  },
  {
    types: ["location_only", "full_takeover"],
    message: "«موقع فقط» لا يتوافق مع «تقبّل كامل» كخيارات متزامنة بدون توضيح واضح.",
    severity: "warning",
  },
  {
    types: ["location_only", "transfer_no_liabilities"],
    message: "«موقع فقط» يختلف جوهرياً عن «نقل أعمال» — تأكد من التمييز.",
    severity: "warning",
  },
  {
    types: ["cr_only", "assets_only"],
    message: "«سجل تجاري فقط» و«أصول فقط» خيارات مختلفة تماماً — تأكد أن البائع يفهم الفرق.",
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
