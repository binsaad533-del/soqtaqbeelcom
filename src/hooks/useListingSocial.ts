import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Fetch aggregated likes & views for a list of listing IDs in one go */
export function useListingSocial() {
  const getLikesAndViews = useCallback(async (listingIds: string[]) => {
    if (!listingIds.length) return { likes: {}, views: {}, userLikes: new Set<string>() };

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all likes for these listings
    const { data: likesData } = await supabase
      .from("listing_likes")
      .select("listing_id, user_id")
      .in("listing_id", listingIds);

    // Fetch view counts
    const { data: viewsData } = await supabase
      .from("listing_views")
      .select("listing_id")
      .in("listing_id", listingIds);

    const likes: Record<string, number> = {};
    const userLikes = new Set<string>();

    (likesData || []).forEach((l: any) => {
      likes[l.listing_id] = (likes[l.listing_id] || 0) + 1;
      if (user && l.user_id === user.id) userLikes.add(l.listing_id);
    });

    const views: Record<string, number> = {};
    (viewsData || []).forEach((v: any) => {
      views[v.listing_id] = (views[v.listing_id] || 0) + 1;
    });

    return { likes, views, userLikes };
  }, []);

  const toggleLike = useCallback(async (listingId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if already liked
    const { data: existing } = await supabase
      .from("listing_likes")
      .select("id")
      .eq("listing_id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("listing_likes").delete().eq("id", existing.id);
      return false; // unliked
    } else {
      await supabase.from("listing_likes").insert({
        listing_id: listingId,
        user_id: user.id,
      });
      return true; // liked
    }
  }, []);

  const recordView = useCallback(async (listingId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const sessionId = sessionStorage.getItem("view_session") || crypto.randomUUID();
    sessionStorage.setItem("view_session", sessionId);

    await supabase.from("listing_views").insert({
      listing_id: listingId,
      user_id: user?.id || null,
      session_id: sessionId,
    });
  }, []);

  return { getLikesAndViews, toggleLike, recordView };
}
