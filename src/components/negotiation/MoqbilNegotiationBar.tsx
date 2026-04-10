import { useState, useEffect, useCallback } from "react";
import { Sparkles, AlertTriangle, HelpCircle, ArrowLeft, Loader2, ChevronDown, ChevronUp, Eye, MessageSquareQuote, Shield } from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";

interface Props {
  callAI: (mode: string, extraMessages?: { role: string; content: string }[]) => Promise<string>;
  isBuyer: boolean;
  dealStatus: string;
  messagesCount: number;
  onInsertMessage: (text: string) => void;
}

const MoqbilNegotiationBar = ({ callAI, isBuyer, dealStatus, messagesCount, onInsertMessage }: Props) => {
  const [banner, setBanner] = useState("");
  const [bannerLoading, setBannerLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Contextual data
  const [smartQuestions, setSmartQuestions] = useState<string[]>([]);
  const [sellerReplies, setSellerReplies] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [nextStep, setNextStep] = useState<{ action: string; reason: string } | null>(null);
  const [sectionLoading, setSectionLoading] = useState<string | null>(null);

  // Fetch smart banner on load and message changes
  const fetchBanner = useCallback(async () => {
    if (bannerLoading) return;
    setBannerLoading(true);
    try {
      const text = await callAI("smart_banner", [{ role: "user", content: "أعطني نصيحة" }]);
      if (text) setBanner(text.trim());
    } catch {}
    setBannerLoading(false);
  }, [callAI, bannerLoading]);

  useEffect(() => {
    if (messagesCount >= 0) {
      const timer = setTimeout(fetchBanner, 800);
      return () => clearTimeout(timer);
    }
  }, [messagesCount]);

  const fetchSmartQuestions = useCallback(async () => {
    setSectionLoading("questions");
    try {
      const text = await callAI("smart_questions", [{ role: "user", content: "اقترح أسئلة" }]);
      if (text) setSmartQuestions(text.split("\n").filter(l => l.trim().length > 3).slice(0, 4));
    } catch {}
    setSectionLoading(null);
  }, [callAI]);

  const fetchSellerReplies = useCallback(async () => {
    setSectionLoading("replies");
    try {
      const text = await callAI("seller_replies", [{ role: "user", content: "اقترح ردود" }]);
      if (text) setSellerReplies(text.split("\n").filter(l => l.trim().length > 3).slice(0, 3));
    } catch {}
    setSectionLoading(null);
  }, [callAI]);

  const fetchGaps = useCallback(async () => {
    setSectionLoading("gaps");
    try {
      const text = await callAI("gap_detect", [{ role: "user", content: "اكتشف الثغرات" }]);
      if (text) setGaps(text.split("\n").filter(l => l.trim().length > 3).slice(0, 5));
    } catch {}
    setSectionLoading(null);
  }, [callAI]);

  const fetchNextStep = useCallback(async () => {
    setSectionLoading("next");
    try {
      const text = await callAI("next_step", [{ role: "user", content: "الخطوة التالية" }]);
      if (text) {
        const lines = text.split("\n").filter(l => l.trim());
        setNextStep({ action: lines[0] || "", reason: lines[1] || "" });
      }
    } catch {}
    setSectionLoading(null);
  }, [callAI]);

  // Auto-fetch relevant sections when expanded
  useEffect(() => {
    if (expanded) {
      if (isBuyer && smartQuestions.length === 0) fetchSmartQuestions();
      if (!isBuyer && sellerReplies.length === 0) fetchSellerReplies();
      if (isBuyer && gaps.length === 0) fetchGaps();
      if (!nextStep) fetchNextStep();
    }
  }, [expanded]);

  if (dealStatus === "cancelled" || dealStatus === "completed") return null;

  return (
    <div className="mx-3 mb-2">
      {/* Smart Banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
          "bg-gradient-to-l from-primary/8 to-primary/3 border border-primary/15",
          "hover:from-primary/12 hover:to-primary/6",
          expanded && "rounded-b-none border-b-0"
        )}
      >
        <AiStar size={14} />
        <div className="flex-1 text-right">
          {bannerLoading ? (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 size={9} className="animate-spin" /> مقبل يحلل الموقف...
            </span>
          ) : (
            <span className="text-[10px] font-medium text-foreground leading-relaxed">{banner || "مقبل جاهز يساعدك في التفاوض ✨"}</span>
          )}
        </div>
        {expanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="border border-t-0 border-primary/15 rounded-b-xl bg-card/80 backdrop-blur-sm p-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
          
          {/* Smart Questions (Buyer) */}
          {isBuyer && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle size={11} className="text-primary" />
                <span className="text-[10px] font-semibold text-primary">أسئلة مهمة اسألها البائع</span>
                {sectionLoading === "questions" && <Loader2 size={9} className="animate-spin text-muted-foreground" />}
              </div>
              {smartQuestions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {smartQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onInsertMessage(q)}
                      className="text-[9px] px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-foreground hover:bg-primary/10 hover:border-primary/20 transition-all text-right leading-relaxed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : !sectionLoading ? (
                <button onClick={fetchSmartQuestions} className="text-[9px] text-primary hover:underline">تحميل الأسئلة</button>
              ) : null}
            </div>
          )}

          {/* Seller Replies */}
          {!isBuyer && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquareQuote size={11} className="text-primary" />
                <span className="text-[10px] font-semibold text-primary">ردود مقترحة</span>
                {sectionLoading === "replies" && <Loader2 size={9} className="animate-spin text-muted-foreground" />}
              </div>
              {sellerReplies.length > 0 ? (
                <div className="space-y-1.5">
                  {sellerReplies.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => onInsertMessage(r)}
                      className="w-full text-right text-[9px] px-2.5 py-2 rounded-lg bg-accent/30 border border-accent/20 text-foreground hover:bg-accent/50 transition-all leading-relaxed"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : !sectionLoading ? (
                <button onClick={fetchSellerReplies} className="text-[9px] text-primary hover:underline">تحميل الردود</button>
              ) : null}
            </div>
          )}

          {/* Gap Detection (Buyer) */}
          {isBuyer && gaps.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={11} className="text-warning" />
                <span className="text-[10px] font-semibold text-warning">نقاط يجب الانتباه لها</span>
              </div>
              <div className="space-y-1">
                {gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[9px] text-muted-foreground leading-relaxed">
                    <Eye size={9} className="text-warning mt-0.5 shrink-0" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Step */}
          {nextStep && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-success/5 border border-success/15">
              <ArrowLeft size={11} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-foreground">{nextStep.action}</p>
                {nextStep.reason && <p className="text-[9px] text-muted-foreground mt-0.5">{nextStep.reason}</p>}
              </div>
            </div>
          )}

          {/* Refresh */}
          <div className="flex justify-center pt-1">
            <button
              onClick={() => { fetchBanner(); if (isBuyer) { fetchSmartQuestions(); fetchGaps(); } else { fetchSellerReplies(); } fetchNextStep(); }}
              disabled={!!sectionLoading || bannerLoading}
              className="text-[8px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              🔄 تحديث التحليل
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoqbilNegotiationBar;
