import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./useProfiles";

/**
 * Public profile data — safe for everyone (anonymous + authenticated).
 * Never contains email, phone, or any direct contact info.
 */
export interface PublicProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  trust_score: number;
  is_verified: boolean;
  verification_level: string;
  completed_deals: number;
  cancelled_deals: number;
  member_since: string;
}

/** Fetch a single public profile via the secure RPC. */
export function usePublicProfileQuery(userId: string | undefined) {
  return useQuery<PublicProfile | null>({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("get_public_profile_v2", {
        target_user_id: userId,
      });
      if (error) {
        console.error("[usePublicProfileQuery]", error);
        return null;
      }
      return ((data as PublicProfile[] | null)?.[0]) ?? null;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllProfilesQuery() {
  return useQuery<Profile[]>({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      if (error) {
        console.error("[useAllProfilesQuery]", error);
        return [];
      }
      return (data || []) as unknown as Profile[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProfileQuery(userId: string | undefined) {
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[useProfileQuery]", error);
        return null;
      }
      return data as unknown as Profile | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
