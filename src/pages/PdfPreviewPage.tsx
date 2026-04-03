import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  buildPdfBankSection, buildPdfQrSection,
  createPdfMount, renderPagesToPdf, paginateSections,
  formatPdfPrice, formatPdfDate, escapeHtml, PDF_COLORS,
} from "@/lib/pdfShared";
import { BANK_DETAILS, COMMISSION_RATE, calculateCommission } from "@/hooks/useCommissions";
import { buildAgreementPdfPages } from "@/lib/agreementPdf/template";
import type { AgreementPdfData } from "@/lib/agreementPdf/types";

const SAMPLE_AGREEMENT: AgreementPdfData = {
  agreementNumber: "AGR-2026-001234",
  version: 1,
  createdAt: "2026-04-01T10:00:00Z",
  dealTitle: "مطعم شاورما — جبره الطائف",
  dealType: "تقبيل نشاط تجاري",
  businessActivity: "مطاعم ومأكولات",
  location: "الطائف — حي جبره",
  sellerName: "أحمد بن محمد المالكي",
  sellerContact: "0500668089",
  sellerApproved: true,
  sellerApprovedAt: "2026-04-02T14:30:00Z",
  buyerName: "خالد بن عبدالله العمري",
  buyerContact: "0551234567",
  buyerApproved: true,
  buyerApprovedAt: "2026-04-02T16:00:00Z",
  financialTerms: {
    agreedPrice: 350000,
    currency: "﷼",
    paymentNote: "الدفع عند توقيع العقد الرسمي",
  },
  dealAmount: 350000,
  commissionRate: COMMISSION_RATE,
  commissionAmount: calculateCommission(350000),
  includedAssets: ["معدات المطبخ كاملة", "الديكورات والأثاث", "المكيفات (4 وحدات)", "لوحة المحل والإضاءة الخارجية"],
  excludedAssets: ["المخزون الغذائي الحالي", "الأدوات الشخصية"],
  leaseDetails: { annualRent: "60,000 ﷼", remaining: "3 سنوات" },
  licenseStatus: { municipality: "سارية حتى 2027/06", civilDefense: "سارية", cameras: "4 كاميرات مراقبة" },
  liabilities: { financialLiabilities: "لا توجد", delayedSalaries: "لا يوجد", unpaidRent: "لا يوجد" },
  documentsReferenced: ["السجل التجاري", "عقد الإيجار", "رخصة البلدية", "رخصة الدفاع المدني"],
  declarations: {
    buyerDeclares: "أقر بأنني اطلعت على جميع تفاصيل الصفقة وأوافق عليها.",
    sellerDeclares: "أقر بصحة جميع المعلومات المقدمة في هذا الإعلان.",
    platformNote: "المنصة وسيط تقني فقط — الاتفاق يتم مباشرة بين الطرفين.",
  },
  importantNotes: ["يتم نقل الملكية خلال 30 يوم عمل من تاريخ التوقيع"],
  amendmentReason: null,
  assetPhotos: [],
};

type TemplateKey = "invoice" | "agreement" | "feasibility" | "legal";

const TEMPLATES: { key: TemplateKey; label: string; icon: string }[] = [
  { key: "invoice", label: "الفاتورة", icon: "🧾" },
  { key: "agreement", label: "الاتفاقية", icon: "📄" },
  { key: "feasibility", label: "دراسة الجدوى", icon: "📊" },
  { key: "legal", label: "التأكيد القانوني", icon: "⚖️" },
];

