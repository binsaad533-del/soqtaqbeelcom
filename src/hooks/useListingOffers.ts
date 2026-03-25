import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface ListingOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offered_price: number;
  message: string | null;
  status: string;
  seller_response: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffersSummary {
  total_offers: number;
  highest_offer: number;
  lowest_offer: number;
  latest_at: string | null;
}

export function useListingOffers() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const submitOffer = useCallback(async (listingId: string, price: number, message?: string) => {
    if (!user) return { error: "يجب تسجيل الدخول" };
    setLoading(true);
    const { data, error } = await supabase
      .from("listing_offers" as any)
      .insert({ listing_id: listingId, buyer_id: user.id, offered_price: price, message: message || null } as any)
      .select()
      .single();
    setLoading(false);
    return { data, error };
  }, [user]);

  const getOffersSummary = useCallback(async (listingId: string): Promise<OffersSummary> => {
    const { data, error } = await supabase.rpc("get_listing_offers_summary" as any, { _listing_id: listingId });
    if (error || !data) return { total_offers: 0, highest_offer: 0, lowest_offer: 0, latest_at: null };
    return data as any as OffersSummary;
  }, []);

  const getSellerOffers = useCallback(async (listingId: string): Promise<ListingOffer[]> => {
    const { data } = await supabase
      .from("listing_offers" as any)
      .select("*")
      .eq("listing_id", listingId)
      .order("offered_price", { ascending: false });
    return (data || []) as any as ListingOffer[];
  }, []);

  const getMyOffer = useCallback(async (listingId: string): Promise<ListingOffer | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from("listing_offers" as any)
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    return (data as any)?.[0] || null;
  }, [user]);

  const respondToOffer = useCallback(async (offerId: string, status: "accepted" | "rejected", response?: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("listing_offers" as any)
      .update({ status, seller_response: response || null } as any)
      .eq("id", offerId);
    setLoading(false);
    return { error };
  }, []);

  return { submitOffer, getOffersSummary, getSellerOffers, getMyOffer, respondToOffer, loading };
}
