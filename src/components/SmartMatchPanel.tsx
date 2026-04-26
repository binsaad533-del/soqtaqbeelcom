import { useState, useEffect, useCallback } from "react";
import { Target, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import PriceDisplay from "@/components/PriceDisplay";
import { cn } from "@/lib/utils";

interface MatchResult {
  id: string;
  title: string;
  price: number;
  city: string;
  district: string;
  business_activity: string;
  match_score: number;
  match_reasons: string[];
}

const SmartMatchPanel = () => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);

  const findMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("smart-matching", {
        body: { user_id: user.id },
      });
      if (data?.matches) {
        setMatches(data.matches);
        setTotalAnalyzed(data.total_analyzed || 0);
      }
    } catch { /* */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { findMatches(); }, [findMatches]);

  const scoreColor = (score: number) =>
    score >= 85 ? "bg-success/10 text-success border-success/20" 
    : score >= 70 ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground border-border/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <Loader2 size={14} className="animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">{t("aiChat.emptyState.searching")}</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        <Target size={20} className="mx-auto mb-2 text-muted-foreground/50" />
        <p>{t("aiChat.emptyState.noMatches")}</p>
        <p className="text-[10px] mt-1">{t("aiChat.emptyState.browseMore")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target size={14} className="text-primary" />
          <span className="text-xs font-medium">فرص مطابقة لك</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
            {matches.length} من {totalAnalyzed}
          </Badge>
        </div>
        <button onClick={findMatches} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={11} />
        </button>
      </div>

      {matches.map((match) => (
        <button
          key={match.id}
          onClick={() => navigate(`/listing/${match.id}`)}
          className="w-full text-right rounded-xl border border-border/40 hover:border-primary/20 p-3 transition-all group bg-card"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{match.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {match.city} {match.district ? `- ${match.district}` : ""} · {match.business_activity}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {match.match_reasons.map((r, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left shrink-0">
              <Badge className={cn("text-[10px] px-1.5 py-0.5", scoreColor(match.match_score))}>
                {match.match_score}% توافق
              </Badge>
              {match.price > 0 && (
                <div className="mt-1">
                  <PriceDisplay amount={match.price} />
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default SmartMatchPanel;
