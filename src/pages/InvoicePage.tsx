import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Printer, Download, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SarSymbol from "@/components/SarSymbol";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useSEO } from "@/hooks/useSEO";
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  createPdfMount, renderPagesToPdf, paginateSections,
  formatPdfDate, formatPdfPrice, escapeHtml, PDF_FONT_FAMILY,
  PDF_COLORS,
} from "@/lib/pdfShared";

interface InvoiceData {
  id: string;
  invoice_number: number;
  deal_id: string;
  seller_id: string;
  buyer_id: string;
  listing_title: string | null;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface ProfileInfo {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد الانتظار", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid: { label: "مدفوعة", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "ملغاة", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const InvoicePage = () => {
  const { id } = useParams<{ id: string }>();
  useSEO({ title: "الفاتورة", description: "عرض فاتورة الصفقة على سوق تقبيل", canonical: `/invoice/${id}` });
  const { user } = useAuthContext();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [seller, setSeller] = useState<ProfileInfo | null>(null);
  const [buyer, setBuyer] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (!data) { setLoading(false); return; }
      const inv = data as unknown as InvoiceData;
      setInvoice(inv);
      const [sellerRes, buyerRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, city").eq("user_id", inv.seller_id).maybeSingle(),
        supabase.from("profiles").select("full_name, email, phone, city").eq("user_id", inv.buyer_id).maybeSingle(),
      ]);
      setSeller(sellerRes.data as ProfileInfo | null);
      setBuyer(buyerRes.data as ProfileInfo | null);
      setLoading(false);
    })();
  }, [id]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const formatCurrency = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
        loadPdfLogo(),
        loadPdfLogoIcon(),
        generatePdfQR(`${window.location.origin}/invoice/${invoice.id}`),
        ensurePdfFontLoaded(),
      ]);

      const mount = createPdfMount();
      const commissionAmount = invoice.commission_amount ?? invoice.deal_amount * invoice.commission_rate;
      const statusLabel = STATUS_MAP[invoice.status]?.label || "قيد الانتظار";

      const partyCard = (label: string, profile: ProfileInfo | null) => `
        <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:18px;padding:16px;background:${PDF_COLORS.cardBg};display:grid;gap:6px;">
          <div style="font-size:10px;color:${PDF_COLORS.primary};font-weight:600;">${escapeHtml(label)}</div>
          <div style="font-size:14px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(profile?.full_name || "—")}</div>
          ${profile?.email ? `<div style="font-size:11px;color:${PDF_COLORS.textMuted};">${escapeHtml(profile.email)}</div>` : ""}
          ${profile?.phone ? `<div style="font-size:11px;color:${PDF_COLORS.textMuted};direction:ltr;text-align:right;">${escapeHtml(profile.phone)}</div>` : ""}
          ${profile?.city ? `<div style="font-size:11px;color:${PDF_COLORS.textMuted};">${escapeHtml(profile.city)}</div>` : ""}
        </div>`;

      const sections: HTMLElement[] = [];

      // Status badge
      sections.push(buildPdfSection("حالة الفاتورة", `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="padding:8px 18px;border-radius:999px;background:${PDF_COLORS.primaryLight};color:${PDF_COLORS.primary};font-size:13px;font-weight:600;">
            ${escapeHtml(statusLabel)}
          </div>
          <div style="font-size:11px;color:${PDF_COLORS.textMuted};">تاريخ الإصدار: ${formatPdfDate(invoice.created_at)}</div>
        </div>
      `, true));

      // Parties
      sections.push(buildPdfSection("أطراف الفاتورة", `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          ${partyCard("البائع", seller)}
          ${partyCard("المشتري", buyer)}
        </div>
      `));

      // Financial details
      sections.push(buildPdfSection("تفاصيل الصفقة", `
        <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:16px;overflow:hidden;">
          <table style="width:100%;font-size:12px;color:${PDF_COLORS.text};border-collapse:collapse;font-family:${PDF_FONT_FAMILY};">
            <thead>
              <tr style="background:${PDF_COLORS.cardBg};">
                <th style="text-align:right;padding:12px 16px;font-weight:600;font-size:11px;color:${PDF_COLORS.textMuted};">الوصف</th>
                <th style="text-align:left;padding:12px 16px;font-weight:600;font-size:11px;color:${PDF_COLORS.textMuted};">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top:0.5px solid ${PDF_COLORS.border};">
                <td style="padding:12px 16px;">
                  <div style="font-weight:500;">${escapeHtml(invoice.listing_title || "صفقة تجارية")}</div>
                  <div style="font-size:10px;color:${PDF_COLORS.textMuted};margin-top:2px;">رقم الصفقة: ${invoice.deal_id.slice(0, 8)}...</div>
                </td>
                <td style="padding:12px 16px;text-align:left;font-family:monospace;font-weight:500;">${formatCurrency(invoice.deal_amount)} ﷼</td>
              </tr>
              <tr style="border-top:0.5px solid ${PDF_COLORS.border};background:${PDF_COLORS.cardBg};">
                <td style="padding:12px 16px;">عمولة المنصة (${(invoice.commission_rate * 100).toFixed(0)}%)</td>
                <td style="padding:12px 16px;text-align:left;font-family:monospace;">${formatCurrency(commissionAmount)} ﷼</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid ${PDF_COLORS.primary};">
                <td style="padding:14px 16px;font-weight:700;font-size:14px;color:${PDF_COLORS.primary};">الإجمالي</td>
                <td style="padding:14px 16px;text-align:left;font-weight:700;font-size:14px;font-family:monospace;color:${PDF_COLORS.primary};">${formatCurrency(invoice.total_amount)} ﷼</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `));

      // QR section
      if (qrDataUrl) {
        sections.push(buildPdfSection("التحقق الإلكتروني", `
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:12px;">
            <img src="${qrDataUrl}" alt="QR" style="width:64px;height:64px;border-radius:8px;" />
            <div style="font-size:10px;color:${PDF_COLORS.textMuted};line-height:2;text-align:center;">
              يمكنكم مسح الرمز للتحقق من الفاتورة إلكترونياً<br />
              جميع المبالغ بالريال السعودي
            </div>
          </div>
        `));
      }

      const shellBuilder = (pageNumber: number) => buildPdfPageShell({
        documentTitle: "فاتورة",
        documentSubtitle: `#${String(invoice.invoice_number).padStart(6, "0")} — ${escapeHtml(invoice.listing_title || "صفقة تجارية")}`,
        documentMeta: [`تاريخ الإصدار: ${formatPdfDate(invoice.created_at)}`],
        logoBase64,
        logoIconBase64,
        pageNumber,
        qrDataUrl,
        showQrInFooter: false,
      });

      const pages = paginateSections({ sections, mount, shellBuilder });
      await renderPagesToPdf({ pages, fileName: `فاتورة-${String(invoice.invoice_number).padStart(6, "0")}.pdf` });
      document.body.removeChild(mount);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-muted-foreground/40" />
        <p className="text-lg text-muted-foreground">الفاتورة غير موجودة</p>
        <Link to="/dashboard"><Button variant="outline">العودة للوحة التحكم</Button></Link>
      </div>
    );
  }

  const status = STATUS_MAP[invoice.status] || STATUS_MAP.pending;
  const commissionAmount = invoice.commission_amount ?? invoice.deal_amount * invoice.commission_rate;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" />
          العودة
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 ml-1" />
            طباعة
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
            <Download className="w-4 h-4 ml-1" />
            {pdfLoading ? "جاري التحميل..." : "تحميل PDF"}
          </Button>
        </div>
      </div>

      <div
        ref={printRef}
        className="bg-white text-foreground border border-border rounded-xl shadow-sm p-8 md:p-12 print:shadow-none print:border-none print:rounded-none"
        style={{ direction: "rtl", colorScheme: "light", color: "#1a2332" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-primary/20">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src={logoIcon} alt="سوق تقبيل" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#1a73e8" }}>سوق تقبيل</h1>
                <p className="text-xs" style={{ color: "#6b7280" }}>منصة التقبيل الرقمية الأولى</p>
              </div>
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold mb-1" style={{ color: "#1a2332" }}>فاتورة</h2>
            <p className="text-sm font-mono" style={{ color: "#6b7280" }}>#{String(invoice.invoice_number).padStart(6, "0")}</p>
            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{formatDate(invoice.created_at)}</p>
            <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${status.cls}`}>{status.label}</span>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <PartyCard label="البائع" profile={seller} />
          <PartyCard label="المشتري" profile={buyer} />
        </div>

        {/* Deal details table */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>تفاصيل الصفقة</h3>
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
            <table className="w-full text-sm" style={{ color: "#1a2332" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "#374151" }}>الوصف</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#374151" }}>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{invoice.listing_title || "صفقة تجارية"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>رقم الصفقة: {invoice.deal_id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-3 text-left font-mono">{formatCurrency(invoice.deal_amount)} <SarSymbol size="0.85em" /></td>
                </tr>
                <tr style={{ borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                  <td className="px-4 py-3">عمولة المنصة ({(invoice.commission_rate * 100).toFixed(0)}%)</td>
                  <td className="px-4 py-3 text-left font-mono">{formatCurrency(commissionAmount)} <SarSymbol size="0.85em" /></td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #1a73e8" }}>
                  <td className="px-4 py-4 font-bold text-base" style={{ color: "#1a73e8" }}>الإجمالي</td>
                  <td className="px-4 py-4 text-left font-bold text-base font-mono" style={{ color: "#1a73e8" }}>
                    {formatCurrency(invoice.total_amount)} <SarSymbol size="0.9em" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t text-center" style={{ borderColor: "#e5e7eb" }}>
          <p className="text-xs" style={{ color: "#9ca3af" }}>هذه فاتورة صادرة من منصة سوق تقبيل — جميع المبالغ بالريال السعودي</p>
          <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>soqtaqbeel.com</p>
        </div>
      </div>
    </div>
  );
};

function PartyCard({ label, profile }: { label: string; profile: ProfileInfo | null }) {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "#1a73e8" }}>{label}</p>
      <p className="font-medium text-sm" style={{ color: "#1a2332" }}>{profile?.full_name || "—"}</p>
      {profile?.email && <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{profile.email}</p>}
      {profile?.phone && <p className="text-xs" style={{ color: "#6b7280" }}>{profile.phone}</p>}
      {profile?.city && <p className="text-xs" style={{ color: "#6b7280" }}>{profile.city}</p>}
    </div>
  );
}

export default InvoicePage;
