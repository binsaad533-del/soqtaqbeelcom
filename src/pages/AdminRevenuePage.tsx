import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Handshake, CheckCircle2, Clock, ChevronLeft, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSEO } from "@/hooks/useSEO";
import SarSymbol from "@/components/SarSymbol";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";

interface DealRow {
  id: string;
  status: string;
  agreed_price: number | null;
  created_at: string;
  listing_id: string;
  seller_id: string | null;
  buyer_id: string | null;
}

const COMMISSION_RATE = 0.01;

const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  negotiating: { label: "قيد التفاوض", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  agreed: { label: "تم الاتفاق", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  completed: { label: "مكتملة", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "ملغاة", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  suspended: { label: "معلّقة", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const AdminRevenuePage = () => {
  useSEO({ title: "الإيرادات والعمولات", description: "تقارير الإيرادات والعمولات على سوق تقبيل", canonical: "/admin-revenue" });
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, status, agreed_price, created_at, listing_id, seller_id, buyer_id")
        .order("created_at", { ascending: false });
      setDeals((data as DealRow[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const active = deals.filter(d => !["completed", "cancelled"].includes(d.status));
    const completed = deals.filter(d => d.status === "completed");
    const totalExpectedRevenue = deals
      .filter(d => d.agreed_price && d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.agreed_price! * COMMISSION_RATE), 0);
    const collectedRevenue = completed
      .filter(d => d.agreed_price)
      .reduce((sum, d) => sum + (d.agreed_price! * COMMISSION_RATE), 0);

    return { active: active.length, completed: completed.length, totalExpectedRevenue, collectedRevenue, total: deals.length };
  }, [deals]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months: { name: string; deals: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthDeals = deals.filter(deal => deal.created_at.startsWith(key));
      const revenue = monthDeals
        .filter(deal => deal.agreed_price && deal.status !== "cancelled")
        .reduce((s, deal) => s + (deal.agreed_price! * COMMISSION_RATE), 0);
      months.push({ name: MONTH_LABELS[d.getMonth()], deals: monthDeals.length, revenue: Math.round(revenue) });
    }
    return months;
  }, [deals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AiStar size={28} />
          <div>
            <h1 className="text-xl font-medium">لوحة الإيرادات</h1>
            <p className="text-sm text-muted-foreground">تتبع العمولات والإيرادات المتوقعة</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "الإيرادات المتوقعة", value: stats.totalExpectedRevenue, icon: TrendingUp, isCurrency: true },
            { label: "الإيرادات المحصّلة", value: stats.collectedRevenue, icon: DollarSign, isCurrency: true },
            { label: "صفقات نشطة", value: stats.active, icon: Clock, isCurrency: false },
            { label: "صفقات مكتملة", value: stats.completed, icon: CheckCircle2, isCurrency: false },
          ].map((kpi, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
              <kpi.icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
              <div className="text-lg font-semibold flex items-center justify-center gap-1">
                {kpi.isCurrency ? (
                  <>
                    {Number(kpi.value).toLocaleString("en-US")}
                    <SarSymbol size={12} />
                  </>
                ) : (
                  kpi.value
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 mb-8">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Handshake size={14} className="text-primary" strokeWidth={1.3} />
            الصفقات والإيرادات حسب الشهر
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    name === "revenue" ? `${value.toLocaleString("en-US")} ر.س` : value,
                    name === "revenue" ? "الإيرادات" : "الصفقات",
                  ]}
                />
                <Area type="monotone" dataKey="deals" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1.5} name="deals" />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals Table */}
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
          <h3 className="text-sm font-semibold mb-4">آخر الصفقات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground text-[11px]">
                  <th className="text-right py-2 pr-2">رقم الصفقة</th>
                  <th className="text-right py-2">الحالة</th>
                  <th className="text-right py-2">المبلغ</th>
                  <th className="text-right py-2">العمولة (1%)</th>
                  <th className="text-right py-2">التاريخ</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 20).map(deal => {
                  const st = STATUS_MAP[deal.status] || { label: deal.status, color: "bg-muted text-muted-foreground" };
                  const commission = deal.agreed_price ? Math.round(deal.agreed_price * COMMISSION_RATE) : 0;
                  return (
                    <tr key={deal.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2 text-xs font-mono">#{deal.id.slice(0, 8)}</td>
                      <td className="py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium", st.color)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3">
                        {deal.agreed_price ? (
                          <span className="flex items-center gap-1 text-xs">
                            {Number(deal.agreed_price).toLocaleString("en-US")}
                            <SarSymbol size={8} />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {commission > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                            {commission.toLocaleString("en-US")}
                            <SarSymbol size={8} />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(deal.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3">
                        <Link to={`/negotiate/${deal.id}`} className="text-[10px] text-primary hover:underline">
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                      لا توجد صفقات حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenuePage;
