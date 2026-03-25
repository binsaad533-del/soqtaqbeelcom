import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, X } from "lucide-react";
import type { FilterState } from "./MarketplaceFilters";
import AiStar from "@/components/AiStar";

const suggestions = [
  "كوفي في جدة",
  "مطعم في الرياض",
  "ورشة بسعر مناسب",
  "صالون جاهز للتقبيل",
  "محل في الدمام",
];

interface Props {
  onApplyFilters: (filters: Partial<FilterState>, message: string) => void;
  resultCount?: number;
}

const SmartSearchBar = ({ onApplyFilters, resultCount }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appliedLabel, setAppliedLabel] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = query
    ? suggestions.filter(s => s.includes(query))
    : suggestions;

  // Derive display message: override AI message when no results
  const displayMessage = useMemo(() => {
    if (!hasSearched || !aiMessage) return aiMessage;
    if (resultCount === 0) {
      return "ما لقيت نتائج تطابق بحثك الحين.. جرّب تعدّل الفلاتر أو تبحث بكلمات ثانية 🔍";
    }
    return aiMessage;
  }, [aiMessage, resultCount, hasSearched]);

  const handleSearch = async (text?: string) => {
    const q = text || query;
    if (!q.trim()) return;

    setLoading(true);
    setAiMessage("");
    setAppliedLabel("");
    setShowSuggestions(false);
    setHasSearched(false);

    try {
      const { data, error } = await supabase.functions.invoke("smart-search", {
        body: { query: q },
      });

      if (error) throw error;

      const filters: Partial<FilterState> = {};
      if (data.dealType && data.dealType !== "الكل") filters.dealType = data.dealType;
      if (data.city && data.city !== "الكل") filters.city = data.city;
      if (data.activity && data.activity !== "الكل") filters.activity = data.activity;
      if (data.priceMin !== undefined || data.priceMax !== undefined) {
        filters.priceRange = [data.priceMin || 0, data.priceMax || 5000000];
      }

      // Build applied label
      const parts: string[] = [];
      if (data.city !== "الكل") parts.push(data.city);
      if (data.activity !== "الكل") parts.push(data.activity);
      if (data.dealType !== "الكل") parts.push(data.dealType.replace("_", " "));
      if (data.priceMax < 5000000 || data.priceMin > 0) parts.push("نطاق سعري محدد");
      if (parts.length > 0) setAppliedLabel(`تم تطبيق: ${parts.join(" + ")}`);

      setAiMessage(data.message || "");
      setHasSearched(true);
      onApplyFilters(filters, data.message);
    } catch (e) {
      console.error("Smart search error:", e);
      setAiMessage("عذرًا، حاول مرة ثانية");
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clear = () => {
    setQuery("");
    setAiMessage("");
    setAppliedLabel("");
    setHasSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className="relative group">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          {loading ? (
            <Loader2 size={18} className="text-primary animate-spin" />
          ) : (
            <AiStar size={18} />
          )}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="وش تدور عليه؟ الـAI يساعدك…"
          disabled={loading}
          className={cn(
            "w-full pr-10 pl-9 py-2.5 rounded-xl border text-sm transition-all",
            "bg-background border-border/40",
            "focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10",
            "placeholder:text-muted-foreground/50",
            loading && "opacity-70"
          )}
        />
        {query && !loading && (
          <button
            onClick={clear}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        )}
        {!query && !loading && (
          <button
            onClick={() => inputRef.current?.focus()}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
          >
            <Sparkles size={14} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && !loading && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredSuggestions.map(s => (
            <button
              key={s}
              onMouseDown={() => {
                setQuery(s);
                handleSearch(s);
              }}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* AI message */}
      {displayMessage && (
        <div className={cn(
          "flex items-start gap-2 rounded-xl px-3.5 py-2.5 animate-reveal",
          resultCount === 0 && hasSearched ? "bg-destructive/8" : "bg-primary/5"
        )}>
          <AiStar size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/80 leading-relaxed">{displayMessage}</p>
        </div>
      )}

      {/* Applied filters label */}
      {appliedLabel && !displayMessage && (
        <p className="text-[11px] text-muted-foreground px-1">{appliedLabel}</p>
      )}
    </div>
  );
};

export default SmartSearchBar;
