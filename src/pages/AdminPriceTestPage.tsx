import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminPriceTestPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const runTest = async () => {
    setLoading(true);
    setResult("");
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/price-poc`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        setError(`HTTP ${response.status}: ${text}`);
        toast.error("فشل التنفيذ");
        return;
      }

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      toast.success("اكتمل الاختبار");
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        setError("انتهى وقت الانتظار (120 ثانية) — الدالة لم تستجب");
        toast.error("Timeout 120s");
      } else {
        setError(e?.message || String(e));
        toast.error("خطأ غير متوقع");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">اختبار تسعير الأصول V6.2 — Gemini 2.5 Pro متوازي</h1>

      <Button
        onClick={runTest}
        disabled={loading}
        size="lg"
        className="text-lg h-14 px-8"
      >
        {loading ? "جاري التنفيذ بالتوازي... 15-30 ثانية (timeout 120s)" : "🚀 شغّل الاختبار"}
      </Button>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
          <strong>خطأ:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <Button onClick={copyResult} variant="outline">
            📋 انسخ النتيجة كاملة
          </Button>
          <pre
            dir="ltr"
            className="p-4 rounded-md bg-muted text-foreground font-mono text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap break-words border"
            style={{ direction: "ltr", textAlign: "left" }}
          >
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AdminPriceTestPage;
