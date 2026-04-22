import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export type AccessStatus =
  | "owner"
  | "guest"
  | "no_request"
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface AccessRequestRow {
  id: string;
  status: string;
  request_message: string | null;
  rejection_reason: string | null;
  access_expires_at: string | null;
  created_at: string;
  decided_at: string | null;
}

interface UseDocumentAccessArgs {
  listingId: string | null | undefined;
  ownerId: string | null | undefined;
}

/**
 * Manages a buyer's document access state for a single listing.
 * Returns the latest request row + helpers for requesting access and
 * generating signed URLs lazily on download.
 */
export function useDocumentAccess({ listingId, ownerId }: UseDocumentAccessArgs) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const isOwner = !!user && !!ownerId && user.id === ownerId;
  const isGuest = !user;
  const enabled = !!listingId && !!user && !isOwner;

  const queryKey = ["document-access-request", listingId, user?.id];

  const { data: accessRequest, isLoading } = useQuery<AccessRequestRow | null>({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_access_requests")
        .select("id, status, request_message, rejection_reason, access_expires_at, created_at, decided_at")
        .eq("listing_id", listingId!)
        .eq("requester_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AccessRequestRow | null) ?? null;
    },
  });

  // ── Realtime: refresh on any change to this user's requests for this listing ──
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`access-req-${listingId}-${user!.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_access_requests",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, listingId, user, queryClient, queryKey]);

  // ── Compute high-level status ───────────────────────────────
  let status: AccessStatus;
  if (isOwner) status = "owner";
  else if (isGuest) status = "guest";
  else if (!accessRequest) status = "no_request";
  else if (accessRequest.status === "approved") {
    const expiresAt = accessRequest.access_expires_at
      ? new Date(accessRequest.access_expires_at).getTime()
      : null;
    status = expiresAt && expiresAt < Date.now() ? "expired" : "approved";
  } else if (accessRequest.status === "pending") status = "pending";
  else if (accessRequest.status === "rejected") status = "rejected";
  else status = "no_request";

  // ── Mutations ───────────────────────────────────────────────
  const requestAccessMutation = useMutation({
    mutationFn: async (message?: string) => {
      const { data, error } = await supabase.functions.invoke(
        "request-document-access",
        { body: { listing_id: listingId, message: message?.trim() || undefined } },
      );
      if (error) {
        // Try to surface the function's response body
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          try {
            const body = await ctx.clone().json();
            const err = new Error(body.error || error.message) as Error & { code?: number };
            err.code = ctx.status;
            throw err;
          } catch {
            throw error;
          }
        }
        throw error;
      }
      return data as {
        status: "auto_approved" | "pending" | "already_approved" | "already_pending";
        request_id: string;
        message: string;
        access_expires_at?: string | null;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const getSignedUrl = async (fileClassificationId: string) => {
    const { data, error } = await supabase.functions.invoke(
      "get-protected-document-url",
      { body: { file_classification_id: fileClassificationId } },
    );
    if (error) {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        try {
          const body = await ctx.clone().json();
          throw new Error(body.error || error.message);
        } catch {
          throw error;
        }
      }
      throw error;
    }
    return data as {
      url: string;
      expires_at?: string;
      document_name: string;
      source: "signed" | "public" | "raw";
      security_notice?: string;
      access_reason?: string;
    };
  };

  return {
    accessRequest: accessRequest ?? null,
    status,
    isLoading,
    isOwner,
    isGuest,
    requestAccess: requestAccessMutation.mutateAsync,
    isRequesting: requestAccessMutation.isPending,
    getSignedUrl,
  };
}
