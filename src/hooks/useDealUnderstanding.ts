import { useState, useCallback, useRef, useEffect } from "react";

export type SectionKey =
  | "deal_summary"
  | "included_items"
  | "excluded_items"
  | "liabilities"
  | "documents"
  | "ai_analysis"
  | "time_spent";

interface SectionWeight {
  key: SectionKey;
  label: string;
  weight: number;
  critical: boolean;
}

export const SECTIONS: SectionWeight[] = [
  { key: "deal_summary", label: "ملخص الصفقة", weight: 20, critical: false },
  { key: "included_items", label: "العناصر المشمولة", weight: 15, critical: false },
  { key: "excluded_items", label: "العناصر المستبعدة", weight: 15, critical: true },
  { key: "liabilities", label: "الالتزامات والمخاطر", weight: 15, critical: true },
  { key: "documents", label: "المستندات والإفصاحات", weight: 15, critical: true },
  { key: "ai_analysis", label: "تحليل الذكاء الاصطناعي", weight: 10, critical: false },
  { key: "time_spent", label: "وقت المراجعة الكافي", weight: 10, critical: false },
];

const MIN_TIME_SECONDS = 25;
const MIN_SCORE = 70;

export function useDealUnderstanding() {
  const [viewed, setViewed] = useState<Set<SectionKey>>(new Set());
  const startTime = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const markViewed = useCallback((section: SectionKey) => {
    setViewed(prev => {
      const next = new Set(prev);
      next.add(section);
      return next;
    });
  }, []);

  const timeComplete = elapsedSeconds >= MIN_TIME_SECONDS;

  const score = SECTIONS.reduce((total, s) => {
    if (s.key === "time_spent") return total + (timeComplete ? s.weight : 0);
    return total + (viewed.has(s.key) ? s.weight : 0);
  }, 0);

  const criticalSections = SECTIONS.filter(s => s.critical);
  const missingCritical = criticalSections.filter(s => !viewed.has(s.key));
  const canProceed = score >= MIN_SCORE && missingCritical.length === 0;

  const getWarning = useCallback((): string | null => {
    if (missingCritical.length > 0) {
      const names = missingCritical.map(s => s.label).join("، ");
      return `يجب مراجعة الأقسام التالية قبل المتابعة: ${names}`;
    }
    if (score < MIN_SCORE) {
      return "لم تُراجع تفاصيل الصفقة بشكل كافٍ. يرجى مراجعة جميع الأقسام قبل المتابعة.";
    }
    return null;
  }, [score, missingCritical]);

  const getSnapshot = useCallback(() => ({
    score,
    viewed_sections: Array.from(viewed),
    time_spent_seconds: elapsedSeconds,
    missing_critical: missingCritical.map(s => s.key),
    timestamp: new Date().toISOString(),
  }), [score, viewed, elapsedSeconds, missingCritical]);

  return {
    score,
    viewed,
    markViewed,
    canProceed,
    missingCritical,
    getWarning,
    getSnapshot,
    elapsedSeconds,
    timeComplete,
    MIN_SCORE,
    MIN_TIME_SECONDS,
  };
}
