import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { X, GitCompareArrows, MapPin, Eye, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import SarSymbol from "@/components/SarSymbol";
import AiStar from "@/components/AiStar";

export interface CompareItem {
  id: string;
  title: string | null;
  business_activity: string | null;
  city: string | null;
  district: string | null;
  price: number | null;
  deal_type: string;
  primary_deal_type: string | null;
  disclosure_score: number | null;
  photos: any;
  ai_rating: string | null;
  trust_score?: number;
  verification_level?: string;
}

interface Props {
  items: CompareItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

const dealTypeLabel = (dt: string | null) => {
  if (!dt) return "—";
  const map: Record<string, string> = {
    full_takeover: "تقبيل كامل",
    transfer_no_liabilities: "تقبيل بدون التزامات",
    assets_only: "تقبيل أصول فقط",
    assets_setup: "تقبيل أصول وتجهيزات",
  };
  return map[dt] || dt;
};

const ComparePanel = ({ items, onRemove, onClear }: Props) => {
  const [expanded, setExpanded] = useState(false);

  // AI recommendation
  const aiRecommendation = useMemo(() => {
    if (items.length < 2) return null;
    let best = items[0];
    let bestScore = 0;
    for (const item of items) {
      let score = 0;
      // Lower price is better (normalize)
      const prices = items.filter(i => i.price && i.price > 0).map(i => i.price!);
      if (item.price && prices.length > 1) {
        const maxP = Math.max(...prices);
        const minP = Math.min(...prices);
        score += maxP > minP ? ((maxP - item.price) / (maxP - minP)) * 30 : 15;
      }
      // Higher disclosure
      score += (item.disclosure_score || 0) * 0.3;
      // Higher trust
      score += (item.trust_score || 0) * 0.2;
      // AI rating
      if (item.ai_rating === "A") score += 20;
      else if (item.ai_rating === "B") score += 12;
      else if (item.ai_rating === "C") score += 5;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return best;
  }, [items]);

  if (items.length === 0) return null;

  const getPhoto = (item: CompareItem) => {
    if (!item.photos) return null;
    const all = Object.values(item.photos).flat() as string[];
    return all[0] || null;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-fade-in">
      {/* Collapsed bar */}
      <div
        className="bg-card/95 backdrop-blur-lg border-t border-border/50 shadow-soft-lg cursor-pointer"
        onClick={() => items.length >= 2 && setExpanded(!expanded)}
      >
        <div className="container max-w-5xl">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <GitCompareArrows size={16} className="text-primary" />
              <span className="text-sm font-medium">المقارنة ({items.length}/4)</span>
              <div className="flex gap-2">
                {items.map(item => (
                  <div key={item.id} className="relative group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/50 bg-muted">
                      {getPhoto(item) ? (
                        <img src={getPhoto(item)!} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Eye size={12} className="text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <Trash2 size={12} /> مسح
              </button>
              {items.length >= 2 && (
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-medium hover:shadow-soft transition-all active:scale-[0.98]">
                  {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  {expanded ? "إغلاق" : "قارن الآن"}
                </button>
              )}
              {items.length < 2 && (
                <span className="text-[10px] text-muted-foreground">أضف {2 - items.length} على الأقل للمقارنة</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded comparison table */}
      {expanded && items.length >= 2 && (
        <div className="bg-card border-t border-border/30 max-h-[60vh] overflow-y-auto animate-fade-in">
          <div className="container max-w-5xl py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-right py-3 px-3 text-muted-foreground font-medium text-xs w-28">المعيار</th>
                    {items.map(item => (
                      <th key={item.id} className="py-3 px-3 text-center min-w-[180px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-border/50 bg-muted">
                            {getPhoto(item) ? (
                              <img src={getPhoto(item)!} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                                <Eye size={16} className="text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <Link to={`/listing/${item.id}`} className="text-xs font-medium text-primary hover:underline">
                            {item.title || item.business_activity || "فرصة"}
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="السعر" items={items} render={item => (
                    <span className="font-semibold text-primary">
                      {item.price ? <>{Number(item.price).toLocaleString()} <SarSymbol size={9} /></> : "—"}
                    </span>
                  )} highlight="lowest-price" />
                  <CompareRow label="المدينة" items={items} render={item => (
                    <span className="flex items-center justify-center gap-1 text-muted-foreground">
                      <MapPin size={11} /> {item.city || "—"}
                    </span>
                  )} />
                  <CompareRow label="الحي" items={items} render={item => (
                    <span className="text-muted-foreground">{item.district || "—"}</span>
                  )} />
                  <CompareRow label="نوع التقبيل" items={items} render={item => (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary inline-block">
                      {dealTypeLabel(item.primary_deal_type || item.deal_type)}
                    </span>
                  )} />
                  <CompareRow label="الشفافية" items={items} render={item => (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${item.disclosure_score || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.disclosure_score || 0}%</span>
                    </div>
                  )} highlight="highest-disclosure" />
                  <CompareRow label="تقييم AI" items={items} render={item => (
                    <span className={cn("text-xs font-medium",
                      item.ai_rating === "A" ? "text-success" :
                      item.ai_rating === "B" ? "text-primary" :
                      item.ai_rating === "C" ? "text-warning" : "text-muted-foreground"
                    )}>
                      {item.ai_rating || "—"}
                    </span>
                  )} />
                  <CompareRow label="ثقة البائع" items={items} render={item => (
                    <div className="flex items-center justify-center gap-1.5">
                      {item.trust_score !== undefined && (
                        <>
                          <span className={cn("text-xs font-semibold",
                            item.trust_score >= 70 ? "text-success" :
                            item.trust_score >= 40 ? "text-warning" : "text-destructive"
                          )}>
                            {item.trust_score}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/100</span>
                        </>
                      )}
                    </div>
                  )} highlight="highest-trust" />
                  <CompareRow label="" items={items} render={item => (
                    <Link
                      to={`/listing/${item.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
                    >
                      عرض التفاصيل
                    </Link>
                  )} />
                  {/* AI Recommendation */}
                  {aiRecommendation && (
                    <tr className="border-t-2 border-primary/20 bg-primary/5">
                      <td className="py-3 px-3 text-xs font-semibold text-primary">
                        <div className="flex items-center gap-1.5">
                          <AiStar size={14} />
                          توصية AI
                        </div>
                      </td>
                      {items.map(item => (
                        <td key={item.id} className="py-3 px-3 text-center">
                          {aiRecommendation.id === item.id ? (
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-primary">✓ الخيار الأفضل</span>
                              <p className="text-[9px] text-muted-foreground">بناءً على السعر والشفافية وثقة البائع</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CompareRowProps {
  label: string;
  items: CompareItem[];
  render: (item: CompareItem) => React.ReactNode;
  highlight?: "lowest-price" | "highest-disclosure" | "highest-trust";
}

const CompareRow = ({ label, items, render, highlight }: CompareRowProps) => {
  let bestId: string | null = null;
  if (highlight === "lowest-price") {
    const priced = items.filter(i => i.price != null && i.price > 0);
    if (priced.length > 1) bestId = priced.reduce((a, b) => (a.price! < b.price! ? a : b)).id;
  } else if (highlight === "highest-disclosure") {
    const scored = items.filter(i => (i.disclosure_score || 0) > 0);
    if (scored.length > 1) bestId = scored.reduce((a, b) => ((a.disclosure_score || 0) > (b.disclosure_score || 0) ? a : b)).id;
  } else if (highlight === "highest-trust") {
    const trusted = items.filter(i => i.trust_score !== undefined);
    if (trusted.length > 1) bestId = trusted.reduce((a, b) => ((a.trust_score || 0) > (b.trust_score || 0) ? a : b)).id;
  }

  return (
    <tr className="border-t border-border/20">
      <td className="py-3 px-3 text-xs text-muted-foreground font-medium">{label}</td>
      {items.map(item => (
        <td key={item.id} className={cn("py-3 px-3 text-center", bestId === item.id && "bg-success/5")}>
          {render(item)}
          {bestId === item.id && (
            <div className="text-[8px] text-success mt-0.5">✓ الأفضل</div>
          )}
        </td>
      ))}
    </tr>
  );
};

export default ComparePanel;
