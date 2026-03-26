import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./useProfiles";

export function useAllProfilesQuery() {
  return useQuery<Profile[]>({
    queryKey: ["profiles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      if (error) throw new Error(`فشل تحميل الملفات الشخصية: ${error.message}`);
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
      if (error) throw error;
      return data as unknown as Profile | null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