const PdfPreviewPage = () => {
  useSEO({ title: "معاينة نماذج PDF", description: "معاينة جميع قوالب PDF في المنصة" });
  const [loading, setLoading] = useState<TemplateKey | null>(null);

  const generateInvoice = async () => {
    const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
      loadPdfLogo(), loadPdfLogoIcon(),
      generatePdfQR(`${window.location.origin}/invoice/sample-001`),
      ensurePdfFontLoaded(),
    ]);

    const mount = createPdfMount();
    const dealAmount = 350000;
    const commissionAmount = calculateCommission(dealAmount);
    const vatAmount = commissionAmount * 0.15;
    const totalWithVat = commissionAmount + vatAmount;

    const sections: HTMLElement[] = [];

    sections.push(buildPdfSection("حالة الفاتورة", `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="padding:6px 16px;border-radius:999px;background:${PDF_COLORS.primaryLight};color:${PDF_COLORS.primary};font-size:12px;font-weight:600;">مدفوعة</div>
        <div style="font-size:10px;color:${PDF_COLORS.textMuted};">تاريخ الإصدار: 2026/04/01</div>
      </div>
    `, true));

    sections.push(buildPdfSection("أطراف الفاتورة", `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        ${["البائع|أحمد المالكي|a@test.com|0500668089|الطائف", "المشتري|خالد العمري|k@test.com|0551234567|الرياض"]
          .map(p => { const [label, name, email, phone, city] = p.split("|"); return `
            <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:14px;background:${PDF_COLORS.cardBg};display:grid;gap:5px;">
              <div style="font-size:9px;color:${PDF_COLORS.primary};font-weight:600;">${label}</div>
              <div style="font-size:13px;font-weight:600;color:${PDF_COLORS.text};">${name}</div>
              <div style="font-size:10px;color:${PDF_COLORS.textMuted};">${email}</div>
              <div style="font-size:10px;color:${PDF_COLORS.textMuted};direction:ltr;text-align:right;">${phone}</div>
              <div style="font-size:10px;color:${PDF_COLORS.textMuted};">${city}</div>
            </div>`; }).join("")}
      </div>
    `));

    sections.push(buildPdfSection("تفاصيل الصفقة", `
      <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;overflow:hidden;">
        <table style="width:100%;font-size:11px;color:${PDF_COLORS.text};border-collapse:collapse;font-family:inherit;">
          <thead><tr style="background:${PDF_COLORS.cardBg};">
            <th style="text-align:right;padding:10px 14px;font-weight:600;font-size:10px;color:${PDF_COLORS.textMuted};">الوصف</th>
            <th style="text-align:left;padding:10px 14px;font-weight:600;font-size:10px;color:${PDF_COLORS.textMuted};">المبلغ</th>
          </tr></thead>
          <tbody>
            <tr style="border-top:0.5px solid ${PDF_COLORS.border};"><td style="padding:10px 14px;font-weight:500;">مطعم شاورما — جبره الطائف</td><td style="padding:10px 14px;text-align:left;font-family:monospace;">${formatPdfPrice(dealAmount)} ﷼</td></tr>
            <tr style="border-top:0.5px solid ${PDF_COLORS.border};background:${PDF_COLORS.cardBg};"><td style="padding:10px 14px;">عمولة المنصة (1%)</td><td style="padding:10px 14px;text-align:left;font-family:monospace;">${formatPdfPrice(commissionAmount)} ﷼</td></tr>
            <tr style="border-top:0.5px solid ${PDF_COLORS.border};"><td style="padding:10px 14px;">ضريبة القيمة المضافة (15%)</td><td style="padding:10px 14px;text-align:left;font-family:monospace;">${formatPdfPrice(vatAmount)} ﷼</td></tr>
          </tbody>
          <tfoot><tr style="border-top:2px solid ${PDF_COLORS.primary};"><td style="padding:12px 14px;font-weight:700;font-size:13px;color:${PDF_COLORS.primary};">الإجمالي المستحق</td><td style="padding:12px 14px;text-align:left;font-weight:700;font-size:13px;font-family:monospace;color:${PDF_COLORS.primary};">${formatPdfPrice(totalWithVat)} ﷼</td></tr></tfoot>
        </table>
      </div>
    `));

    sections.push(buildPdfBankSection(BANK_DETAILS, { rate: COMMISSION_RATE, amount: commissionAmount, dealAmount }));
    if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

    const shellBuilder = (pageNumber: number) => buildPdfPageShell({
      documentTitle: "فاتورة ضريبية",
      documentSubtitle: "#000001 — مطعم شاورما — جبره الطائف",
      documentMeta: ["تاريخ الإصدار: 2026/04/01", `الرقم الضريبي: ${BANK_DETAILS.taxNumber}`],
      logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
    });

    const pages = paginateSections({ sections, mount, shellBuilder });
    await renderPagesToPdf({ pages, fileName: "نموذج-فاتورة.pdf" });
    document.body.removeChild(mount);
  };

  const generateAgreement = async () => {
    const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
      loadPdfLogo(), loadPdfLogoIcon(),
      generatePdfQR(`${window.location.origin}/agreement/AGR-2026-001234`),
      ensurePdfFontLoaded(),
    ]);
    const mount = createPdfMount();
    const pages = buildAgreementPdfPages({ data: SAMPLE_AGREEMENT, logoBase64, logoIconBase64, qrDataUrl, mount });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const { protectPdf } = await import("@/lib/pdfShared");
    const pdf = new jsPDF("p", "mm", "a4");
    protectPdf(pdf);
    for (const [i, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", width: 794, height: 1123, windowWidth: 794, windowHeight: 1123 });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }
    pdf.save("نموذج-اتفاقية.pdf");
    document.body.removeChild(mount);
  };

  const generateFeasibility = async () => {
    const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
      loadPdfLogo(), loadPdfLogoIcon(),
      generatePdfQR(`${window.location.origin}/listing/sample`),
      ensurePdfFontLoaded(),
    ]);
    const mount = createPdfMount();
    const sections: HTMLElement[] = [];

    sections.push(buildPdfSection("الملخص التنفيذي", `
      <div style="font-size:11px;line-height:2;color:${PDF_COLORS.text};">
        يُظهر التحليل أن المشروع يتمتع بإمكانيات ربحية جيدة مع فترة استرداد تتراوح بين 12-18 شهراً. يقع في منطقة ذات كثافة سكانية عالية مع منافسة معتدلة.
      </div>
    `, true));

    sections.push(buildPdfSection("نظرة على الاستثمار", buildPdfInfoGrid([
      { label: "إجمالي الاستثمار", value: "350,000 ﷼", emphasized: true },
      { label: "التكاليف التشغيلية الشهرية", value: "25,000 ﷼" },
      { label: "الإيرادات المتوقعة شهرياً", value: "45,000 ﷼" },
      { label: "فترة الاسترداد", value: "14 شهر" },
    ])));

    sections.push(buildPdfSection("السيناريوهات", `
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${[
          { label: "متفائل", revenue: "55,000", profit: "30,000", roi: "10 أشهر", color: "hsl(145 60% 40%)" },
          { label: "واقعي", revenue: "45,000", profit: "20,000", roi: "14 شهر", color: PDF_COLORS.primary },
          { label: "متحفظ", revenue: "35,000", profit: "10,000", roi: "24 شهر", color: "hsl(35 80% 50%)" },
        ].map(s => `
          <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:12px;background:${PDF_COLORS.cardBg};display:grid;gap:6px;text-align:center;">
            <div style="font-size:12px;font-weight:600;color:${s.color};">${s.label}</div>
            <div style="font-size:9px;color:${PDF_COLORS.textMuted};">الإيرادات: ${s.revenue} ﷼</div>
            <div style="font-size:9px;color:${PDF_COLORS.textMuted};">الأرباح: ${s.profit} ﷼</div>
            <div style="font-size:10px;font-weight:500;color:${PDF_COLORS.text};">الاسترداد: ${s.roi}</div>
          </div>
        `).join("")}
      </div>
    `));

    sections.push(buildPdfSection("تحليل المخاطر", buildPdfInfoGrid([
      { label: "مخاطر السوق", value: "متوسطة — منافسة معتدلة في المنطقة" },
      { label: "مخاطر تشغيلية", value: "منخفضة — خبرة مطلوبة في المجال" },
      { label: "مخاطر مالية", value: "منخفضة — تدفق نقدي مستقر" },
      { label: "التوصية", value: "فرصة استثمارية جيدة مع إدارة حكيمة", emphasized: true },
    ])));

    if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

    const shellBuilder = (pageNumber: number) => buildPdfPageShell({
      documentTitle: "دراسة الجدوى الاقتصادية",
      documentSubtitle: "مطعم شاورما — جبره الطائف",
      documentMeta: ["تاريخ الإصدار: 2026/04/01"],
      logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
    });

    const pages = paginateSections({ sections, mount, shellBuilder });
    await renderPagesToPdf({ pages, fileName: "نموذج-دراسة-جدوى.pdf" });
    document.body.removeChild(mount);
  };

  const generateLegal = async () => {
    const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
      loadPdfLogo(), loadPdfLogoIcon(),
      generatePdfQR(`${window.location.origin}/negotiation/sample`),
      ensurePdfFontLoaded(),
    ]);
    const mount = createPdfMount();
    const sections: HTMLElement[] = [];

    sections.push(buildPdfSection("ملخص التأكيد", `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="padding:6px 16px;border-radius:999px;background:hsl(145 60% 95%);color:hsl(145 60% 30%);font-size:12px;font-weight:600;">مكتمل ✓</div>
        <div style="font-size:10px;color:${PDF_COLORS.textMuted};">تاريخ التأكيد: 2026/04/02</div>
      </div>
    `, true));

    sections.push(buildPdfSection("بيانات الصفقة", buildPdfInfoGrid([
      { label: "عنوان الصفقة", value: "مطعم شاورما — جبره الطائف", emphasized: true },
      { label: "نوع الصفقة", value: "تقبيل نشاط تجاري" },
      { label: "القيمة المتفق عليها", value: "350,000 ﷼" },
      { label: "الموقع", value: "الطائف — حي جبره" },
    ])));

    sections.push(buildPdfSection("إقرارات الأطراف", `
      <div style="display:grid;gap:10px;">
        ${[
          { label: "البائع — أحمد المالكي", text: "أقر بصحة جميع المعلومات المقدمة وأتحمل المسؤولية الكاملة عن أي معلومات غير دقيقة." },
          { label: "المشتري — خالد العمري", text: "أقر بأنني اطلعت على جميع تفاصيل الصفقة وأوافق على الشروط والأحكام المذكورة." },
        ].map(p => `
          <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:14px;background:${PDF_COLORS.cardBg};display:grid;gap:6px;">
            <div style="font-size:14px;font-weight:600;color:${PDF_COLORS.primary};">${p.label}</div>
            <div style="font-size:11px;line-height:2;color:${PDF_COLORS.text};">${p.text}</div>
          </div>
        `).join("")}
      </div>
    `));

    if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

    const shellBuilder = (pageNumber: number) => buildPdfPageShell({
      documentTitle: "وثيقة التأكيد النهائي",
      documentSubtitle: "مطعم شاورما — جبره الطائف",
      documentMeta: ["تاريخ التأكيد: 2026/04/02"],
      logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
    });

    const pages = paginateSections({ sections, mount, shellBuilder });
    await renderPagesToPdf({ pages, fileName: "نموذج-تأكيد-قانوني.pdf" });
    document.body.removeChild(mount);
  };

  const handleGenerate = async (key: TemplateKey) => {
    setLoading(key);
    try {
      switch (key) {
        case "invoice": await generateInvoice(); break;
        case "agreement": await generateAgreement(); break;
        case "feasibility": await generateFeasibility(); break;
        case "legal": await generateLegal(); break;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" style={{ direction: "rtl" }}>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">معاينة نماذج PDF</h1>
        <p className="text-muted-foreground">اضغط على أي قالب لتحميل نموذج تجريبي ببيانات وهمية</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATES.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => handleGenerate(key)}
            disabled={loading !== null}
            className="group relative flex items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-right disabled:opacity-60"
          >
            <span className="text-3xl">{icon}</span>
            <div className="flex-1">
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{label}</div>
              <div className="text-xs text-muted-foreground mt-1">تحميل نموذج تجريبي</div>
            </div>
            {loading === key ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border text-center">
        <p className="text-xs text-muted-foreground">
          جميع البيانات المعروضة هي بيانات تجريبية وهمية لأغراض المعاينة فقط
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5">
          <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
            <span>⚠️</span> إخلاء المسؤولية
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            منصة سوق تقبيل هي وسيط تقني فقط تسهّل التواصل بين أطراف الصفقة. لا تتحمل المنصة أي مسؤولية قانونية أو مالية تجاه صحة المعلومات المقدمة من البائعين أو المشترين، ولا تجاه نتائج أي صفقة يتم إبرامها عبرها. يتحمل كل طرف المسؤولية الكاملة عن التحقق من المعلومات واتخاذ قراراته الاستثمارية. تنصح المنصة بالاستعانة بمستشار قانوني ومالي مختص قبل إتمام أي صفقة.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
          <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
            <span>📊</span> تنويه بخصوص دراسة الجدوى
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            دراسة الجدوى الاقتصادية المقدمة عبر المنصة تُعد تقديرية وإرشادية فقط، وتعتمد على بيانات عامة وتحليلات آلية بالذكاء الاصطناعي. لا تُعتبر هذه الدراسة بديلاً عن دراسة جدوى احترافية معتمدة من جهة استشارية مرخصة. الأرقام والتوقعات الواردة قابلة للتغير بناءً على ظروف السوق الفعلية، ولا تضمن المنصة تحقيق أي عوائد محددة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewPage;
