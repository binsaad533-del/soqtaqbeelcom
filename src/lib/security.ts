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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/** Sanitize a form field value — strips HTML tags, trims, enforces max length */
export function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control chars
    .trim()
    .slice(0, maxLength);
}

/** Sanitize all string fields in an object */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T, maxLength = 500): T {
  const result = { ...data };
  for (const key in result) {
    if (typeof result[key] === "string") {
      (result as any)[key] = sanitizeInput(result[key] as string, maxLength);
    }
  }
  return result;
}

export function sanitizeForSearch(input: string): string {
  return input
    .replace(/['";\\%_\-\-]/g, "")
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE|CREATE)\b/gi, "")
    .trim()
    .slice(0, 200);
}

// ─── URL Validation ────────────────────────────────────────
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Safe JSON-LD serializer (prevents XSS in script tags) ─
export function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// ─── CSRF Token ────────────────────────────────────────────
let _csrfToken: string | null = null;
export function getCsrfToken(): string {
  if (!_csrfToken) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    _csrfToken = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return _csrfToken;
}

// ─── Rate Limiter (client-side) ────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxAttempts;
}

// ─── Data Masking ──────────────────────────────────────────
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
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

// ─── Audit Logging (optimized) ─────────────────────────────
import { shouldLog, isDuplicateLog, trackPerf } from "@/lib/performanceConfig";

export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  // Skip non-critical or duplicate logs to reduce DB I/O
  if (!shouldLog(action)) return;
  if (isDuplicateLog(action, resourceId)) return;

  try {
    const start = performance.now();
    await supabase.from("audit_logs" as any).insert({
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || {},
    } as any);
    trackPerf("audit_log_write", performance.now() - start);
  } catch {
    // Silent fail — audit should never break user flow
  }
}

// ─── Session Timeout ───────────────────────────────────────
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
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
