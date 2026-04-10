import { useState, useCallback } from "react";
import { Scale, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import ReactMarkdown from "react-markdown";

interface Props {
  callAI: (mode: string, extraMessages?: { role: string; content: string }[]) => Promise<string>;
  askingPrice: number;
}

const MoqbilOfferEvaluator = ({ callAI, askingPrice }: Props) => {
  const [offerPrice, setOfferPrice] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [loading, setLoading] = useState(false);

  const evaluate = useCallback(async () => {
    if (!offerPrice || loading) return;
    setLoading(true);
    setEvaluation("");
    try {
      const text = await callAI("offer_evaluate", [{
        role: "user",
        content: `العرض المقدم: ${offerPrice} ريال\nالسعر المطلوب: ${askingPrice.toLocaleString("en-US")} ريال\nقيّم العرض.`
      }]);
      setEvaluation(text || "تعذر التقييم");
    } catch {
      setEvaluation("حدث خطأ");
    }
    setLoading(false);
  }, [callAI, offerPrice, askingPrice, loading]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Scale size={11} className="text-primary" />
        <span className="text-[10px] font-semibold text-primary">تقييم عرض سعر</span>
      </div>
      
      <div className="flex gap-1.5">
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            value={offerPrice}
            onChange={e => setOfferPrice(e.target.value)}
            placeholder="أدخل المبلغ"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-border/40 bg-background text-xs text-left"
            dir="ltr"
            onKeyDown={e => e.key === "Enter" && evaluate()}
          />
          <SarSymbol size={11} className="text-muted-foreground" />
        </div>
        <button
          onClick={evaluate}
          disabled={loading || !offerPrice}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[9px] font-medium hover:bg-primary/15 transition-all disabled:opacity-40 flex items-center gap-1"
        >
          {loading ? <Loader2 size={9} className="animate-spin" /> : <AiStar size={9} />}
          قيّم
        </button>
      </div>

      {evaluation && (
        <div className="p-2 rounded-lg bg-accent/15 border border-accent/20">
          <div className="text-[9px] text-foreground leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown>{evaluation}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoqbilOfferEvaluator;
