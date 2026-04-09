import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AiMemory {
  preferred_cities: string[];
  preferred_activities: string[];
  budget_min: number | null;
  budget_max: number | null;
  notes: any[];
  interaction_count: number;
  last_search_query: string | null;
  viewed_listings: string[];
  preferences: Record<string, any>;
}

const DEFAULT_MEMORY: AiMemory = {
  preferred_cities: [],
  preferred_activities: [],
  budget_min: null,
  budget_max: null,
  notes: [],
  interaction_count: 0,
  last_search_query: null,
  viewed_listings: [],
  preferences: {},
};

export function useAiMemory() {
  const [memory, setMemory] = useState<AiMemory>(DEFAULT_MEMORY);
  const [loaded, setLoaded] = useState(false);
  const userId = useRef<string | null>(null);

  // Load memory on mount
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      userId.current = user.id;

      const { data } = await supabase
        .from("ai_user_memory")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setMemory({
          preferred_cities: data.preferred_cities || [],
          preferred_activities: data.preferred_activities || [],
          budget_min: data.budget_min,
          budget_max: data.budget_max,
          notes: Array.isArray(data.notes) ? data.notes as any[] : [],
          interaction_count: data.interaction_count || 0,
          last_search_query: data.last_search_query,
          viewed_listings: data.viewed_listings || [],
          preferences: (data.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)) ? data.preferences as Record<string, any> : {},
        });
      }
      setLoaded(true);
    };
    load();
  }, []);

  // Save/update memory
  const updateMemory = useCallback(async (partial: Partial<AiMemory>) => {
    if (!userId.current) return;
    const updated = { ...memory, ...partial };
    setMemory(updated);

    const payload = {
      user_id: userId.current,
      ...updated,
      notes: JSON.parse(JSON.stringify(updated.notes)),
      preferences: JSON.parse(JSON.stringify(updated.preferences)),
    };

    await supabase
      .from("ai_user_memory")
      .upsert(payload, { onConflict: "user_id" });
  }, [memory]);

  // Track a viewed listing
  const trackViewedListing = useCallback(async (listingId: string) => {
    if (!userId.current) return;
    const current = memory.viewed_listings || [];
    // Keep last 20
    const updated = [listingId, ...current.filter(id => id !== listingId)].slice(0, 20);
    await updateMemory({ viewed_listings: updated, interaction_count: memory.interaction_count + 1 });
  }, [memory, updateMemory]);

  // Learn from search
  const learnFromSearch = useCallback(async (query: string, city?: string, activity?: string) => {
    if (!userId.current) return;
    const updates: Partial<AiMemory> = { last_search_query: query };

    if (city && !memory.preferred_cities.includes(city)) {
      updates.preferred_cities = [...memory.preferred_cities, city].slice(-5);
    }
    if (activity && !memory.preferred_activities.includes(activity)) {
      updates.preferred_activities = [...memory.preferred_activities, activity].slice(-5);
    }

    await updateMemory(updates);
  }, [memory, updateMemory]);

  // Add a note from AI
  const addAiNote = useCallback(async (note: string) => {
    if (!userId.current) return;
    const notes = [...memory.notes, { text: note, at: new Date().toISOString() }].slice(-20);
    await updateMemory({ notes });
  }, [memory, updateMemory]);

  // Build context string for AI
  const getMemoryContext = useCallback(() => {
    if (!loaded || memory.interaction_count === 0) return "";
    const lines: string[] = ["--- ذاكرة مقبل عن المستخدم ---"];
    if (memory.preferred_cities.length > 0) lines.push(`المدن المفضلة: ${memory.preferred_cities.join("، ")}`);
    if (memory.preferred_activities.length > 0) lines.push(`الأنشطة المفضلة: ${memory.preferred_activities.join("، ")}`);
    if (memory.budget_min || memory.budget_max) {
      lines.push(`نطاق الميزانية: ${memory.budget_min?.toLocaleString() || "0"} - ${memory.budget_max?.toLocaleString() || "مفتوح"} ريال`);
    }
    if (memory.last_search_query) lines.push(`آخر بحث: ${memory.last_search_query}`);
    lines.push(`عدد التفاعلات: ${memory.interaction_count}`);
    if (memory.notes.length > 0) {
      const recent = memory.notes.slice(-3);
      lines.push(`ملاحظات سابقة:`);
      recent.forEach((n: any) => lines.push(`  - ${n.text}`));
    }
    lines.push("---");
    return lines.join("\n");
  }, [memory, loaded]);

  return {
    memory,
    loaded,
    updateMemory,
    trackViewedListing,
    learnFromSearch,
    addAiNote,
    getMemoryContext,
  };
}
