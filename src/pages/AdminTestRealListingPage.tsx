import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminTestRealListingPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const runTest = async () => {
    setLoading(true);
    setResult("");
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-real-listing`;
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
        setError("انتهى وقت الانتظار (180 ثانية)");
        toast.error("Timeout 180s");
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
      <h1 className="text-2xl font-bold">اختبار التسعير على إعلان حقيقي — V6.2</h1>
      <p className="text-muted-foreground">
        Listing ID: <code className="text-xs">65df6840-c2ac-43d5-bc2e-6771f35acfbb</code>
      </p>

      <Button
        onClick={runTest}
        disabled={loading}
        size="lg"
        className="text-lg h-14 px-8"
      >
        {loading ? "جاري التنفيذ... 30-90 ثانية" : "🧪 اختبر إعلان ديكورات الطائف الحقيقي"}
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

export default AdminTestRealListingPage;
