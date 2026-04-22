import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface AccessRequestRecord {
  id: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  status: "pending" | "approved" | "rejected" | "expired" | string;
  request_message: string | null;
  rejection_reason: string | null;
  access_expires_at: string | null;
  created_at: string;
  decided_at: string | null;
  // Enriched
  listing_title?: string | null;
  listing_price?: number | null;
  listing_city?: string | null;
  requester_name?: string | null;
  requester_avatar?: string | null;
}

/**
 * Manages access requests for listings owned by the current user (seller view).
 * Provides Realtime updates + approve/reject mutations.
 */
export function useAccessRequests() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ["seller-access-requests", user?.id];

  const { data, isLoading, error } = useQuery<AccessRequestRecord[]>({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from("document_access_requests")
        .select(
          "id, listing_id, requester_id, owner_id, status, request_message, rejection_reason, access_expires_at, created_at, decided_at",
        )
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (err) throw err;
      const list = (rows ?? []) as AccessRequestRecord[];
      if (list.length === 0) return [];

      // Enrich with listing + requester profile
      const listingIds = Array.from(new Set(list.map((r) => r.listing_id)));
      const requesterIds = Array.from(new Set(list.map((r) => r.requester_id)));

      const [listingsRes, profilesRes] = await Promise.all([
        supabase.from("listings").select("id, title, price, city").in("id", listingIds),
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", requesterIds),
      ]);

      const lMap = new Map((listingsRes.data ?? []).map((l: any) => [l.id, l]));
      const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

      return list.map((r) => ({
        ...r,
        listing_title: lMap.get(r.listing_id)?.title ?? null,
        listing_price: lMap.get(r.listing_id)?.price ?? null,
        listing_city: lMap.get(r.listing_id)?.city ?? null,
        requester_name: pMap.get(r.requester_id)?.full_name ?? null,
        requester_avatar: pMap.get(r.requester_id)?.avatar_url ?? null,
      }));
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`seller-access-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_access_requests",
          filter: `owner_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error: err } = await supabase
        .from("document_access_requests")
        .update({
          status: "approved",
          decided_at: new Date().toISOString(),
          decided_by: user!.id,
        } as any)
        .eq("id", requestId)
        .eq("owner_id", user!.id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { error: err } = await supabase
        .from("document_access_requests")
        .update({
          status: "rejected",
          rejection_reason: reason?.trim() || null,
          decided_at: new Date().toISOString(),
          decided_by: user!.id,
        } as any)
        .eq("id", requestId)
        .eq("owner_id", user!.id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const requests = data ?? [];
  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected" || r.status === "expired");

  return {
    requests,
    pending,
    approved,
    rejected,
    pendingCount: pending.length,
    isLoading,
    error,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
