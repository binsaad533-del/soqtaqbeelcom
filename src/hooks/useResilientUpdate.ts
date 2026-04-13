import { useRef, useCallback } from "react";
import { toast } from "sonner";

const DEBOUNCE_MS = 1000;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

/**
 * Provides debounce, rate-limiting, and auto-retry for any async mutation.
 */
export function useResilientUpdate<T>(
  mutationFn: (payload: T) => Promise<{ data: any; error: any }>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timestampsRef = useRef<number[]>([]);

  const canProceed = (): boolean => {
    const now = Date.now();
    timestampsRef.current = timestampsRef.current.filter(
      (t) => now - t < RATE_WINDOW_MS,
    );
    if (timestampsRef.current.length >= RATE_LIMIT) {
      toast.error("عدد الطلبات كثير — انتظر قليلاً ثم حاول مجدداً");
      return false;
    }
    timestampsRef.current.push(now);
    return true;
  };

  const retryMutation = async (
    payload: T,
    attempt = 0,
  ): Promise<{ data: any; error: any }> => {
    const result = await mutationFn(payload);
    if (!result.error) return result;

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      if (attempt === 0) {
        toast("حصل خطأ، جاري إعادة المحاولة...", { duration: 3000 });
      }
      await new Promise((r) => setTimeout(r, delay));
      return retryMutation(payload, attempt + 1);
    }

    toast.error("تعذّر حفظ التعديلات. حاول مرة أخرى بعد قليل.");
    return result;
  };

  /**
   * Schedule a debounced + rate-limited + retried mutation.
   * Returns a promise that resolves with the final result.
   */
  const debouncedMutate = useCallback(
    (payload: T): Promise<{ data: any; error: any }> => {
      return new Promise((resolve) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
          if (!canProceed()) {
            resolve({ data: null, error: new Error("rate-limited") });
            return;
          }
          const result = await retryMutation(payload);
          resolve(result);
        }, DEBOUNCE_MS);
      });
    },
    [mutationFn],
  );

  /** Fire immediately (no debounce) but still rate-limited + retried. */
  const immediateMutate = useCallback(
    async (payload: T): Promise<{ data: any; error: any }> => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!canProceed()) return { data: null, error: new Error("rate-limited") };
      return retryMutation(payload);
    },
    [mutationFn],
  );

  return { debouncedMutate, immediateMutate };
}
