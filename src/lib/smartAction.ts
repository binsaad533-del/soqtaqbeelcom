import { toast } from "sonner";
import { logAudit } from "@/lib/security";

interface SmartActionOptions {
  action: () => Promise<any>;
  successMessage?: string;
  errorMessage?: string;
  retryCount?: number;
  retryDelay?: number;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  onProgress?: (status: "processing" | "retrying" | "failed" | "success") => void;
  saveProgress?: () => void;
}

export async function smartAction({
  action,
  successMessage = "تمت العملية بنجاح",
  errorMessage = "حدث خطأ أثناء تنفيذ العملية",
  retryCount = 2,
  retryDelay = 2000,
  actionLabel = "action",
  resourceType = "unknown",
  resourceId,
  onProgress,
  saveProgress,
}: SmartActionOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      onProgress?.(attempt === 0 ? "processing" : "retrying");

      if (attempt > 0) {
        toast.loading(`جاري إعادة المحاولة (${attempt}/${retryCount})...`, { id: "smart-action" });
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      const result = await action();

      toast.dismiss("smart-action");
      toast.success(successMessage);
      onProgress?.("success");

      logAudit(actionLabel, resourceType, resourceId, { attempt, status: "success" });

      return { success: true, data: result };
    } catch (err: any) {
      lastError = err;

      // Save progress before potential failure
      if (attempt === retryCount && saveProgress) {
        try {
          saveProgress();
          toast.info("تم حفظ تقدمك تلقائياً");
        } catch {
          // Silent
        }
      }
    }
  }

  toast.dismiss("smart-action");
  onProgress?.("failed");

  const safeMessage = getSafeErrorMessage(lastError, errorMessage);
  toast.error(safeMessage, {
    duration: 8000,
    action: {
      label: "إعادة المحاولة",
      onClick: () =>
        smartAction({
          action,
          successMessage,
          errorMessage,
          retryCount,
          retryDelay,
          actionLabel,
          resourceType,
          resourceId,
          onProgress,
          saveProgress,
        }),
    },
  });

  logAudit("action_failed", resourceType, resourceId, {
    action: actionLabel,
    error: lastError?.message?.slice(0, 200),
  });

  return { success: false, error: safeMessage };
}

function getSafeErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;

  const message = error?.message || "";

  // Map technical errors to user-friendly Arabic messages
  const errorMap: Record<string, string> = {
    "Failed to fetch": "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت",
    "NetworkError": "مشكلة في الاتصال بالشبكة",
    "TypeError": "حدث خطأ غير متوقع، يرجى إعادة المحاولة",
    "AbortError": "تم إلغاء العملية",
    "TimeoutError": "انتهت مهلة الاتصال، يرجى إعادة المحاولة",
    "PGRST": "خطأ في معالجة البيانات",
    "JWT": "انتهت صلاحية جلستك، يرجى تسجيل الدخول مجدداً",
    "23505": "هذا العنصر موجود بالفعل",
    "42501": "ليس لديك صلاحية لهذا الإجراء",
    "23503": "لا يمكن حذف هذا العنصر لارتباطه ببيانات أخرى",
  };

  for (const [key, userMessage] of Object.entries(errorMap)) {
    if (message.includes(key)) return userMessage;
  }

  // Don't expose raw technical errors
  if (message.includes("Error") || message.includes("error") || message.length > 100) {
    return fallback;
  }

  return fallback;
}

// ─── Auto-save utility (debounced) ────────────────────────
const AUTOSAVE_PREFIX = "souq_autosave_";
const _pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

export function autoSave(key: string, data: any) {
  // Debounce: only write after 3s of inactivity
  const existing = _pendingSaves.get(key);
  if (existing) clearTimeout(existing);
  
  _pendingSaves.set(key, setTimeout(() => {
    try {
      localStorage.setItem(`${AUTOSAVE_PREFIX}${key}`, JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      }));
    } catch {
      // Storage full or unavailable
    }
    _pendingSaves.delete(key);
  }, 3000));
}

export function loadAutoSave<T>(key: string): { data: T; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(`${AUTOSAVE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAutoSave(key: string) {
  localStorage.removeItem(`${AUTOSAVE_PREFIX}${key}`);
}
