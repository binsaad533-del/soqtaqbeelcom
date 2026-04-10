import { useState, useCallback } from "react";
import { Bot, Loader2, Play, Pause, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";

interface Props {
  callAI: (mode: string, extraMessages?: { role: string; content: string }[]) => Promise<string>;
  isBuyer: boolean;
  askingPrice: number;
  dealId: string;
  onAutoMessage: (text: string) => Promise<void>;
  buildContext: () => string;
}

type NegStyle = "firm" | "balanced" | "flexible";

const styleLabels: Record<NegStyle, { label: string; desc: string }> = {
  firm: { label: "حازم", desc: "تمسّك بالسعر ولا تتنازل بسهولة" },
  balanced: { label: "متوازن", desc: "تنازل تدريجي مع الحفاظ على القيمة" },
  flexible: { label: "مرن", desc: "مستعد للتنازل لإغلاق الصفقة" },
};

const MoqbilAutoNegotiate = ({ callAI, isBuyer, askingPrice, dealId, onAutoMessage, buildContext }: Props) => {
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [style, setStyle] = useState<NegStyle>("balanced");
  const [minPrice, setMinPrice] = useState(isBuyer ? 0 : Math.round(askingPrice * 0.85));
  const [maxPrice, setMaxPrice] = useState(isBuyer ? Math.round(askingPrice * 0.95) : askingPrice);
  const [negotiating, setNegotiating] = useState(false);
  const [roundCount, setRoundCount] = useState(0);

  const executeAutoNegotiation = useCallback(async () => {
    if (negotiating) return;
    setNegotiating(true);
    try {
      const priceContext = isBuyer
        ? `\nالحد الأقصى للمشتري: ${maxPrice.toLocaleString("en-US")} ريال\nالمشتري يبدأ من: ${minPrice > 0 ? minPrice.toLocaleString("en-US") : "أقل عرض ممكن"} ريال`
        : `\nالحد الأدنى للبائع: ${minPrice.toLocaleString("en-US")} ريال\nالسعر المطلوب: ${maxPrice.toLocaleString("en-US")} ريال`;
      
      const styleContext = `\nأسلوب التفاوض: ${styleLabels[style].label} — ${styleLabels[style].desc}`;
      const roleContext = `\nأنت تتفاوض نيابةً عن: ${isBuyer ? "المشتري" : "البائع"}`;
      const roundContext = `\nرقم جولة التفاوض: ${roundCount + 1}`;

      const extraContext = priceContext + styleContext + roleContext + roundContext;

      const text = await callAI("auto_negotiate", [{
        role: "user",
        content: `تفاوض بالنيابة عني. ${extraContext}`
      }]);

      if (text) {
        await onAutoMessage(text);
        setRoundCount(prev => prev + 1);
      }
    } catch {}
    setNegotiating(false);
  }, [callAI, isBuyer, minPrice, maxPrice, style, roundCount, onAutoMessage, negotiating]);

  const toggleActive = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setShowSettings(true);
    }
  };

  const startAutoNegotiation = () => {
    setIsActive(true);
    setShowSettings(false);
    setRoundCount(0);
    executeAutoNegotiation();
  };

  return (
    <div className="mx-3 mb-2">
      {/* Toggle Button */}
      {!showSettings && (
        <button
          onClick={toggleActive}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
            isActive
              ? "bg-gradient-to-l from-primary/15 to-primary/8 border-primary/30 shadow-sm"
              : "bg-muted/30 border-border/30 hover:bg-muted/50"
          )}
        >
          <Bot size={13} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-[10px] font-medium flex-1 text-right", isActive ? "text-primary" : "text-muted-foreground")}>
            {isActive ? `مقبل يتفاوض نيابةً عنك (جولة ${roundCount})` : "تفعيل التفاوض التلقائي"}
          </span>
          {isActive ? (
            <Pause size={11} className="text-primary" />
          ) : (
            <Play size={11} className="text-muted-foreground" />
          )}
        </button>
      )}

      {/* Active Controls */}
      {isActive && !showSettings && (
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={executeAutoNegotiation}
            disabled={negotiating}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[9px] font-medium hover:bg-primary/15 transition-all disabled:opacity-50"
          >
            {negotiating ? <Loader2 size={9} className="animate-spin" /> : <AiStar size={9} />}
            أرسل رد تفاوضي
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-2.5 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-[9px] hover:bg-muted transition-all"
          >
            <Settings2 size={9} />
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="border border-primary/20 rounded-xl bg-card p-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={13} className="text-primary" />
            <span className="text-[11px] font-semibold">إعدادات التفاوض التلقائي</span>
          </div>

          <p className="text-[9px] text-muted-foreground leading-relaxed">
            مقبل يتفاوض بالنيابة عنك بذكاء. حدد حدودك وأسلوبك وهو يتكفل بالباقي.
          </p>

          {/* Price Range */}
          <div className="space-y-2">
            <div>
              <label className="text-[9px] text-muted-foreground block mb-1">
                {isBuyer ? "الحد الأقصى اللي أقبل فيه" : "الحد الأدنى اللي أقبل فيه"}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={isBuyer ? (maxPrice || "") : (minPrice || "")}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    const num = val ? parseInt(val, 10) : 0;
                    isBuyer ? setMaxPrice(num) : setMinPrice(num);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-border/40 bg-background text-xs text-left"
                  dir="ltr"
                />
                <SarSymbol size={12} className="text-muted-foreground" />
              </div>
            </div>

            {isBuyer && (
              <div>
                <label className="text-[9px] text-muted-foreground block mb-1">أبدأ التفاوض من (اختياري)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minPrice || ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setMinPrice(val ? parseInt(val, 10) : 0);
                    }}
                    placeholder="سعر البداية"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-border/40 bg-background text-xs text-left"
                    dir="ltr"
                  />
                  <SarSymbol size={12} className="text-muted-foreground" />
                </div>
              </div>
            )}

            {!isBuyer && (
              <div>
                <label className="text-[9px] text-muted-foreground block mb-1">السعر اللي أبيع فيه (مثالي)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxPrice || ""}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setMaxPrice(val ? parseInt(val, 10) : 0);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-border/40 bg-background text-xs text-left"
                    dir="ltr"
                  />
                  <SarSymbol size={12} className="text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Style */}
          <div>
            <label className="text-[9px] text-muted-foreground block mb-1.5">أسلوب التفاوض</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(styleLabels) as NegStyle[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-[9px] font-medium transition-all",
                    style === s
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <div>{styleLabels[s].label}</div>
                  <div className="text-[7px] font-normal mt-0.5 opacity-70">{styleLabels[s].desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={startAutoNegotiation}
              size="sm"
              className="flex-1 rounded-xl text-xs gradient-primary text-primary-foreground"
            >
              <Bot size={12} className="ml-1.5" />
              ابدأ التفاوض
            </Button>
            <Button
              onClick={() => { setShowSettings(false); setIsActive(false); }}
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoqbilAutoNegotiate;
