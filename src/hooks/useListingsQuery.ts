import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Listing } from "./useListings";

export function usePublishedListingsQuery() {
  return useQuery<Listing[]>({
    queryKey: ["listings", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
      return (data || []) as unknown as Listing[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useMyListingsQuery() {
  const { user } = useAuthContext();
  return useQuery<Listing[]>({
    queryKey: ["listings", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
      return (data || []) as unknown as Listing[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useAllListingsQuery() {
  return useQuery<Listing[]>({
    queryKey: ["listings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
      return (data || []) as unknown as Listing[];
    },
    staleTime: 60 * 1000,
  });
}

export function useListingQuery(id: string | undefined) {
  return useQuery<Listing | null>({
    queryKey: ["listing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Listing | null;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}
