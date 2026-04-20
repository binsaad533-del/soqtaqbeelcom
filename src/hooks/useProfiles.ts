import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_suspended: boolean;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
  trust_score: number;
  verification_level: string;
  kyc_data: any;
  completed_deals: number;
  cancelled_deals: number;
  disputes_count: number;
}

export function useProfiles() {
  const getAllProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as Profile[];
  }, []);

  /**
   * Fetch a profile.
   * - Self / admin / supervisor / financial_manager: returns full row (RLS-allowed).
   * - Anyone else: falls back automatically to the public-safe RPC (no email/phone).
   * Counterparty contact info MUST be fetched via getCounterpartySafe / getCounterpartyLegal.
   */
  const getProfile = useCallback(async (userId: string) => {
    const direct = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (direct.data) return direct.data as Profile;

    // Fallback: public-safe view via RPC (no PII)
    const { data: pub } = await supabase.rpc("get_public_profile_v2", {
      target_user_id: userId,
    });
    const row = (pub as any[] | null)?.[0];
    if (!row) return null;
    return {
      id: row.user_id,
      user_id: row.user_id,
      full_name: row.full_name,
      phone: null,
      email: null,
      city: row.city,
      avatar_url: row.avatar_url,
      is_verified: row.is_verified,
      is_active: true,
      is_suspended: false,
      last_activity: null,
      created_at: row.member_since,
      updated_at: row.member_since,
      trust_score: row.trust_score,
      verification_level: row.verification_level,
      kyc_data: null,
      completed_deals: row.completed_deals,
      cancelled_deals: row.cancelled_deals,
      disputes_count: 0,
    } as Profile;
  }, []);

  /**
   * Counterparty profile with masked phone (****1234).
   * Requires an existing deal between current user and target.
   */
  const getCounterpartySafe = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc("get_counterparty_profile_safe", {
      target_user_id: userId,
    });
    if (error) {
      console.error("[getCounterpartySafe]", error);
      return null;
    }
    return ((data as any[] | null)?.[0]) ?? null;
  }, []);

  /**
   * Counterparty profile with FULL phone — for legal documents/PDFs only.
   * Requires: viewer is party + counterparty signed legal_confirmation + deal active.
   * Every call (success or failure) is audit-logged server-side.
   */
  const getCounterpartyLegal = useCallback(async (userId: string, dealId: string) => {
    const { data, error } = await supabase.rpc("get_counterparty_profile_legal", {
      target_user_id: userId,
      target_deal_id: dealId,
    });
    if (error) {
      console.error("[getCounterpartyLegal]", error);
      return null;
    }
    return ((data as any[] | null)?.[0]) ?? null;
  }, []);

  const updateProfile = useCallback(async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();
    return { data: data as Profile | null, error };
  }, []);

  const getAllRoles = useCallback(async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }, []);

  return { getAllProfiles, getProfile, getCounterpartySafe, getCounterpartyLegal, updateProfile, getAllRoles };
}
