import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FileCategory =
  | "equipment_photo"
  | "property_photo"
  | "invoice_document"
  | "legal_document"
  | "asset_list"
  | "rejected"
  | "unclassified";

export interface FileClassification {
  id: string;
  listing_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  ai_category: string;
  ai_subcategory: string | null;
  ai_confidence: string;
  ai_reasoning: string | null;
  final_category: string;
  final_subcategory: string | null;
  is_confirmed: boolean;
  classified_at: string;
  confirmed_at: string | null;
}

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  equipment_photo: "صور المعدات",
  property_photo: "صور المكان",
  invoice_document: "فواتير",
  legal_document: "وثائق قانونية",
  asset_list: "قوائم جرد",
  rejected: "مرفوضة",
  unclassified: "يحتاج تصنيف يدوي",
};

export const PROPERTY_SUBCATEGORIES = [
  { value: "interior", label: "صور داخلية" },
  { value: "exterior", label: "واجهة" },
  { value: "signage", label: "اللوحة / اللافتة" },
  { value: "building", label: "المبنى" },
  { value: "street", label: "الشارع المحيط" },
] as const;

export const LEGAL_SUBCATEGORIES = [
  { value: "commercial_register", label: "سجل تجاري" },
  { value: "lease_contract", label: "عقد إيجار" },
  { value: "municipality_license", label: "رخصة بلدية" },
  { value: "civil_defense", label: "رخصة دفاع مدني" },
  { value: "other", label: "أخرى" },
] as const;

export function useFileClassifications(listingId: string | null | undefined) {
  const [classifications, setClassifications] = useState<FileClassification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClassifications = useCallback(async () => {
    if (!listingId) {
      setClassifications([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("file_classifications")
      .select("*")
      .eq("listing_id", listingId)
      .order("classified_at", { ascending: true });
    if (err) {
      setError(err.message);
      toast.error("فشل تحميل التصنيفات");
    } else {
      setClassifications((data ?? []) as FileClassification[]);
    }
    setIsLoading(false);
  }, [listingId]);

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

  // Realtime subscription
  useEffect(() => {
    if (!listingId) return;
    const channel = supabase
      .channel(`file-classifications-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "file_classifications",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchClassifications();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, fetchClassifications]);

  const grouped = useMemo(() => {
    const map: Record<FileCategory, FileClassification[]> = {
      equipment_photo: [],
      property_photo: [],
      invoice_document: [],
      legal_document: [],
      asset_list: [],
      rejected: [],
      unclassified: [],
    };
    for (const c of classifications) {
      const key = (c.final_category || "unclassified") as FileCategory;
      if (map[key]) map[key].push(c);
      else map.unclassified.push(c);
    }
    return map;
  }, [classifications]);

  const counts = useMemo(() => {
    const out: Record<FileCategory, number> = {
      equipment_photo: 0,
      property_photo: 0,
      invoice_document: 0,
      legal_document: 0,
      asset_list: 0,
      rejected: 0,
      unclassified: 0,
    };
    for (const k of Object.keys(grouped) as FileCategory[]) {
      out[k] = grouped[k].length;
    }
    return out;
  }, [grouped]);

  const unconfirmedCount = useMemo(
    () => classifications.filter(c => !c.is_confirmed).length,
    [classifications],
  );

  const updateCategory = useCallback(
    async (id: string, newCategory: FileCategory, newSubcategory?: string | null) => {
      const { error: err } = await supabase
        .from("file_classifications")
        .update({
          final_category: newCategory,
          final_subcategory: newSubcategory ?? null,
        })
        .eq("id", id);
      if (err) {
        toast.error("فشل تحديث التصنيف");
        return false;
      }
      return true;
    },
    [],
  );

  const bulkMove = useCallback(
    async (ids: string[], newCategory: FileCategory) => {
      if (!ids.length) return false;
      const { error: err } = await supabase
        .from("file_classifications")
        .update({ final_category: newCategory, final_subcategory: null })
        .in("id", ids);
      if (err) {
        toast.error("فشل النقل الجماعي");
        return false;
      }
      toast.success(`تم نقل ${ids.length} ملف`);
      return true;
    },
    [],
  );

  const confirmAll = useCallback(async () => {
    if (!listingId) return false;
    const ids = classifications.filter(c => !c.is_confirmed).map(c => c.id);
    if (!ids.length) return true;
    const { error: err } = await supabase
      .from("file_classifications")
      .update({ is_confirmed: true })
      .in("id", ids);
    if (err) {
      toast.error("فشل تأكيد الملفات");
      return false;
    }
    toast.success(`تم تأكيد ${ids.length} ملف`);
    return true;
  }, [listingId, classifications]);

  const deleteFile = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from("file_classifications")
      .delete()
      .eq("id", id);
    if (err) {
      toast.error("فشل الحذف");
      return false;
    }
    toast.success("تم الحذف");
    return true;
  }, []);

  const deleteAll = useCallback(async () => {
    if (!listingId) return false;
    const { error: err } = await supabase
      .from("file_classifications")
      .delete()
      .eq("listing_id", listingId);
    if (err) {
      toast.error("فشل حذف التصنيفات");
      return false;
    }
    toast.success("تم حذف كل التصنيفات");
    return true;
  }, [listingId]);

  return {
    classifications,
    grouped,
    counts,
    unconfirmedCount,
    isLoading,
    error,
    refresh: fetchClassifications,
    updateCategory,
    bulkMove,
    confirmAll,
    deleteFile,
    deleteAll,
  };
}
