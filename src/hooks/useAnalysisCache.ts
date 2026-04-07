import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  dealCheck?: any;
  feasibility?: any;
  generated_at: string;
}

export interface UseAnalysisCacheReturn {
  cachedDealCheck: any | null;
  cachedFeasibility: any | null;
  cacheAge: string | null;
  isStale: boolean;
  isRefreshing: boolean;
  detectedAssetsImages: any | null;
  detectedAssetsFiles: any | null;
  assetsCombined: any | null;
  priceAnalysis: any | null;
  trustScore: any | null;
  analysisUpdatedAt: string | null;
  loadCache: () => Promise<void>;
  saveDealCheck: (analysis: any) => Promise<void>;
  saveFeasibility: (study: any) => Promise<void>;
  saveDetectedAssets: (images: any, files: any, combined: any) => Promise<void>;
  savePriceAnalysis: (analysis: any) => Promise<void>;
  saveTrustScore: (score: any) => Promise<void>;
  setRefreshing: (v: boolean) => void;
}

export function useAnalysisCache(listingId: string | undefined): UseAnalysisCacheReturn {
  const [cache, setCache] = useState<CacheEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detectedAssetsImages, setDetectedAssetsImages] = useState<any>(null);
  const [detectedAssetsFiles, setDetectedAssetsFiles] = useState<any>(null);
  const [assetsCombined, setAssetsCombined] = useState<any>(null);
  const [priceAnalysis, setPriceAnalysis] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const isStale = cache
    ? Date.now() - new Date(cache.generated_at).getTime() > CACHE_TTL_MS
    : true;

  const loadCache = useCallback(async () => {
    if (!listingId) return;
    try {
      const { data } = await supabase
        .from("listings")
        .select("ai_analysis_cache, ai_structure_validation, ai_detected_assets, ai_detected_assets_images, ai_detected_assets_files, ai_assets_combined, ai_analysis_updated_at, ai_price_analysis, ai_trust_score")
        .eq("id", listingId)
        .maybeSingle();

      if (!data) return;

      // Load asset detection data
      if (data.ai_detected_assets_images) setDetectedAssetsImages(data.ai_detected_assets_images);
      if (data.ai_detected_assets_files) setDetectedAssetsFiles(data.ai_detected_assets_files);
      if (data.ai_assets_combined) setAssetsCombined(data.ai_assets_combined);
      else if (data.ai_detected_assets) {
        // Fallback: use legacy ai_detected_assets
        setAssetsCombined(data.ai_detected_assets);
      }
      if (data.ai_analysis_updated_at) setAnalysisUpdatedAt(data.ai_analysis_updated_at as string);
      if (data.ai_price_analysis) setPriceAnalysis(data.ai_price_analysis);
      if (data.ai_trust_score) setTrustScore(data.ai_trust_score);

      if (data.ai_analysis_cache && typeof data.ai_analysis_cache === "object") {
        const c = data.ai_analysis_cache as any;
        setCache({
          dealCheck: c.dealCheck || null,
          feasibility: c.feasibility || null,
          generated_at: c.generated_at || new Date(0).toISOString(),
        });
      } else if (data.ai_structure_validation) {
        const legacy = data.ai_structure_validation as any;
        const entry: CacheEntry = {
          dealCheck: legacy,
          feasibility: null,
          generated_at: legacy?._meta?.generatedAt || new Date().toISOString(),
        };
        setCache(entry);
      }
    } catch {
      // ignore
    }
  }, [listingId]);

  useEffect(() => {
    if (!loadedRef.current && listingId) {
      loadedRef.current = true;
      loadCache();
    }
  }, [listingId, loadCache]);

  const persistCache = useCallback(async (updated: CacheEntry) => {
    if (!listingId) return;
    try {
      await supabase
        .from("listings")
        .update({ ai_analysis_cache: updated as any })
        .eq("id", listingId);
    } catch {
      // ignore
    }
  }, [listingId]);

  const saveDealCheck = useCallback(async (analysis: any) => {
    const updated: CacheEntry = {
      ...cache,
      dealCheck: analysis,
      generated_at: new Date().toISOString(),
    };
    setCache(updated);
    await persistCache(updated);
  }, [cache, persistCache]);

  const saveFeasibility = useCallback(async (study: any) => {
    const updated: CacheEntry = {
      ...cache,
      feasibility: study,
      generated_at: new Date().toISOString(),
    };
    setCache(updated);
    await persistCache(updated);
  }, [cache, persistCache]);

  const saveDetectedAssets = useCallback(async (images: any, files: any, combined: any) => {
    if (!listingId) return;
    setDetectedAssetsImages(images);
    setDetectedAssetsFiles(files);
    setAssetsCombined(combined);
    const now = new Date().toISOString();
    setAnalysisUpdatedAt(now);
    try {
      await supabase
        .from("listings")
        .update({
          ai_detected_assets_images: images as any,
          ai_detected_assets_files: files as any,
          ai_assets_combined: combined as any,
          ai_detected_assets: combined as any, // Keep legacy field in sync
          ai_analysis_updated_at: now,
        } as any)
        .eq("id", listingId);
    } catch {
      // ignore
    }
  }, [listingId]);

  const savePriceAnalysis = useCallback(async (analysis: any) => {
    if (!listingId) return;
    setPriceAnalysis(analysis);
    try {
      await supabase
        .from("listings")
        .update({ ai_price_analysis: analysis as any } as any)
        .eq("id", listingId);
    } catch {
      // ignore
    }
  }, [listingId]);

  const saveTrustScore = useCallback(async (score: any) => {
    if (!listingId) return;
    setTrustScore(score);
    try {
      await supabase
        .from("listings")
        .update({ ai_trust_score: score as any } as any)
        .eq("id", listingId);
    } catch {
      // ignore
    }
  }, [listingId]);

  return {
    cachedDealCheck: cache?.dealCheck || null,
    cachedFeasibility: cache?.feasibility || null,
    cacheAge: cache?.generated_at || null,
    isStale,
    isRefreshing,
    detectedAssetsImages,
    detectedAssetsFiles,
    assetsCombined,
    priceAnalysis,
    trustScore,
    analysisUpdatedAt,
    loadCache,
    saveDealCheck,
    saveFeasibility,
    saveDetectedAssets,
    savePriceAnalysis,
    saveTrustScore,
    setRefreshing: setIsRefreshing,
  };
}
