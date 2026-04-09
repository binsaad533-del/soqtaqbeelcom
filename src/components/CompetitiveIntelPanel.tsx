import { useState } from "react";
import { TrendingUp, BarChart3, Users, ArrowUp, ArrowDown, Minus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import PriceDisplay from "@/components/PriceDisplay";

interface CompetitiveIntelProps {
  listingId: string;
  currentPrice?: number | null;
}

interface IntelData {
  competitor_count: number;
  same_district_count: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  price_position: string;
  competitors: { id: string; title: string; price: number; district: string }[];
  ai_insights: string;
}

const CompetitiveIntelPanel = ({ listingId }: CompetitiveIntelProps) => {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: result, error: err } = await supabase.functions.invoke("competitive-intel", {
        body: { listing_id: listingId },
      });
      if (err) throw err;
      setData(result);
    } catch (e: any) {
      setError(e.message || "فشل التحليل");
    } finally {
      setLoading(false);
    }
  };

  const positionIcon = data?.price_position === "below_market" 
    ? <ArrowDown className="text-success" size={14} />
    : data?.price_position === "above_market" 
      ? <ArrowUp className="text-destructive" size={14} />
      : <Minus className="text-muted-foreground" size={14} />;

  const positionLabel = data?.price_position === "below_market" 
    ? "أقل من السوق" 
    : data?.price_position === "above_market" 
      ? "أعلى من السوق" 
      : "ضمن نطاق السوق";

  if (!data && !loading) {
    return (
      <div className="rounded-xl border border-border/40 p-4 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">التحليل التنافسي</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">اكتشف موقعك بين المنافسين واحصل على توصيات ذكية</p>
        <Button onClick={analyze} size="sm" variant="outline" className="w-full text-xs">
          <BarChart3 size={12} className="ml-1.5" />
          تحليل المنافسين
        </Button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 p-4 bg-card flex items-center justify-center gap-2 py-8">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">جاري تحليل السوق...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-sm font-medium">التحليل التنافسي</h3>
        </div>
        <button onClick={analyze} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/30 p-2 text-center">
          <Users size={12} className="mx-auto text-primary mb-1" />
          <span className="text-lg font-semibold">{data?.competitor_count}</span>
          <p className="text-[10px] text-muted-foreground">منافس</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2 text-center">
          <span className="text-lg font-semibold">{data?.same_district_count}</span>
          <p className="text-[10px] text-muted-foreground">بنفس الحي</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2 text-center">
          <div className="flex items-center justify-center gap-0.5">
            {positionIcon}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{positionLabel}</p>
        </div>
      </div>

      {/* Price Range */}
      {data?.avg_price && (
        <div className="rounded-lg border border-border/30 p-2.5">
          <p className="text-[10px] text-muted-foreground mb-1.5">نطاق أسعار المنافسين</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-success"><PriceDisplay amount={data.min_price || 0} /></span>
            <span className="font-medium"><PriceDisplay amount={data.avg_price} /></span>
            <span className="text-destructive"><PriceDisplay amount={data.max_price || 0} /></span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>أقل</span>
            <span>متوسط</span>
            <span>أعلى</span>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {data?.ai_insights && (
        <div className="rounded-lg bg-primary/[0.03] border border-primary/10 p-2.5">
          <p className="text-[10px] font-medium text-primary mb-1">تحليل مقبل</p>
          <div className="text-xs text-foreground/80 prose prose-xs max-w-none leading-relaxed">
            <ReactMarkdown>{data.ai_insights}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitiveIntelPanel;
