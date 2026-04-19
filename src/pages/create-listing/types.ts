export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  condition: string;
  category: string;
  included: boolean;
  confidence: "high" | "medium" | "low";
  detectionNote: string;
  photoIndices: number[];
  isSameAssetMultipleAngles: boolean;
  userConfirmed: boolean;
  unitPrice?: number | null;
}

export type InventoryPricingMode = "per_item" | "bulk";

export interface DedupAction {
  description: string;
  merged_count: number;
}

export interface CrExtractionResult {
  is_valid_cr?: boolean;
  document_type_detected?: string;
  rejection_reason?: string;
  cr_number?: string;
  entity_name?: string;
  business_activity?: string;
  secondary_activities?: string[];
  city?: string;
  district?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  entity_type?: string;
  owner_name?: string;
  extraction_confidence?: "high" | "medium" | "low";
  extraction_notes?: string;
  fields_confidence?: Record<string, string>;
}

export interface DisclosureState {
  business_activity: string;
  city: string;
  district: string;
  price: string;
  annual_rent: string;
  lease_duration: string;
  lease_paid_period: string;
  lease_remaining: string;
  liabilities: string;
  overdue_salaries: string;
  overdue_rent: string;
  municipality_license: string;
  civil_defense_license: string;
  surveillance_cameras: string;
}

export const initialDisclosure: DisclosureState = {
  business_activity: "",
  city: "",
  district: "",
  price: "",
  annual_rent: "",
  lease_duration: "",
  lease_paid_period: "",
  lease_remaining: "",
  liabilities: "",
  overdue_salaries: "",
  overdue_rent: "",
  municipality_license: "",
  civil_defense_license: "",
  surveillance_cameras: "",
};

export const STEPS = [
  { label: "هيكل الصفقة", icon: "Shield", hint: "اختر نوع الصفقة — والباقي على الـAI ✦" },
  { label: "الصور والمستندات", icon: "Camera", hint: "ارفع الصور والمستندات فقط — الـAI ✦ يتكفّل بالباقي" },
  { label: "التحليل الذكي", icon: "Eye", hint: "الـAI ✦ يحلل ويجرد تلقائياً — فقط راجع وأكّد" },
  { label: "الإفصاح والنشر", icon: "Check", hint: "أكمل البيانات وانشر بضغطة واحدة" },
] as const;

export const ALL_PHOTO_GROUPS = [
  { id: "interior", label: "صور داخلية للمحل", min: 3, icon: "Camera", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] },
  { id: "exterior", label: "واجهة المحل", min: 2, icon: "DoorOpen", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup"] },
  { id: "building", label: "المبنى", min: 1, icon: "Building2", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "street", label: "الشارع المحيط", min: 1, icon: "MapPin", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "signage", label: "اللوحة / اللافتة", min: 1, icon: "Tag", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "equipment", label: "المعدات والأجهزة", min: 4, icon: "Wrench", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] },
] as const;
