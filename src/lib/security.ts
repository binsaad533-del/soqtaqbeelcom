import { supabase } from "@/integrations/supabase/client";

// ─── Password Strength ─────────────────────────────────────
export interface PasswordCheck {
  valid: boolean;
  score: number; // 0-5
  issues: string[];
}

export function checkPasswordStrength(password: string): PasswordCheck {
  const issues: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else issues.push("يجب أن تكون 8 أحرف على الأقل");

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password)) score++;
  else issues.push("يجب أن تحتوي على حرف كبير");

  if (/[0-9]/.test(password)) score++;
  else issues.push("يجب أن تحتوي على رقم");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else issues.push("يجب أن تحتوي على رمز خاص (!@#$...)");

  return { valid: score >= 3 && password.length >= 8, score, issues };
}

export const PASSWORD_STRENGTH_LABELS = ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية", "ممتازة"];
export const PASSWORD_STRENGTH_COLORS = [
  "bg-destructive", "bg-destructive", "bg-warning", "bg-warning", "bg-green-500", "bg-green-600"
];

// ─── Input Sanitization ────────────────────────────────────
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeForSearch(input: string): string {
  // Remove SQL injection patterns
  return input.replace(/[';\\\-\-]/g, "").trim();
}

// ─── File Upload Security ──────────────────────────────────
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  // Accept any image type including HEIC/HEIF from phone cameras
  if (!file.type.startsWith("image/") && file.type !== "") {
    // Check by extension as fallback (some phones don't set MIME correctly)
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "tiff", "tif", "svg", "avif", "raw", "cr2", "nef", "arw", "dng"];
    if (!imageExts.includes(ext)) {
      return { valid: false, error: "الملف لا يبدو صورة. يرجى رفع ملف صورة" };
    }
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `حجم الصورة يجب أن لا يتجاوز ${MAX_IMAGE_SIZE / 1024 / 1024} ميجابايت` };
  }
  return { valid: true };
}

export function validateDocFile(file: File): FileValidationResult {
  // Accept virtually all document and image types
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `حجم الملف يجب أن لا يتجاوز ${MAX_FILE_SIZE / 1024 / 1024} ميجابايت` };
  }
  return { valid: true };
}

// ─── Audit Logging ─────────────────────────────────────────
export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from("audit_logs" as any).insert({
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || {},
    } as any);
  } catch {
    // Silent fail — audit should never break user flow
  }
}

// ─── Session Timeout ───────────────────────────────────────
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
let warningTimer: ReturnType<typeof setTimeout> | null = null;
let onTimeoutCallback: (() => void) | null = null;
let onWarningCallback: (() => void) | null = null;

function resetTimers() {
  if (timeoutTimer) clearTimeout(timeoutTimer);
  if (warningTimer) clearTimeout(warningTimer);

  warningTimer = setTimeout(() => {
    onWarningCallback?.();
  }, SESSION_TIMEOUT_MS - 2 * 60 * 1000); // warn 2 min before

  timeoutTimer = setTimeout(() => {
    onTimeoutCallback?.();
  }, SESSION_TIMEOUT_MS);
}

export function startSessionTimeout(
  onWarning: () => void,
  onTimeout: () => void
) {
  onTimeoutCallback = onTimeout;
  onWarningCallback = onWarning;

  const events = ["mousedown", "keydown", "touchstart", "scroll"];
  events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));

  resetTimers();

  return () => {
    events.forEach((e) => window.removeEventListener(e, resetTimers));
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (warningTimer) clearTimeout(warningTimer);
  };
}

// ─── Re-authentication ────────────────────────────────────
export async function reAuthenticate(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
