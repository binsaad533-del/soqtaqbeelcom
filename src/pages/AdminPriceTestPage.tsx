import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCcw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type PricingStatus = "idle" | "in_progress" | "completed" | "failed";

const DEFAULT_LISTING_ID = "65df6840-c2ac-43d5-bc2e-6771f35acfbb";

const AdminPriceTestPage = () => {
  const [listingId, setListingId] = useState<string>(DEFAULT_LISTING_ID);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<PricingStatus>("idle");
  const [statusMeta, setStatusMeta] = useState<{ started_at?: string; completed_at?: string }>({});

  // قراءة الحالة الحالية + اشتراك Realtime
  useEffect(() => {
    if (!listingId) return;

    let isMounted = true;
    const fetchStatus = async () => {
      const { data, error: e } = await supabase
        .from("listings")
        .select("pricing_status, pricing_started_at, pricing_completed_at")
        .eq("id", listingId)
        .maybeSingle();
      if (!isMounted) return;
      if (e) return;
      if (data) {
        setStatus(((data.pricing_status as PricingStatus) || "idle"));
        setStatusMeta({
          started_at: data.pricing_started_at || undefined,
          completed_at: data.pricing_completed_at || undefined,
        });
      }
    };
    fetchStatus();

    const channel = supabase
      .channel(`pricing-status-${listingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings", filter: `id=eq.${listingId}` },
        (payload) => {
          const row: any = payload.new;
          setStatus(((row?.pricing_status as PricingStatus) || "idle"));
          setStatusMeta({
            started_at: row?.pricing_started_at || undefined,
            completed_at: row?.pricing_completed_at || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  const triggerPricing = async (force_refresh: boolean) => {
    if (!listingId) {
      toast.error("أدخل معرّف الإعلان");
      return;
    }
    setLoading(true);
    setResult("");
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/price-assets`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ listing_id: listingId, force_refresh }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await response.text();
      if (!response.ok) {
        setError(`HTTP ${response.status}: ${text}`);
        toast.error("فشل التنفيذ");
        return;
      }
      setResult(text);
      toast.success(force_refresh ? "اكتملت إعادة التقييم" : "اكتمل التسعير");
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        setError("انتهى وقت الانتظار (120 ثانية)");
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

  const StatusBadge = () => {
    if (status === "in_progress") {
      return (
        <div className="flex items-center gap-2 text-sm rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تسعير الأصول... قد يستغرق 30–60 ثانية</span>
        </div>
      );
    }
    if (status === "completed") {
      return (
        <div className="flex items-center gap-2 text-sm rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>اكتمل التسعير{statusMeta.completed_at ? ` — ${new Date(statusMeta.completed_at).toLocaleString("en-GB")}` : ""}</span>
        </div>
      );
    }
    if (status === "failed") {
      return (
        <div className="flex items-center gap-2 text-sm rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span>فشل التسعير — جرّب إعادة التقييم</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-sm rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>لم يبدأ التسعير بعد</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">تسعير أصول الإعلان</h1>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">معرّف الإعلان (Listing ID)</label>
          <Input
            dir="ltr"
            value={listingId}
            onChange={(e) => setListingId(e.target.value.trim())}
            placeholder="UUID"
          />
        </div>
        <Button
          onClick={() => triggerPricing(true)}
          disabled={loading || status === "in_progress"}
          size="lg"
          className="h-11"
        >
          {loading || status === "in_progress" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              جاري التسعير...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4 ml-2" />
              إعادة تقييم الأسعار
            </>
          )}
        </Button>
      </div>

      <StatusBadge />

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
          <strong>خطأ:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <Button onClick={copyResult} variant="outline" size="sm">
            انسخ النتيجة كاملة
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
