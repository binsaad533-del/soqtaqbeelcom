import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFraudEngine() {
  const checkListing = useCallback(async (listingId: string) => {
    const { data } = await supabase.functions.invoke("detect-incidents", {
      body: { event_type: "listing_check", payload: { listing_id: listingId } },
    });
    return data;
  }, []);

  const checkListingFraud = useCallback(async (listingId: string) => {
    const { data } = await supabase.functions.invoke("check-listing-fraud", {
      body: { listing_id: listingId },
    });
    return data;
  }, []);

  const checkDuplicates = useCallback(async (listingId: string) => {
    const { data } = await supabase.functions.invoke("detect-incidents", {
      body: { event_type: "duplicate_check", payload: { listing_id: listingId } },
    });
    return data;
  }, []);

  const calculateDealRisk = useCallback(async (dealId: string) => {
    const { data } = await supabase.functions.invoke("detect-incidents", {
      body: { event_type: "calculate_deal_risk", payload: { deal_id: dealId } },
    });
    return data;
  }, []);

  const monitorChat = useCallback(async (dealId: string, message: string, senderId: string) => {
    const { data } = await supabase.functions.invoke("detect-incidents", {
      body: { event_type: "chat_monitor", payload: { deal_id: dealId, message, sender_id: senderId } },
    });
    return data;
  }, []);

  const checkRapidListings = useCallback(async (userId: string) => {
    const { data } = await supabase.functions.invoke("detect-incidents", {
      body: { event_type: "rapid_listing_check", payload: { user_id: userId } },
    });
    return data;
  }, []);

  return { checkListing, checkListingFraud, checkDuplicates, calculateDealRisk, monitorChat, checkRapidListings };
}
