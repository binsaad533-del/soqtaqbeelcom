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
    try {
      const { data, error } = await supabase.functions.invoke("price-poc");
      if (error) {
        setError(error.message || String(error));
        toast.error("فشل التنفيذ");
      } else {
        setResult(JSON.stringify(data, null, 2));
        toast.success("اكتمل الاختبار");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      toast.error("خطأ غير متوقع");
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
      <h1 className="text-2xl font-bold">اختبار تسعير الأصول V5 — قبول ذكي بالريال</h1>

      <Button
        onClick={runTest}
        disabled={loading}
        size="lg"
        className="text-lg h-14 px-8"
      >
        {loading ? "جاري التنفيذ... الرجاء الانتظار 15-20 ثانية" : "🚀 شغّل الاختبار"}
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
