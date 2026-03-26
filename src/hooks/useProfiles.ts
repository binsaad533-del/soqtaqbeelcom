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

  const getProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    return data as Profile | null;
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

  return { getAllProfiles, getProfile, updateProfile, getAllRoles };
}
