import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const UnsubscribePage = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground">جاري التحقق...</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">إلغاء الاشتراك</h2>
              <p className="text-muted-foreground">هل تريد إلغاء تلقي رسائل البريد الإلكتروني من سوق تقبيل؟</p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive" className="w-full">
                {processing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد إلغاء الاشتراك
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-foreground">تم إلغاء الاشتراك</h2>
              <p className="text-muted-foreground">لن تتلقى رسائل بريد إلكتروني منا بعد الآن.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">تم إلغاء الاشتراك مسبقاً</h2>
              <p className="text-muted-foreground">بريدك الإلكتروني غير مشترك بالفعل.</p>
            </>
          )}
          {(status === "invalid" || status === "error") && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">رابط غير صالح</h2>
              <p className="text-muted-foreground">هذا الرابط غير صالح أو منتهي الصلاحية.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
