import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

/**
 * Invoke a Supabase Edge Function with automatic retry (3 attempts, exponential backoff).
 * Shows Arabic toast on retry / final failure.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  body: Record<string, unknown>,
  attempt = 0,
): Promise<{ data: T | null; error: any }> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (!error) return { data: data as T, error: null };

  console.warn(`[invokeWithRetry] ${functionName} attempt ${attempt + 1} failed:`, error);

  if (attempt < MAX_RETRIES - 1) {
    if (attempt === 0) {
      toast("حصل خطأ، جاري إعادة المحاولة...", { duration: 3000 });
    }
    const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
    await new Promise((r) => setTimeout(r, delay));
    return invokeWithRetry<T>(functionName, body, attempt + 1);
  }

  toast.error("تعذّر إتمام العملية. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
  return { data: null, error };
}
