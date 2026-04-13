/**
 * Deal Completion Certificate PDF Generator
 * Uses the unified pdfShared system.
 */
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  buildPdfQrSection, buildPdfDisclaimer,
  createPdfMount, renderPagesToPdf, paginateSections,
  formatPdfPrice, formatPdfDate, escapeHtml, PDF_COLORS, PDF_FONT_FAMILY,
} from "@/lib/pdfShared";

export interface DealCertificateData {
  certificateNumber: string;
  issuedAt: string;
  dealTitle: string;
  businessActivity: string;
  location: string;
  dealType: string;
  agreedPrice: number;
  sellerName: string;
  sellerPhoneLast4: string;
  buyerName: string;
  buyerPhoneLast4: string;
  negotiationStartDate: string;
  completionDate: string;
  commissionPaidDate: string;
}

export async function generateDealCertificatePdf(data: DealCertificateData) {
  const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
    loadPdfLogo(), loadPdfLogoIcon(),
    generatePdfQR(`${window.location.origin}/certificate/${data.certificateNumber}`),
    ensurePdfFontLoaded(),
  ]);

  const mount = createPdfMount();
  const sections: HTMLElement[] = [];

  // Official statement
  sections.push(buildPdfSection("شهادة إتمام صفقة", `
    <div style="background:${PDF_COLORS.primaryLight};border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:20px;text-align:center;">
      <div style="font-size:13px;line-height:2.2;color:${PDF_COLORS.text};font-family:${PDF_FONT_FAMILY};">
        تشهد منصة سوق تقبيل بأنه تم إتمام صفقة التقبيل التالية بنجاح عبر المنصة
      </div>
    </div>
  `, true));

  // Deal info
  sections.push(buildPdfSection("بيانات الصفقة", buildPdfInfoGrid([
    { label: "عنوان الصفقة", value: escapeHtml(data.dealTitle), emphasized: true },
    { label: "النشاط التجاري", value: escapeHtml(data.businessActivity) },
    { label: "الموقع", value: escapeHtml(data.location) },
    { label: "نوع الصفقة", value: escapeHtml(data.dealType) },
    { label: "القيمة المتفق عليها", value: `${formatPdfPrice(data.agreedPrice)} ﷼`, emphasized: true },
  ])));

  // Parties
  sections.push(buildPdfSection("أطراف الصفقة", `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
      <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:14px;background:${PDF_COLORS.cardBg};display:grid;gap:5px;">
        <div style="font-size:9px;color:${PDF_COLORS.primary};font-weight:600;">البائع</div>
        <div style="font-size:13px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(data.sellerName)}</div>
        <div style="font-size:10px;color:${PDF_COLORS.textMuted};direction:ltr;text-align:right;">****${escapeHtml(data.sellerPhoneLast4)}</div>
      </div>
      <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:14px;background:${PDF_COLORS.cardBg};display:grid;gap:5px;">
        <div style="font-size:9px;color:${PDF_COLORS.primary};font-weight:600;">المشتري</div>
        <div style="font-size:13px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(data.buyerName)}</div>
        <div style="font-size:10px;color:${PDF_COLORS.textMuted};direction:ltr;text-align:right;">****${escapeHtml(data.buyerPhoneLast4)}</div>
      </div>
    </div>
  `));

  // Timeline
  sections.push(buildPdfSection("المراحل الزمنية", buildPdfInfoGrid([
    { label: "تاريخ بدء التفاوض", value: formatPdfDate(data.negotiationStartDate) },
    { label: "تاريخ إتمام الصفقة", value: formatPdfDate(data.completionDate) },
    { label: "تاريخ تسديد العمولة", value: formatPdfDate(data.commissionPaidDate) },
    { label: "تاريخ إصدار الشهادة", value: formatPdfDate(data.issuedAt) },
  ])));

  // Note
  sections.push(buildPdfSection("ملاحظة", `
    <div style="font-size:11px;line-height:2;color:${PDF_COLORS.textMuted};text-align:center;">
      هذه الشهادة صادرة إلكترونياً من منصة سوق تقبيل ولا تحتاج توقيع أو ختم
    </div>
  `));

  sections.push(buildPdfDisclaimer());
  if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

  const shellBuilder = (pageNumber: number) => buildPdfPageShell({
    documentTitle: "شهادة إتمام صفقة",
    documentSubtitle: data.certificateNumber,
    documentMeta: [`تاريخ الإصدار: ${formatPdfDate(data.issuedAt)}`],
    logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
  });

  const pages = paginateSections({ sections, mount, shellBuilder });
  await renderPagesToPdf({ pages, fileName: `شهادة-إتمام-${data.certificateNumber}.pdf` });
  document.body.removeChild(mount);
}
