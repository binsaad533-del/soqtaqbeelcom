import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellerReview {
  id: string;
  deal_id: string;
  reviewer_id: string;
  seller_id: string;
  listing_accuracy: number;
  honesty: number;
  responsiveness: number;
  overall_experience: number;
  comment: string | null;
  created_at: string;
}

export function useSellerReviews() {
  const getSellerReviews = useCallback(async (sellerId: string): Promise<SellerReview[]> => {
    const { data } = await supabase
      .from("seller_reviews" as any)
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    return (data || []) as unknown as SellerReview[];
  }, []);

  const getReviewForDeal = useCallback(async (dealId: string, reviewerId: string): Promise<SellerReview | null> => {
    const { data } = await supabase
      .from("seller_reviews" as any)
      .select("*")
      .eq("deal_id", dealId)
      .eq("reviewer_id", reviewerId)
      .maybeSingle();
    return data as unknown as SellerReview | null;
  }, []);

  return { getSellerReviews, getReviewForDeal };
}
