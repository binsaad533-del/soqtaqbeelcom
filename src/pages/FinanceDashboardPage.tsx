import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, TrendingUp, Clock, CheckCircle2, FileText, AlertTriangle, Download,
  Search, Filter, Send, BadgeCheck, Receipt, ChevronDown, Calendar
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useSEO } from "@/hooks/useSEO";
import SarSymbol from "@/components/SarSymbol";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/contexts/AuthContext";
import { generateCommissionReceiptPdf } from "@/lib/commissionReceiptPdf";

interface CommissionRow {
  id: string;
  deal_id: string;
  seller_id: string;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number | null;
  vat_rate: number;
  vat_amount: number | null;
  total_with_vat: number | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
  receipt_path: string | null;
  reminder_count: number;
  marked_paid_at: string | null;
  notes: string | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: number;
  deal_id: string;
  seller_id: string;
  buyer_id: string;
  listing_title: string | null;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number | null;
  vat_amount: number | null;
  total_with_vat: number | null;
  total_amount: number;
  status: string;
  created_at: string;
}

interface ProfileMap {
  [userId: string]: { full_name: string; phone: string | null };
}

interface DealMap {
  [dealId: string]: { listing_id: string; deal_type: string | null; agreed_price: number | null };
}

interface ListingMap {
  [listingId: string]: { title: string | null };
}

const COMMISSION_STATUS: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مسدد", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  reminder_sent: { label: "تم التذكير", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  paid_proof_uploaded: { label: "إثبات مرفوع", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid_unverified: { label: "قيد التحقق", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { label: "مسدد ✓", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  waived: { label: "معفى", color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400" },
};

const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#94a3b8"];

