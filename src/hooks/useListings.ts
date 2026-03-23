import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Listing {
  id: string;
  owner_id: string;
  title: string | null;
  description: string | null;
  deal_type: string;
  business_activity: string | null;
  category: string | null;
  city: string | null;
  district: string | null;
  price: number | null;
  annual_rent: number | null;
  lease_duration: string | null;
  lease_paid_period: string | null;
  lease_remaining: string | null;
  liabilities: string | null;
  overdue_salaries: string | null;
  overdue_rent: string | null;
  municipality_license: string | null;
  civil_defense_license: string | null;
  surveillance_cameras: string | null;
  disclosure_score: number | null;
  ai_summary: string | null;
  ai_rating: string | null;
  status: string;
  inventory: any[];
  photos: Record<string, string[]>;
  documents: any[];
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deal_options: any[];
  deal_disclosures: Record<string, any>;
  required_documents: any[];
  primary_deal_type: string | null;
  ai_structure_validation: any | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export function useListings() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const createListing = useCallback(async (data: Partial<Listing>) => {
    if (!user) return { error: new Error("Not authenticated"), data: null };
    setLoading(true);
    const { data: listing, error } = await supabase
      .from("listings")
      .insert({ ...data, owner_id: user.id } as any)
      .select()
      .single();
    setLoading(false);
    return { data: listing, error };
  }, [user]);

  const updateListing = useCallback(async (id: string, data: Partial<Listing>) => {
    setLoading(true);
    const { data: listing, error } = await supabase
      .from("listings")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();
    setLoading(false);
    return { data: listing, error };
  }, []);

  const getMyListings = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    return (data || []) as unknown as Listing[];
  }, [user]);

  const getPublishedListings = useCallback(async () => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    return (data || []) as unknown as Listing[];
  }, []);

  const getAllListings = useCallback(async () => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    return (data || []) as unknown as Listing[];
  }, []);

  const getListing = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();
    return data as unknown as Listing | null;
  }, []);

  const uploadFile = useCallback(async (listingId: string, file: File, folder: string) => {
    if (!user) return null;
    const path = `${user.id}/${listingId}/${folder}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("listings")
      .upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from("listings").getPublicUrl(data.path);
    return urlData.publicUrl;
  }, [user]);

  return { createListing, updateListing, getMyListings, getPublishedListings, getAllListings, getListing, uploadFile, loading };
}
