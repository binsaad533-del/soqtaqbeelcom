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
  location_lat: number | null;
  location_lng: number | null;
  fraud_flags: any[];
  fraud_score: number | null;
  area_sqm: number | null;
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

  const getMyDraft = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as unknown as Listing | null;
  }, [user]);

  const getMyListings = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useListings] getMyListings failed:", { userId: user.id, error: error.message, code: error.code });
      throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
    }
    return (data || []) as unknown as Listing[];
  }, [user]);

  const getPublishedListings = useCallback(async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useListings] getPublishedListings failed:", { error: error.message, code: error.code });
      throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
    }
    return (data || []) as unknown as Listing[];
  }, []);

  const getAllListings = useCallback(async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useListings] getAllListings failed:", { error: error.message, code: error.code });
      throw new Error(`فشل تحميل الإعلانات: ${error.message}`);
    }
    return (data || []) as unknown as Listing[];
  }, []);

  const getListing = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[useListings] getListing failed:", { id, error: error.message, code: error.code });
    }
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

  const softDeleteListing = useCallback(async (id: string) => {
    if (!user) return { error: new Error("Not authenticated"), data: null };
    setLoading(true);
    const { data: listing, error } = await supabase
      .from("listings")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, status: "archived" } as any)
      .eq("id", id)
      .select()
      .single();
    setLoading(false);
    return { data: listing, error };
  }, [user]);

  return { createListing, updateListing, softDeleteListing, getMyDraft, getMyListings, getPublishedListings, getAllListings, getListing, uploadFile, loading };
}