const FinanceDashboardPage = () => {
  useSEO({ title: "الإدارة المالية", description: "لوحة التحكم المالية" });
  const { user } = useAuthContext();

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [deals, setDeals] = useState<DealMap>({});
  const [listings, setListings] = useState<ListingMap>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [commRes, invRes] = await Promise.all([
      supabase.from("deal_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    ]);

    const comms = (commRes.data || []) as CommissionRow[];
    const invs = (invRes.data || []) as InvoiceRow[];
    setCommissions(comms);
    setInvoices(invs);

    // Gather unique IDs
    const sellerIds = new Set<string>();
    const dealIds = new Set<string>();
    comms.forEach(c => { sellerIds.add(c.seller_id); dealIds.add(c.deal_id); });
    invs.forEach(i => { sellerIds.add(i.seller_id); sellerIds.add(i.buyer_id); dealIds.add(i.deal_id); });

    // Fetch profiles
    if (sellerIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", [...sellerIds]);
      const map: ProfileMap = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, phone: p.phone }; });
      setProfiles(map);
    }

    // Fetch deals
    if (dealIds.size > 0) {
      const { data: dls } = await supabase.from("deals").select("id, listing_id, deal_type, agreed_price").in("id", [...dealIds]);
      const dMap: DealMap = {};
      const listingIds = new Set<string>();
      (dls || []).forEach((d: any) => { dMap[d.id] = d; listingIds.add(d.listing_id); });
      setDeals(dMap);

      // Fetch listings
      if (listingIds.size > 0) {
        const { data: lsts } = await supabase.from("listings").select("id, title").in("id", [...listingIds]);
        const lMap: ListingMap = {};
        (lsts || []).forEach((l: any) => { lMap[l.id] = { title: l.title }; });
        setListings(lMap);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // --- KPI calculations ---
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const verified = commissions.filter(c => c.payment_status === "verified");
    const thisMonthVerified = verified.filter(c => c.created_at.startsWith(thisMonth));
    const lastMonthVerified = verified.filter(c => c.created_at.startsWith(lastMonthKey));

    const totalRevenue = verified.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
    const thisMonthRevenue = thisMonthVerified.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
    const lastMonthRevenue = lastMonthVerified.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
    const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    const pending = commissions.filter(c => ["unpaid", "reminder_sent"].includes(c.payment_status));
    const pendingTotal = pending.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);

    const verifying = commissions.filter(c => ["paid_unverified", "paid_proof_uploaded"].includes(c.payment_status));
    const verifyingTotal = verifying.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);

    return {
      totalRevenue, thisMonthRevenue, revenueChange,
      pendingCount: pending.length, pendingTotal,
      verifyingCount: verifying.length, verifyingTotal,
      invoiceCount: invoices.length,
    };
  }, [commissions, invoices]);

  // --- Filtered commissions ---
  const filteredCommissions = useMemo(() => {
    let filtered = [...commissions];
    if (statusFilter !== "all") filtered = filtered.filter(c => c.payment_status === statusFilter);
    if (periodFilter !== "all") {
      const now = new Date();
      let start: Date;
      switch (periodFilter) {
        case "week": start = new Date(now.getTime() - 7 * 86400000); break;
        case "month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case "quarter": start = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
        case "year": start = new Date(now.getFullYear(), 0, 1); break;
        default: start = new Date(0);
      }
      filtered = filtered.filter(c => new Date(c.created_at) >= start);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const seller = profiles[c.seller_id]?.full_name?.toLowerCase() || "";
        const dealInfo = deals[c.deal_id];
        const listingTitle = dealInfo ? (listings[dealInfo.listing_id]?.title?.toLowerCase() || "") : "";
        return seller.includes(q) || c.deal_id.includes(q) || listingTitle.includes(q);
      });
    }
    return filtered;
  }, [commissions, statusFilter, periodFilter, searchQuery, profiles, deals, listings]);

  // --- Chart data ---
  const monthlyRevenueData = useMemo(() => {
    const data: { name: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthRevenue = commissions
        .filter(c => c.payment_status === "verified" && c.created_at.startsWith(key))
        .reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
      data.push({ name: MONTH_LABELS[d.getMonth()], revenue: Math.round(monthRevenue) });
    }
    return data;
  }, [commissions]);

  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    commissions.forEach(c => { counts[c.payment_status] = (counts[c.payment_status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: COMMISSION_STATUS[status]?.label || status,
      value: count,
    }));
  }, [commissions]);

  const agingData = useMemo(() => {
    const now = Date.now();
    const buckets = [
      { label: "0-30 يوم", min: 0, max: 30, count: 0, amount: 0 },
      { label: "30-60 يوم", min: 30, max: 60, count: 0, amount: 0 },
      { label: "60-90 يوم", min: 60, max: 90, count: 0, amount: 0 },
      { label: "90+ يوم", min: 90, max: 9999, count: 0, amount: 0 },
    ];
    commissions
      .filter(c => ["unpaid", "reminder_sent"].includes(c.payment_status))
      .forEach(c => {
        const days = Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
        const bucket = buckets.find(b => days >= b.min && days < b.max);
        if (bucket) { bucket.count++; bucket.amount += (c.total_with_vat || c.commission_amount || 0); }
      });
    return buckets;
  }, [commissions]);

  // --- Financial alerts ---
  const alerts = useMemo(() => {
    const now = Date.now();
    const result: { type: "red" | "yellow"; message: string }[] = [];
    const overdue30 = commissions.filter(c =>
      ["unpaid", "reminder_sent"].includes(c.payment_status) &&
      (now - new Date(c.created_at).getTime()) > 30 * 86400000
    );
    if (overdue30.length > 0) result.push({ type: "red", message: `${overdue30.length} عمولات متأخرة أكثر من 30 يوم` });

    const pendingVerify7 = commissions.filter(c =>
      ["paid_proof_uploaded", "paid_unverified"].includes(c.payment_status) &&
      (now - new Date(c.updated_at).getTime()) > 7 * 86400000
    );
    if (pendingVerify7.length > 0) result.push({ type: "yellow", message: `${pendingVerify7.length} عمولات بانتظار التحقق أكثر من 7 أيام` });

    return result;
  }, [commissions]);

  // --- Actions ---
  const handleVerify = async (commId: string) => {
    const { error } = await supabase
      .from("deal_commissions")
      .update({ payment_status: "verified", marked_paid_at: new Date().toISOString() })
      .eq("id", commId);
    if (error) { toast.error("خطأ في تأكيد السداد"); return; }

    // Audit log
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "commission_verified",
        resource_type: "commission",
        resource_id: commId,
        details: { verified_by: user.id },
      });
    }
    toast.success("تم تأكيد السداد");
    loadData();
  };

  const handleSendReminder = async (comm: CommissionRow) => {
    const { error } = await supabase
      .from("deal_commissions")
      .update({ payment_status: "reminder_sent", reminder_count: comm.reminder_count + 1, last_reminder_at: new Date().toISOString() })
      .eq("id", comm.id);
    if (error) { toast.error("خطأ في إرسال التذكير"); return; }
    toast.success("تم إرسال التذكير");
    loadData();
  };

  const handleDownloadReceipt = async (comm: CommissionRow) => {
    const deal = deals[comm.deal_id];
    const listingTitle = deal ? (listings[deal.listing_id]?.title || "بدون عنوان") : "بدون عنوان";
    const seller = profiles[comm.seller_id];
    await generateCommissionReceiptPdf({
      receiptId: comm.id,
      paidAt: comm.marked_paid_at || comm.updated_at,
      dealTitle: listingTitle,
      agreementNumber: `AGR-${comm.deal_id.slice(0, 8).toUpperCase()}`,
      dealAmount: comm.deal_amount,
      commissionAmount: comm.commission_amount || comm.deal_amount * comm.commission_rate,
      vatAmount: comm.vat_amount || (comm.commission_amount || 0) * 0.15,
      totalWithVat: comm.total_with_vat || 0,
      sellerName: seller?.full_name || "—",
      sellerPhone: seller?.phone || "—",
    });
    toast.success("تم تحميل الإيصال");
  };

  const getListingTitle = (comm: CommissionRow) => {
    const deal = deals[comm.deal_id];
    if (!deal) return "—";
    return listings[deal.listing_id]?.title || "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AiStar size={28} />
          <div>
            <h1 className="text-xl font-medium">الإدارة المالية</h1>
            <p className="text-sm text-muted-foreground">متابعة العمولات والفواتير والتقارير المالية</p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 mb-6">
            {alerts.map((alert, i) => (
              <div key={i} className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm",
                alert.type === "red" ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" :
                  "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800"
              )}>
                <AlertTriangle size={16} strokeWidth={1.5} />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <KpiCard
            icon={TrendingUp}
            label="الإيرادات المحصّلة"
            value={stats.totalRevenue}
            isCurrency
            sub={stats.revenueChange !== 0 ? `${stats.revenueChange > 0 ? "↑" : "↓"} ${Math.abs(Math.round(stats.revenueChange))}% عن الشهر السابق` : "هذا الشهر"}
            subColor={stats.revenueChange >= 0 ? "text-emerald-600" : "text-red-500"}
          />
          <KpiCard icon={Clock} label="عمولات معلقة" value={stats.pendingTotal} isCurrency sub={`${stats.pendingCount} عمولة`} />
          <KpiCard icon={CheckCircle2} label="قيد التحقق" value={stats.verifyingTotal} isCurrency sub={`${stats.verifyingCount} عمولة`} />
          <KpiCard icon={FileText} label="الفواتير الصادرة" value={stats.invoiceCount} sub="إجمالي الفواتير" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="commissions" className="text-xs rounded-lg">العمولات</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs rounded-lg">الفواتير</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs rounded-lg">التقارير</TabsTrigger>
          </TabsList>

          {/* --- Commissions Tab --- */}
          <TabsContent value="commissions">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الصفقة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-9 text-sm h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  {Object.entries(COMMISSION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="الفترة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="quarter">هذا الربع</SelectItem>
                  <SelectItem value="year">هذه السنة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-[11px] bg-muted/20">
                      <th className="text-right py-3 pr-4">الصفقة</th>
                      <th className="text-right py-3">البائع</th>
                      <th className="text-right py-3">قيمة الصفقة</th>
                      <th className="text-right py-3">العمولة</th>
                      <th className="text-right py-3">الضريبة</th>
                      <th className="text-right py-3">الإجمالي</th>
                      <th className="text-right py-3">الحالة</th>
                      <th className="text-right py-3">التاريخ</th>
                      <th className="text-center py-3 pl-4">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommissions.map(comm => {
                      const st = COMMISSION_STATUS[comm.payment_status] || { label: comm.payment_status, color: "bg-muted text-muted-foreground" };
                      const commAmount = comm.commission_amount || comm.deal_amount * comm.commission_rate;
                      const vatAmount = comm.vat_amount || commAmount * 0.15;
                      const total = comm.total_with_vat || commAmount + vatAmount;
                      return (
                        <tr key={comm.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="text-xs font-mono">#{comm.deal_id.slice(0, 8)}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{getListingTitle(comm)}</div>
                          </td>
                          <td className="py-3 text-xs">{profiles[comm.seller_id]?.full_name || "—"}</td>
                          <td className="py-3"><CurrencyCell value={comm.deal_amount} /></td>
                          <td className="py-3"><CurrencyCell value={commAmount} /></td>
                          <td className="py-3"><CurrencyCell value={vatAmount} /></td>
                          <td className="py-3"><CurrencyCell value={total} bold /></td>
                          <td className="py-3">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium whitespace-nowrap", st.color)}>{st.label}</span>
                          </td>
                          <td className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(comm.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 pl-4">
                            <div className="flex items-center justify-center gap-1">
                              {["unpaid", "reminder_sent", "paid_proof_uploaded", "paid_unverified"].includes(comm.payment_status) && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => handleVerify(comm.id)}>
                                  <BadgeCheck size={12} className="mr-1" />تأكيد
                                </Button>
                              )}
                              {["unpaid"].includes(comm.payment_status) && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => handleSendReminder(comm)}>
                                  <Send size={12} className="mr-1" />تذكير
                                </Button>
                              )}
                              {comm.payment_status === "verified" && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => handleDownloadReceipt(comm)}>
                                  <Receipt size={12} className="mr-1" />إيصال
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCommissions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-sm text-muted-foreground">لا توجد عمولات</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* --- Invoices Tab --- */}
          <TabsContent value="invoices">
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">غير مدفوعة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-[11px] bg-muted/20">
                      <th className="text-right py-3 pr-4">رقم الفاتورة</th>
                      <th className="text-right py-3">الإعلان</th>
                      <th className="text-right py-3">المبلغ</th>
                      <th className="text-right py-3">العمولة + الضريبة</th>
                      <th className="text-right py-3">الحالة</th>
                      <th className="text-right py-3">التاريخ</th>
                      <th className="text-center py-3 pl-4">تحميل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter(inv => invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter)
                      .map(inv => (
                        <tr key={inv.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                          <td className="py-3 pr-4 text-xs font-mono">#{inv.invoice_number}</td>
                          <td className="py-3 text-xs truncate max-w-[160px]">{inv.listing_title || "—"}</td>
                          <td className="py-3"><CurrencyCell value={inv.deal_amount} /></td>
                          <td className="py-3"><CurrencyCell value={inv.total_with_vat || inv.total_amount} bold /></td>
                          <td className="py-3">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-medium",
                              inv.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            )}>
                              {inv.status === "paid" ? "مدفوعة" : "معلقة"}
                            </span>
                          </td>
                          <td className="py-3 text-[11px] text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 pl-4 text-center">
                            <Link to={`/invoice/${inv.deal_id}`} className="text-[10px] text-primary hover:underline">
                              <Download size={14} className="inline" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* --- Reports Tab --- */}
          <TabsContent value="reports" className="space-y-6">
            {/* Monthly revenue chart */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                الإيرادات الشهرية (آخر 12 شهر)
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ReTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v.toLocaleString("en-US")} ر.س`, "الإيرادات"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#finGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Status pie */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-sm font-semibold mb-4">العمولات حسب الحالة</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Aging chart */}
              <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
                <h3 className="text-sm font-semibold mb-4">أعمار الديون</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ReTooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number, name: string) => [name === "amount" ? `${v.toLocaleString("en-US")} ر.س` : v, name === "amount" ? "المبلغ" : "العدد"]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="count" />
                      <Bar dataKey="amount" fill="#f97316" radius={[6, 6, 0, 0]} name="amount" />
                      <Legend formatter={(v) => v === "count" ? "العدد" : "المبلغ"} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// --- Helper components ---
const KpiCard = ({ icon: Icon, label, value, isCurrency, sub, subColor }: {
  icon: any; label: string; value: number; isCurrency?: boolean; sub?: string; subColor?: string;
}) => (
  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
    <Icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
    <div className="text-lg font-semibold flex items-center justify-center gap-1">
      {isCurrency ? (
        <>{Number(value).toLocaleString("en-US")}<SarSymbol size={12} /></>
      ) : value}
    </div>
    <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    {sub && <div className={cn("text-[9px] mt-0.5", subColor || "text-muted-foreground")}>{sub}</div>}
  </div>
);

const CurrencyCell = ({ value, bold }: { value: number; bold?: boolean }) => (
  <span className={cn("flex items-center gap-1 text-xs", bold && "font-medium text-primary")}>
    {Number(value).toLocaleString("en-US")}
    <SarSymbol size={8} />
  </span>
);

export default FinanceDashboardPage;
