/**
 * Deal Summary Package PDF Generator
 * Combines all deal documents into a single PDF.
 * Uses the unified pdfShared system.
 */
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  buildPdfQrSection, buildPdfDisclaimer,
  createPdfMount, paginateSections,
  formatPdfPrice, formatPdfDate, escapeHtml, PDF_COLORS, PDF_FONT_FAMILY,
  PDF_PAGE_WIDTH_PX, PDF_PAGE_HEIGHT_PX, PDF_PAGE_W_MM, PDF_PAGE_H_MM,
  protectPdf,
} from "@/lib/pdfShared";

export interface DealSummaryData {
  dealTitle: string;
  dealDate: string;
  sellerName: string;
  buyerName: string;
  agreedPrice: number;
  dealType: string;
  location: string;
  // Whether each section is available
  hasCertificate: boolean;
  hasAgreement: boolean;
  hasLegalConfirmation: boolean;
  hasFeasibility: boolean;
  hasInvoice: boolean;
  hasReceipt: boolean;
}

export async function generateDealSummaryPackagePdf(data: DealSummaryData) {
  const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
    loadPdfLogo(), loadPdfLogoIcon(),
    generatePdfQR(`${window.location.origin}/deal-summary`),
    ensurePdfFontLoaded(),
  ]);

  const mount = createPdfMount();

  // Build TOC items
  const tocItems: string[] = [];
  tocItems.push("صفحة الغلاف");
  if (data.hasCertificate) tocItems.push("شهادة إتمام الصفقة");
  if (data.hasAgreement) tocItems.push("اتفاقية الصفقة");
  if (data.hasLegalConfirmation) tocItems.push("وثيقة التأكيد القانوني");
  if (data.hasFeasibility) tocItems.push("دراسة الجدوى الاقتصادية");
  if (data.hasInvoice) tocItems.push("الفاتورة الضريبية");
  if (data.hasReceipt) tocItems.push("إيصال سداد العمولة");

  const sections: HTMLElement[] = [];

  // Cover title section
  sections.push(buildPdfSection("ملف صفقة", `
    <div style="text-align:center;padding:30px 0;">
      <div style="font-size:22px;font-weight:700;color:${PDF_COLORS.primary};margin-bottom:12px;line-height:1.6;">${escapeHtml(data.dealTitle)}</div>
      <div style="font-size:12px;color:${PDF_COLORS.textMuted};margin-bottom:24px;">ملف الصفقة الكامل</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-width:400px;margin:0 auto;">
        <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:12px;background:${PDF_COLORS.cardBg};text-align:center;">
          <div style="font-size:9px;color:${PDF_COLORS.textMuted};">البائع</div>
          <div style="font-size:12px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(data.sellerName)}</div>
        </div>
        <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:12px;background:${PDF_COLORS.cardBg};text-align:center;">
          <div style="font-size:9px;color:${PDF_COLORS.textMuted};">المشتري</div>
          <div style="font-size:12px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(data.buyerName)}</div>
        </div>
      </div>
    </div>
  `, true));

  // Deal summary
  sections.push(buildPdfSection("ملخص الصفقة", buildPdfInfoGrid([
    { label: "القيمة المتفق عليها", value: `${formatPdfPrice(data.agreedPrice)} ﷼`, emphasized: true },
    { label: "نوع الصفقة", value: escapeHtml(data.dealType) },
    { label: "الموقع", value: escapeHtml(data.location) },
    { label: "التاريخ", value: formatPdfDate(data.dealDate) },
  ])));

  // Table of contents
  sections.push(buildPdfSection("فهرس المحتويات", `
    <div style="display:grid;gap:6px;">
      ${tocItems.map((item, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:0.5px solid ${PDF_COLORS.border};border-radius:10px;background:${i === 0 ? PDF_COLORS.primaryLight : PDF_COLORS.cardBg};">
          <span style="width:22px;height:22px;border-radius:999px;background:${PDF_COLORS.primaryGradient};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;">${i + 1}</span>
          <span style="font-size:11px;color:${PDF_COLORS.text};font-weight:500;">${escapeHtml(item)}</span>
        </div>
      `).join("")}
    </div>
  `));

  // Note about complete document
  sections.push(buildPdfSection("ملاحظة", `
    <div style="font-size:11px;line-height:2;color:${PDF_COLORS.textMuted};text-align:center;">
      هذا الملف يحتوي على جميع وثائق الصفقة المتاحة. يمكنك تحميل كل وثيقة على حدة من صفحة الصفقة في المنصة.
    </div>
  `));

  sections.push(buildPdfDisclaimer());
  if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

  const shellBuilder = (pageNumber: number) => buildPdfPageShell({
    documentTitle: "ملف صفقة كامل",
    documentSubtitle: data.dealTitle,
    documentMeta: [`التاريخ: ${formatPdfDate(data.dealDate)}`],
    logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
  });

  const pages = paginateSections({ sections, mount, shellBuilder });

  // Render to PDF
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");
  protectPdf(pdf);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  for (const [index, page] of pages.entries()) {
    const canvas = await html2canvas(page, {
      scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff",
      width: PDF_PAGE_WIDTH_PX, height: PDF_PAGE_HEIGHT_PX,
      windowWidth: PDF_PAGE_WIDTH_PX, windowHeight: PDF_PAGE_HEIGHT_PX,
    });
    if (index > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PDF_PAGE_W_MM, PDF_PAGE_H_MM, undefined, "FAST");
  }

  document.body.removeChild(mount);

  pdf.save(`ملف-صفقة-${data.dealTitle.replace(/\s+/g, "-")}.pdf`);
}
