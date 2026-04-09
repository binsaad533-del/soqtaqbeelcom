import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAiMemory } from "@/hooks/useAiMemory";

/**
 * Tracks user behavior patterns (pages visited, time spent, frequency)
 * and updates AI memory for personalized experiences.
 */
export function useBehaviorTracking() {
  const { pathname } = useLocation();
  const { memory, loaded, updateMemory } = useAiMemory();
  const pageEntryTime = useRef<number>(Date.now());
  const lastPath = useRef<string>("");

  // Track page visits and time spent
  useEffect(() => {
    if (!loaded) return;

    const now = Date.now();
    
    // Record time spent on previous page
    if (lastPath.current && lastPath.current !== pathname) {
      const timeSpent = Math.round((now - pageEntryTime.current) / 1000);
      
      // If user spent > 30 seconds on a listing, learn from it
      if (lastPath.current.startsWith("/listing/") && timeSpent > 30) {
        const listingId = lastPath.current.split("/")[2];
        if (listingId) {
          // trackViewedListing is handled by useAiMemory
        }
      }

      // Track frequently visited pages
      const prefs = { ...memory.preferences };
      const visits = (prefs.page_visits as Record<string, number>) || {};
      const basePath = lastPath.current.split("/").slice(0, 2).join("/") || "/";
      visits[basePath] = (visits[basePath] || 0) + 1;
      prefs.page_visits = visits;

      // Track visit times (hour of day)
      const hours = (prefs.active_hours as number[]) || [];
      const hour = new Date().getHours();
      if (!hours.includes(hour)) {
        hours.push(hour);
        prefs.active_hours = hours.slice(-10);
      }

      // Track time spent patterns
      const timePatterns = (prefs.time_spent as Record<string, number>) || {};
      timePatterns[basePath] = (timePatterns[basePath] || 0) + timeSpent;
      prefs.time_spent = timePatterns;

      updateMemory({ preferences: prefs });
    }

    pageEntryTime.current = now;
    lastPath.current = pathname;
  }, [pathname, loaded]);

  // Learn from marketplace filters
  const trackSearch = useCallback((query: string, filters?: { city?: string; activity?: string; priceRange?: [number, number] }) => {
    if (!loaded) return;

    const updates: Partial<typeof memory> = { last_search_query: query };

    if (filters?.city && !memory.preferred_cities.includes(filters.city)) {
      updates.preferred_cities = [...memory.preferred_cities, filters.city].slice(-5);
    }
    if (filters?.activity && !memory.preferred_activities.includes(filters.activity)) {
      updates.preferred_activities = [...memory.preferred_activities, filters.activity].slice(-5);
    }
    if (filters?.priceRange) {
      updates.budget_min = filters.priceRange[0];
      updates.budget_max = filters.priceRange[1];
    }

    updateMemory(updates);
  }, [loaded, memory, updateMemory]);

  return { trackSearch };
}
