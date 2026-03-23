import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface LegalConfirmation {
  id: string;
  deal_id: string;
  user_id: string;
  party_role: string;
  confirmations: string[];
  deal_snapshot: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  confirmed_at: string;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  version: number;
}

const REQUIRED_CONFIRMATIONS = [
  "reviewed_details",
  "understand_included_excluded",
  "accept_responsibility",
  "platform_not_liable",
  "agree_to_proceed",
] as const;

// Seller-only: commission acknowledgment
const SELLER_CONFIRMATIONS = [
  ...REQUIRED_CONFIRMATIONS,
  "commission_acknowledged",
] as const;

export const CONFIRMATION_LABELS: Record<string, string> = {
  reviewed_details: "أؤكد أنني راجعت جميع تفاصيل الصفقة",
  understand_included_excluded: "أفهم ما هو مشمول وما هو مستبعد في هذه الصفقة",
  accept_responsibility: "أتحمل المسؤولية الكاملة عن قراري",
  platform_not_liable: "أفهم أن المنصة غير مسؤولة عن نتائج الصفقة",
  agree_to_proceed: "أوافق على المضي في هذه الصفقة",
  commission_acknowledged: "أقر بأنني مسؤول عن سداد عمولة المنصة (1%) بعد إتمام الصفقة",
};

export { SELLER_CONFIRMATIONS };

export function useLegalConfirmation() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const getConfirmations = useCallback(async (dealId: string) => {
    const { data } = await supabase
      .from("legal_confirmations")
      .select("*")
      .eq("deal_id", dealId)
      .is("invalidated_at", null)
      .order("confirmed_at", { ascending: false });
    return (data || []) as unknown as LegalConfirmation[];
  }, []);

  const hasUserConfirmed = useCallback(async (dealId: string) => {
    if (!user) return false;
    const { data } = await supabase
      .from("legal_confirmations")
      .select("id")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .is("invalidated_at", null)
      .limit(1);
    return (data?.length ?? 0) > 0;
  }, [user]);

  const submitConfirmation = useCallback(async (
    dealId: string,
    partyRole: "buyer" | "seller",
    confirmations: string[],
    dealSnapshot: Record<string, unknown>,
  ) => {
    if (!user) return { error: new Error("Not authenticated"), data: null };

    // Verify all required confirmations are checked
    const allChecked = REQUIRED_CONFIRMATIONS.every(c => confirmations.includes(c));
    if (!allChecked) return { error: new Error("All confirmations are required"), data: null };

    setLoading(true);

    // Get current version
    const { data: existing } = await supabase
      .from("legal_confirmations")
      .select("version")
      .eq("deal_id", dealId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = ((existing?.[0] as any)?.version || 0) + 1;

    const { data, error } = await supabase
      .from("legal_confirmations")
      .insert({
        deal_id: dealId,
        user_id: user.id,
        party_role: partyRole,
        confirmations: confirmations as any,
        deal_snapshot: dealSnapshot as any,
        ip_address: null, // captured server-side ideally
        user_agent: navigator.userAgent,
        version: nextVersion,
      } as any)
      .select()
      .single();

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "legal_confirmation_submitted",
      resource_type: "deal",
      resource_id: dealId,
      user_id: user.id,
      details: { party_role: partyRole, version: nextVersion } as any,
      user_agent: navigator.userAgent,
    });

    setLoading(false);
    return { data: data as unknown as LegalConfirmation | null, error };
  }, [user]);

  return {
    getConfirmations,
    hasUserConfirmed,
    submitConfirmation,
    loading,
    REQUIRED_CONFIRMATIONS,
  };
}
