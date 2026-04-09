import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Copy, Users, Gift, CheckCircle2, Share2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ReferralData {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  status: string;
  reward_points: number;
  created_at: string;
  converted_at: string | null;
}

const ReferralPage = () => {
  useSEO({ title: "إحالاتي | سوق تقبيل", description: "شارك رابط الإحالة واكسب مكافآت", canonical: "/referrals" });
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setReferralCode(data[0].referral_code);
        setReferrals(data as ReferralData[]);
        setTotalPoints(data.reduce((s, r) => s + (r.reward_points || 0), 0));
      }
    } catch (err) {
      console.error("[Referral] load error", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateCode = async () => {
    if (!user) return;
    const code = `SQ-${user.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      referral_code: code,
    });
    if (error) {
      toast.error("فشل إنشاء رابط الإحالة");
    } else {
      setReferralCode(code);
      toast.success("تم إنشاء رابط الإحالة");
      load();
    }
  };

  const copyLink = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/login?ref=${referralCode}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("تم نسخ رابط الإحالة"),
      () => toast.error("فشل النسخ")
    );
  };

  const shareLink = async () => {
    if (!referralCode) return;
    const url = `${window.location.origin}/login?ref=${referralCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "سوق تقبيل — فرص استثمارية",
          text: "سجّل في سوق تقبيل واستكشف أفضل فرص التقبيل",
          url,
        });
      } else {
        copyLink();
      }
    } catch {
      copyLink();
    }
  };

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-8 container max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const conversions = referrals.filter(r => r.status === "converted").length;

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">نظام الإحالات</h1>
            <p className="text-xs text-muted-foreground mt-1">شارك رابطك واكسب مكافآت عند إتمام الصفقات</p>
          </div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft size={12} /> الرئيسية
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users size={18} className="mx-auto mb-1 text-primary" strokeWidth={1.5} />
              <p className="text-lg font-bold">{referrals.length}</p>
              <p className="text-[10px] text-muted-foreground">إحالات مُرسلة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 size={18} className="mx-auto mb-1 text-success" strokeWidth={1.5} />
              <p className="text-lg font-bold">{conversions}</p>
              <p className="text-[10px] text-muted-foreground">تحويلات ناجحة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Gift size={18} className="mx-auto mb-1 text-amber-500" strokeWidth={1.5} />
              <p className="text-lg font-bold">{totalPoints}</p>
              <p className="text-[10px] text-muted-foreground">نقاط مكافآت</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={16} className="text-primary" />
              <span className="text-sm font-semibold">رابط الإحالة الخاص بك</span>
            </div>

            {referralCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3">
                  <code className="flex-1 text-xs text-foreground font-mono truncate" dir="ltr">
                    {window.location.origin}/login?ref={referralCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyLink} className="shrink-0">
                    <Copy size={14} />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLink} className="flex-1 text-xs">
                    <Copy size={12} className="ml-1" /> نسخ الرابط
                  </Button>
                  <Button size="sm" onClick={shareLink} className="flex-1 text-xs">
                    <Share2 size={12} className="ml-1" /> مشاركة
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">أنشئ رابط الإحالة الخاص بك وشاركه مع معارفك</p>
                <Button onClick={generateCode}>
                  <Link2 size={14} className="ml-1" /> إنشاء رابط إحالة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold mb-4">كيف يعمل نظام الإحالات؟</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: "شارك رابطك", desc: "انسخ رابط الإحالة وشاركه مع أصدقائك ومعارفك" },
                { step: "2", title: "تسجيل جديد", desc: "عندما يسجّل شخص عبر رابطك يتم ربطه بحسابك" },
                { step: "3", title: "إتمام صفقة", desc: "عند إتمام صفقة ناجحة تحصل على نقاط مكافآت" },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralPage;
