// ============================================================
// Arabic translations for DB enum values — single source of truth
// ============================================================

/** Deal type ID → Arabic label */
export const DEAL_TYPE_LABELS: Record<string, string> = {
  full_takeover: "تقبيل كامل",
  transfer_no_liabilities: "نقل أعمال بدون التزامات",
  business_transfer: "نقل أعمال",
  assets_setup: "أصول + تجهيز تشغيلي",
  assets_only: "أصول فقط",
  full: "تقبيل كامل",
  partial: "تقبيل جزئي",
};

/** Deal/listing status → Arabic label */
export const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  published: "منشور",
  pending: "قيد المراجعة",
  negotiating: "قيد التفاوض",
  completed: "مكتملة",
  finalized: "مُنجزة",
  cancelled: "ملغاة",
  rejected: "مرفوضة",
  expired: "منتهية",
  active: "نشطة",
  archived: "مؤرشفة",
};

/** Commission payment status → Arabic */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الدفع",
  paid: "مدفوعة",
  overdue: "متأخرة",
  verified: "تم التحقق",
  waived: "معفاة",
};

/** Sender type → Arabic */
export const SENDER_TYPE_LABELS: Record<string, string> = {
  buyer: "المشتري",
  seller: "البائع",
  system: "النظام",
  ai: "مقبل",
};

/** User role → Arabic */
export const ROLE_LABELS: Record<string, string> = {
  platform_owner: "مالك المنصة",
  supervisor: "مشرف",
  customer: "عميل",
  admin: "مدير",
};

/**
 * Translate any English DB value to Arabic.
 * Falls back to the original value if no translation exists.
 */
export function t(value: string | null | undefined, map?: Record<string, string>): string {
  if (!value) return "—";
  if (map && map[value]) return map[value];
  // Try all maps
  return (
    DEAL_TYPE_LABELS[value] ||
    STATUS_LABELS[value] ||
    PAYMENT_STATUS_LABELS[value] ||
    SENDER_TYPE_LABELS[value] ||
    ROLE_LABELS[value] ||
    value
  );
}
