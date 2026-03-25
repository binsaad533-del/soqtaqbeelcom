import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, X, Bell, Mail, Phone } from "lucide-react";
import type { FilterState } from "./MarketplaceFilters";
import AiStar from "@/components/AiStar";
import { toast } from "sonner";

const suggestions = [
  "كوفي في جدة",
  "مطعم في الرياض",
  "ورشة بسعر مناسب",
  "صالون جاهز للتقبيل",
  "محل في الدمام",
];

interface Props {
  onApplyFilters: (filters: Partial<FilterState>, message: string, similarActivities?: string[]) => void;
  resultCount?: number;
}

const SmartSearchBar = ({ onApplyFilters, resultCount }: Props) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appliedLabel, setAppliedLabel] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);
  const [lastFilters, setLastFilters] = useState<Partial<FilterState>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = query
    ? suggestions.filter(s => s.includes(query))
    : suggestions;

  const noResults = hasSearched && resultCount === 0;

  // Derive display message: override AI message when no results
  const displayMessage = useMemo(() => {
    if (!hasSearched || !aiMessage) return aiMessage;
    if (noResults) {
      return "ما لقيت نتائج تطابق بحثك الحين.. بس لا تشيل هم! فعّل التنبيه وأنا أرسل لك إشعار على الإيميل والجوال فور ما ينزل عرض يناسبك 📧📱";
    }
    return aiMessage;
  }, [aiMessage, resultCount, hasSearched, noResults]);

  const handleSearch = async (text?: string) => {
    const q = text || query;
    if (!q.trim()) return;

    setLoading(true);
    setAiMessage("");
    setAppliedLabel("");
    setShowSuggestions(false);
    setHasSearched(false);
    setAlertSaved(false);

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

      setLastFilters(filters);

      // Build applied label
      const parts: string[] = [];
      if (data.city !== "الكل") parts.push(data.city);
      if (data.activity !== "الكل") parts.push(data.activity);
      if (data.dealType !== "الكل") parts.push(data.dealType.replace("_", " "));
      if (data.priceMax < 5000000 || data.priceMin > 0) parts.push("نطاق سعري محدد");
      if (parts.length > 0) setAppliedLabel(`تم تطبيق: ${parts.join(" + ")}`);

      setAiMessage(data.message || "");
      setHasSearched(true);
      onApplyFilters(filters, data.message, data.similarActivities || []);
    } catch (e) {
      console.error("Smart search error:", e);
      setAiMessage("عذرًا، حاول مرة ثانية");
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAlert = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("سجّل دخولك أولاً لتفعيل التنبيه");
      return;
    }

    setAlertSaving(true);
    try {
      // Fetch user profile for phone, and email from auth
      const [{ data: profile }] = await Promise.all([
        supabase.from("profiles").select("phone").eq("user_id", user.id).single(),
      ]);

      const { error } = await supabase.from("search_alerts").insert([{
        user_id: user.id,
        search_query: query,
        filters: JSON.parse(JSON.stringify(lastFilters)),
        notify_email: user.email || null,
        notify_phone: profile?.phone || null,
      }]);

      if (error) throw error;

      setAlertSaved(true);
      toast.success("تم تفعيل التنبيه! راح ننبّهك على الإيميل والجوال 📧📱");
    } catch (e) {
      console.error("Alert save error:", e);
      toast.error("حصل خطأ، حاول مرة ثانية");
    } finally {
      setAlertSaving(false);
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
    setAlertSaved(false);
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
            "w-full pr-10 pl-9 py-3 rounded-xl border text-sm transition-all",
            "bg-primary/5 border-primary/20 shadow-sm",
            "focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-background",
            "placeholder:text-muted-foreground/60 placeholder:font-medium",
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
          "rounded-xl px-3.5 py-2.5 animate-reveal space-y-2",
          noResults
            ? "bg-gradient-to-l from-destructive/15 via-destructive/8 to-transparent"
            : "bg-gradient-to-l from-primary/10 via-primary/5 to-transparent"
        )}>
          <div className="flex items-start gap-2">
            <AiStar size={14} className="mt-0.5 shrink-0" />
            <p className="text-xs text-foreground/80 leading-relaxed">{displayMessage}</p>
          </div>

          {/* Notify me button */}
          {noResults && !alertSaved && (
            <button
              onClick={handleSetAlert}
              disabled={alertSaving}
              className={cn(
                "flex items-center gap-1.5 mr-5 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all",
                "gradient-primary text-primary-foreground hover:opacity-90 active:scale-[0.97]",
                alertSaving && "opacity-60 pointer-events-none"
              )}
            >
              {alertSaving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Bell size={12} />
              )}
              <Mail size={12} />
              <Phone size={12} />
              نبّهني على الإيميل والجوال
            </button>
          )}

          {/* Alert saved confirmation */}
          {noResults && alertSaved && (
            <div className="flex items-center gap-1.5 mr-5 text-[11px] text-success font-medium">
              <Bell size={12} />
              تم تفعيل التنبيه على الإيميل والجوال ✓
            </div>
          )}
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
