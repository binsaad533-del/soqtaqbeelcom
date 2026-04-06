import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

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
  loadCache: () => Promise<void>;
  saveDealCheck: (analysis: any) => Promise<void>;
  saveFeasibility: (study: any) => Promise<void>;
  setRefreshing: (v: boolean) => void;
}

export function useAnalysisCache(listingId: string | undefined): UseAnalysisCacheReturn {
  const [cache, setCache] = useState<CacheEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadedRef = useRef(false);

  const isStale = cache
    ? Date.now() - new Date(cache.generated_at).getTime() > CACHE_TTL_MS
    : true;

  const loadCache = useCallback(async () => {
    if (!listingId) return;
    try {
      const { data } = await supabase
        .from("listings")
        .select("ai_analysis_cache, ai_structure_validation")
        .eq("id", listingId)
        .maybeSingle();

      if (data?.ai_analysis_cache && typeof data.ai_analysis_cache === "object") {
        const c = data.ai_analysis_cache as any;
        setCache({
          dealCheck: c.dealCheck || null,
          feasibility: c.feasibility || null,
          generated_at: c.generated_at || new Date(0).toISOString(),
        });
      } else if (data?.ai_structure_validation) {
        // Migrate legacy: ai_structure_validation → cache
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

  return {
    cachedDealCheck: cache?.dealCheck || null,
    cachedFeasibility: cache?.feasibility || null,
    cacheAge: cache?.generated_at || null,
    isStale,
    isRefreshing,
    loadCache,
    saveDealCheck,
    saveFeasibility,
    setRefreshing: setIsRefreshing,
  };
}
