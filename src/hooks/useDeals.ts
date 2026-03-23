import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Deal {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  seller_id: string | null;
  status: string;
  deal_type: string | null;
  agreed_price: number | null;
  deal_details: any;
  locked: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface NegotiationMessage {
  id: string;
  deal_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  message_type: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

export function useDeals() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const getMyDeals = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("deals")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    return (data || []) as Deal[];
  }, [user]);

  const getAllDeals = useCallback(async () => {
    const { data } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as Deal[];
  }, []);

  const createDeal = useCallback(async (listingId: string, sellerId: string) => {
    if (!user) return { error: new Error("Not authenticated"), data: null };
    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
      .select()
      .single();
    setLoading(false);
    return { data: data as Deal | null, error };
  }, [user]);

  const getMessages = useCallback(async (dealId: string) => {
    const { data } = await supabase
      .from("negotiation_messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });
    return (data || []) as unknown as NegotiationMessage[];
  }, []);

  const sendMessage = useCallback(async (dealId: string, message: string, type = "text") => {
    if (!user) return null;
    const { data } = await supabase
      .from("negotiation_messages")
      .insert({ deal_id: dealId, sender_id: user.id, message, message_type: type } as any)
      .select()
      .single();
    return data as unknown as NegotiationMessage | null;
  }, [user]);

  return { getMyDeals, getAllDeals, createDeal, getMessages, sendMessage, loading };
}
