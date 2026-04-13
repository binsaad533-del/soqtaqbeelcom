import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, TrendingUp, Clock, CheckCircle2, FileText, AlertTriangle, Download,
  Search, Send, BadgeCheck, Receipt, Target, Percent, DollarSign, Calendar,
  ClipboardList
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
  last_reminder_at: string | null;
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
  [dealId: string]: { listing_id: string; deal_type: string | null; agreed_price: number | null; status?: string };
}

interface ListingMap {
  [listingId: string]: { title: string | null };
}

interface AuditRow {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string | null;
  details: any;
  created_at: string;
}

const COMMISSION_STATUS: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مسدد", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  reminder_sent: { label: "تم التذكير", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  paid_proof_uploaded: { label: "إثبات مرفوع", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { label: "مسدد ✓", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  waived: { label: "معفى", color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400" },
};

const MONTH_LABELS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#94a3b8"];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  commission_verified: "تأكيد سداد عمولة",
  commission_reminder: "إرسال تذكير عمولة",
  payment_confirmed: "تأكيد دفع",
  role_changed: "تغيير دور مستخدم",
  deal_finalized: "تأكيد صفقة نهائياً",
  deal_completed: "إتمام صفقة",
  invoice_created: "إنشاء فاتورة",
};

const FinanceDashboardPage = () => {
  useSEO({ title: "الإدارة المالية", description: "لوحة التحكم المالية" });
  const { user } = useAuthContext();

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [deals, setDeals] = useState<DealMap>({});
  const [listings, setListings] = useState<ListingMap>({});
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [activeDeals, setActiveDeals] = useState<{ status: string; agreed_price: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [exportPeriod, setExportPeriod] = useState("quarter");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [commRes, invRes, activeDealsRes, auditRes] = await Promise.all([
      supabase.from("deal_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("status, agreed_price").in("status", ["negotiating", "in_progress"]),
      supabase.from("audit_logs").select("*")
        .in("action", ["commission_verified", "commission_reminder", "payment_confirmed", "deal_finalized", "deal_completed", "role_changed"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const comms = (commRes.data || []) as CommissionRow[];
    const invs = (invRes.data || []) as InvoiceRow[];
    setCommissions(comms);
    setInvoices(invs);
    setActiveDeals(activeDealsRes.data || []);
    setAuditLogs((auditRes.data || []) as AuditRow[]);

    // Gather unique IDs
    const sellerIds = new Set<string>();
    const dealIds = new Set<string>();
    comms.forEach(c => { sellerIds.add(c.seller_id); dealIds.add(c.deal_id); });
    invs.forEach(i => { sellerIds.add(i.seller_id); sellerIds.add(i.buyer_id); dealIds.add(i.deal_id); });

    // Also gather user_ids from audit logs
    (auditRes.data || []).forEach((a: any) => { if (a.user_id) sellerIds.add(a.user_id); });

    // Fetch profiles
    if (sellerIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", [...sellerIds]);
      const map: ProfileMap = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, phone: p.phone }; });
      setProfiles(map);
    }

    // Fetch deals
    if (dealIds.size > 0) {
      const { data: dls } = await supabase.from("deals").select("id, listing_id, deal_type, agreed_price, status").in("id", [...dealIds]);
      const dMap: DealMap = {};
      const listingIds = new Set<string>();
      (dls || []).forEach((d: any) => { dMap[d.id] = d; listingIds.add(d.listing_id); });
      setDeals(dMap);

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

    const verifying = commissions.filter(c => c.payment_status === "paid_proof_uploaded");
    const verifyingTotal = verifying.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);

    // --- New KPIs ---
    // Average collection time
    const verifiedWithDates = verified.filter(c => c.marked_paid_at);
    const avgCollectionDays = verifiedWithDates.length > 0
      ? verifiedWithDates.reduce((s, c) => {
          const created = new Date(c.created_at).getTime();
          const paid = new Date(c.marked_paid_at!).getTime();
          return s + (paid - created) / 86400000;
        }, 0) / verifiedWithDates.length
      : 0;

    // Collection rate
    const totalComms = commissions.filter(c => c.payment_status !== "waived").length;
    const collectionRate = totalComms > 0 ? (verified.length / totalComms) * 100 : 0;

    // Largest pending commission
    let largestPending = { amount: 0, sellerName: "—" };
    pending.forEach(c => {
      const amt = c.total_with_vat || c.commission_amount || 0;
      if (amt > largestPending.amount) {
        largestPending = { amount: amt, sellerName: profiles[c.seller_id]?.full_name || "—" };
      }
    });

    // Quarter VAT collected
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterVat = verified
      .filter(c => new Date(c.created_at) >= quarterStart)
      .reduce((s, c) => s + (c.vat_amount || 0), 0);

    // Revenue forecast
    const forecast = activeDeals.reduce((s, d) => {
      const price = d.agreed_price || 0;
      const prob = d.status === "in_progress" ? 0.8 : 0.4;
      return s + price * 0.01 * prob;
    }, 0);

    return {
      totalRevenue, thisMonthRevenue, revenueChange,
      pendingCount: pending.length, pendingTotal,
      verifyingCount: verifying.length, verifyingTotal,
      invoiceCount: invoices.length,
      avgCollectionDays, collectionRate, largestPending, quarterVat, forecast,
    };
  }, [commissions, invoices, profiles, activeDeals]);

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

  // --- Monthly comparison (last 6 months) ---
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const rows: { month: string; deals: number; total: number; collected: number; pending: number; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthComms = commissions.filter(c => c.created_at.startsWith(key));
      const total = monthComms.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
      const collected = monthComms.filter(c => c.payment_status === "verified").reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
      const pendingAmt = total - collected;
      rows.push({
        month: MONTH_LABELS[d.getMonth()] + " " + d.getFullYear(),
        deals: monthComms.length,
        total,
        collected,
        pending: pendingAmt,
        rate: total > 0 ? (collected / total) * 100 : 0,
      });
    }
    return rows;
  }, [commissions]);

  // --- Financial alerts ---
  const alerts = useMemo(() => {
    const now = new Date();
    const result: { type: "red" | "yellow"; message: string }[] = [];

    // Quarterly tax reminder
    const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    const currentMonth = now.getMonth();
    if (quarterMonths.includes(currentMonth) && now.getDate() <= 15) {
      result.push({
        type: "yellow",
        message: `تذكير: موعد تقديم إقرار ضريبة القيمة المضافة — إجمالي الضريبة المحصّلة هذا الربع: ${stats.quarterVat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`
      });
    }

    const overdue30 = commissions.filter(c =>
      ["unpaid", "reminder_sent"].includes(c.payment_status) &&
      (Date.now() - new Date(c.created_at).getTime()) > 30 * 86400000
    );
    if (overdue30.length > 0) result.push({ type: "red", message: `${overdue30.length} عمولات متأخرة أكثر من 30 يوم` });

    const pendingVerify7 = commissions.filter(c =>
      c.payment_status === "paid_proof_uploaded" &&
      (Date.now() - new Date(c.updated_at).getTime()) > 7 * 86400000
    );
    if (pendingVerify7.length > 0) result.push({ type: "yellow", message: `${pendingVerify7.length} عمولات بانتظار التحقق أكثر من 7 أيام` });

    return result;
  }, [commissions, stats.quarterVat]);

  // --- Actions ---
  const handleVerify = async (commId: string) => {
    const { error } = await supabase
      .from("deal_commissions")
      .update({ payment_status: "verified", marked_paid_at: new Date().toISOString() })
      .eq("id", commId);
    if (error) { toast.error("خطأ في تأكيد السداد"); return; }
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id, action: "commission_verified", resource_type: "commission", resource_id: commId,
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
    const commAmount = comm.commission_amount || comm.deal_amount * comm.commission_rate;
    await generateCommissionReceiptPdf({
      receiptNumber: `RCT-${new Date().getFullYear()}-${comm.id.slice(0, 6).toUpperCase()}`,
      paidAt: comm.marked_paid_at || comm.updated_at,
      dealTitle: listingTitle,
      agreementNumber: `AGR-${comm.deal_id.slice(0, 8).toUpperCase()}`,
      dealAmount: comm.deal_amount,
      commissionRate: comm.commission_rate,
      commissionAmount: commAmount,
      vatAmount: comm.vat_amount || commAmount * 0.15,
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

  // --- PDF Export ---
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const {
        ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
        buildPdfPageShell, buildPdfSection, buildPdfInfoGrid, buildPdfDisclaimer,
        createPdfMount, paginateSections, renderPagesToPdf, formatPdfPrice, formatPdfDate,
        PDF_COLORS, PDF_FONT_FAMILY,
      } = await import("@/lib/pdfShared");

      await ensurePdfFontLoaded();
      const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
        loadPdfLogo(), loadPdfLogoIcon(),
        generatePdfQR("https://soqtaqbeel.com/admin/finance"),
      ]);

      // Filter commissions by export period
      const now = new Date();
      let start: Date;
      let periodLabel: string;
      switch (exportPeriod) {
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = MONTH_LABELS[now.getMonth()] + " " + now.getFullYear();
          break;
        case "quarter":
          start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = `الربع ${Math.floor(now.getMonth() / 3) + 1} — ${now.getFullYear()}`;
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          periodLabel = `${now.getFullYear()}`;
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = MONTH_LABELS[now.getMonth()] + " " + now.getFullYear();
      }

      const periodComms = commissions.filter(c => new Date(c.created_at) >= start);
      const verifiedComms = periodComms.filter(c => c.payment_status === "verified");
      const pendingComms = periodComms.filter(c => ["unpaid", "reminder_sent"].includes(c.payment_status));
      const totalCollected = verifiedComms.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
      const totalPending = pendingComms.reduce((s, c) => s + (c.total_with_vat || c.commission_amount || 0), 0);
      const totalVat = periodComms.filter(c => c.payment_status === "verified").reduce((s, c) => s + (c.vat_amount || 0), 0);

      const mount = createPdfMount();
      const shellBuilder = (pageNumber: number) => buildPdfPageShell({
        documentTitle: "كشف حساب مالي",
        documentSubtitle: `الفترة: ${periodLabel}`,
        documentMeta: [
          `تاريخ الإصدار: ${formatPdfDate(now.toISOString())}`,
          "الرقم الضريبي: 310661528400003",
          "شركة عين جساس للمقاولات",
        ],
        logoBase64, logoIconBase64, pageNumber, qrDataUrl,
      });

      // Summary section
      const summarySection = buildPdfSection("ملخص الفترة", buildPdfInfoGrid([
        { label: "إجمالي العمولات", value: `${formatPdfPrice(totalCollected + totalPending)} ﷼`, emphasized: true },
        { label: "المحصّل", value: `${formatPdfPrice(totalCollected)} ﷼` },
        { label: "المعلّق", value: `${formatPdfPrice(totalPending)} ﷼` },
        { label: "إجمالي الضريبة", value: `${formatPdfPrice(totalVat)} ﷼` },
        { label: "عدد العمولات", value: `${periodComms.length}` },
        { label: "نسبة التحصيل", value: `${periodComms.length > 0 ? ((verifiedComms.length / periodComms.length) * 100).toFixed(1) : 0}%` },
      ]), true);

      // Commission table
      const tableRows = periodComms.map(c => {
        const commAmount = c.commission_amount || c.deal_amount * c.commission_rate;
        const vatAmt = c.vat_amount || commAmount * 0.15;
        const total = c.total_with_vat || commAmount + vatAmt;
        const statusLabel = COMMISSION_STATUS[c.payment_status]?.label || c.payment_status;
        return `<tr>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;">${formatPdfDate(c.created_at)}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;">${getListingTitle(c)}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;">${profiles[c.seller_id]?.full_name || "—"}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;direction:ltr;text-align:right;">${formatPdfPrice(commAmount)}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;direction:ltr;text-align:right;">${formatPdfPrice(vatAmt)}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;direction:ltr;text-align:right;font-weight:600;">${formatPdfPrice(total)}</td>
          <td style="padding:6px 8px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};font-size:9px;">${statusLabel}</td>
        </tr>`;
      }).join("");

      const tableHtml = `<div style="overflow:hidden;border-radius:10px;border:0.5px solid ${PDF_COLORS.borderLight};">
        <table style="width:100%;border-collapse:collapse;font-family:${PDF_FONT_FAMILY};direction:rtl;text-align:right;">
          <thead>
            <tr style="background:${PDF_COLORS.primaryLight};">
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">التاريخ</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">الصفقة</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">البائع</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">العمولة</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">الضريبة</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">الإجمالي</th>
              <th style="padding:8px;font-size:9px;font-weight:600;border-bottom:1px solid ${PDF_COLORS.border};">الحالة</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;

      const tableSection = buildPdfSection("تفاصيل العمولات", tableHtml);
      const disclaimer = buildPdfDisclaimer("general");

      const sections = [summarySection, tableSection, disclaimer];
      const pages = paginateSections({ sections, mount, shellBuilder });
      await new Promise(r => setTimeout(r, 400));
      await renderPagesToPdf({ pages, fileName: `كشف-حساب-${periodLabel}.pdf` });
      document.body.removeChild(mount);
      toast.success("تم تصدير كشف الحساب");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("خطأ في تصدير الكشف");
    } finally {
      setExportingPdf(false);
    }
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

        {/* KPI Cards Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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

        {/* KPI Cards Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <KpiCard icon={Calendar} label="متوسط وقت التحصيل" value={stats.avgCollectionDays} sub="يوم" isDecimal />
          <KpiCard icon={Percent} label="نسبة التحصيل" value={stats.collectionRate} sub="%" isDecimal />
          <KpiCard
            icon={DollarSign}
            label="أكبر عمولة معلقة"
            value={stats.largestPending.amount}
            isCurrency
            sub={stats.largestPending.sellerName}
          />
          <KpiCard icon={Target} label="ضريبة الربع" value={stats.quarterVat} isCurrency sub="إجمالي ضريبة القيمة المضافة" />
        </div>

        {/* Revenue Forecast Card */}
        {stats.forecast > 0 && (
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Target size={20} className="text-primary flex-shrink-0" strokeWidth={1.3} />
            <div>
              <div className="text-sm font-medium">إيرادات متوقعة الشهر القادم</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {stats.forecast.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <SarSymbol size={12} />
              </div>
              <div className="text-[10px] text-muted-foreground">محسوبة من الصفقات الجارية × احتمالية الإتمام</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl">
            <TabsTrigger value="commissions" className="text-xs rounded-lg">العمولات</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs rounded-lg">الفواتير</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs rounded-lg">التقارير</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs rounded-lg">السجل</TabsTrigger>
          </TabsList>

          {/* --- Commissions Tab --- */}
          <TabsContent value="commissions">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="بحث بالاسم أو رقم الصفقة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-9 text-sm h-9" />
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
                      <th className="text-right py-3">آخر تذكير</th>
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
                            {comm.last_reminder_at
                              ? new Date(comm.last_reminder_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(comm.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 pl-4">
                            <div className="flex items-center justify-center gap-1">
                              {["unpaid", "reminder_sent", "paid_proof_uploaded"].includes(comm.payment_status) && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => handleVerify(comm.id)}>
                                  <BadgeCheck size={12} className="mr-1" />تأكيد
                                </Button>
                              )}
                              {["unpaid", "reminder_sent"].includes(comm.payment_status) && (
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
                        <td colSpan={10} className="text-center py-10 text-sm text-muted-foreground">لا توجد عمولات</td>
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
            {/* PDF Export */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30 flex flex-wrap items-center gap-3">
              <FileText size={16} className="text-primary" />
              <span className="text-sm font-medium">تصدير كشف حساب</span>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="quarter">هذا الربع</SelectItem>
                  <SelectItem value="year">هذه السنة</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleExportPdf} disabled={exportingPdf}>
                {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                تصدير PDF
              </Button>
            </div>

            {/* Monthly comparison table */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ClipboardList size={14} className="text-primary" />
                مقارنة شهرية (آخر 6 أشهر)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-[11px] bg-muted/20">
                      <th className="text-right py-2 pr-3">الشهر</th>
                      <th className="text-right py-2">عدد الصفقات</th>
                      <th className="text-right py-2">إجمالي العمولات</th>
                      <th className="text-right py-2">المحصّل</th>
                      <th className="text-right py-2">المعلّق</th>
                      <th className="text-right py-2">نسبة التحصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyComparison.map((row, i) => (
                      <tr key={i} className="border-b border-border/10 hover:bg-muted/20">
                        <td className="py-2 pr-3 text-xs font-medium">{row.month}</td>
                        <td className="py-2 text-xs">{row.deals}</td>
                        <td className="py-2"><CurrencyCell value={row.total} /></td>
                        <td className="py-2"><CurrencyCell value={row.collected} /></td>
                        <td className="py-2"><CurrencyCell value={row.pending} /></td>
                        <td className="py-2 text-xs font-medium">{row.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparison bar chart */}
            <div className="bg-card rounded-2xl p-5 shadow-soft border border-border/30">
              <h3 className="text-sm font-semibold mb-4">محصّل vs معلّق (آخر 6 أشهر)</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparison} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ReTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`]}
                    />
                    <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="المحصّل" />
                    <Bar dataKey="pending" fill="#f97316" radius={[6, 6, 0, 0]} name="المعلّق" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

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

          {/* --- Audit Log Tab --- */}
          <TabsContent value="audit">
            <div className="bg-card rounded-2xl shadow-soft border border-border/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <ClipboardList size={14} className="text-primary" />
                <span className="text-sm font-medium">سجل المراسلات والإجراءات المالية</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground text-[11px] bg-muted/20">
                      <th className="text-right py-2 pr-4">التاريخ</th>
                      <th className="text-right py-2">الإجراء</th>
                      <th className="text-right py-2">المنفّذ</th>
                      <th className="text-right py-2">المرجع</th>
                      <th className="text-right py-2 pl-4">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                        <td className="py-2 pr-4 text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          <span className="text-[9px] mr-1">{new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td className="py-2 text-xs font-medium">{AUDIT_ACTION_LABELS[log.action] || log.action}</td>
                        <td className="py-2 text-xs">{log.user_id ? (profiles[log.user_id]?.full_name || log.user_id.slice(0, 8)) : "النظام"}</td>
                        <td className="py-2 text-[11px] font-mono text-muted-foreground">{log.resource_id ? `#${log.resource_id.slice(0, 8)}` : "—"}</td>
                        <td className="py-2 pl-4 text-[10px] text-muted-foreground max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">لا توجد سجلات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// --- Helper components ---
const KpiCard = ({ icon: Icon, label, value, isCurrency, isDecimal, sub, subColor }: {
  icon: any; label: string; value: number; isCurrency?: boolean; isDecimal?: boolean; sub?: string; subColor?: string;
}) => (
  <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/30 text-center">
    <Icon size={18} className="mx-auto mb-2 text-primary" strokeWidth={1.3} />
    <div className="text-lg font-semibold flex items-center justify-center gap-1">
      {isCurrency ? (
        <>{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<SarSymbol size={12} /></>
      ) : isDecimal ? (
        Number(value).toFixed(1)
      ) : value}
    </div>
    <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    {sub && <div className={cn("text-[9px] mt-0.5", subColor || "text-muted-foreground")}>{sub}</div>}
  </div>
);

const CurrencyCell = ({ value, bold }: { value: number; bold?: boolean }) => (
  <span className={cn("flex items-center gap-1 text-xs", bold && "font-medium text-primary")}>
    {Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    <SarSymbol size={8} />
  </span>
);

export default FinanceDashboardPage;
