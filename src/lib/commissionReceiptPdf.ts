/**
 * Commission Receipt PDF Generator
 * Uses the unified pdfShared system.
 */
import {
  ensurePdfFontLoaded, loadPdfLogo, loadPdfLogoIcon, generatePdfQR,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  buildPdfQrSection, buildPdfDisclaimer,
  createPdfMount, renderPagesToPdf, paginateSections,
  formatPdfPrice, formatPdfDate, escapeHtml, PDF_COLORS,
} from "@/lib/pdfShared";
import { BANK_DETAILS, VAT_RATE } from "@/hooks/useCommissions";

export interface CommissionReceiptData {
  receiptNumber: string;
  paidAt: string;
  dealTitle: string;
  agreementNumber: string;
  dealAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vatAmount: number;
  totalWithVat: number;
  sellerName: string;
  sellerPhone: string;
}

export async function generateCommissionReceiptPdf(data: CommissionReceiptData) {
  const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
    loadPdfLogo(), loadPdfLogoIcon(),
    generatePdfQR(`${window.location.origin}/commission-receipt/${data.receiptNumber}`),
    ensurePdfFontLoaded(),
  ]);

  const mount = createPdfMount();
  const sections: HTMLElement[] = [];

  // Status
  sections.push(buildPdfSection("حالة الدفع", `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="padding:6px 16px;border-radius:999px;background:hsl(145 60% 95%);color:hsl(145 60% 30%);font-size:12px;font-weight:600;">مسدد ✓</div>
      <div style="font-size:10px;color:${PDF_COLORS.textMuted};">تاريخ السداد: ${formatPdfDate(data.paidAt)}</div>
    </div>
  `, true));

  // Deal info
  sections.push(buildPdfSection("بيانات الصفقة", buildPdfInfoGrid([
    { label: "عنوان الصفقة", value: escapeHtml(data.dealTitle), emphasized: true },
    { label: "رقم الاتفاقية", value: escapeHtml(data.agreementNumber) },
    { label: "القيمة المتفق عليها", value: `${formatPdfPrice(data.dealAmount)} ﷼` },
    { label: "طريقة الدفع", value: "تحويل بنكي" },
  ])));

  // Commission breakdown
  sections.push(buildPdfSection("تفاصيل العمولة", `
    <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;overflow:hidden;">
      <table style="width:100%;font-size:11px;color:${PDF_COLORS.text};border-collapse:collapse;font-family:inherit;">
        <tbody>
          <tr style="background:${PDF_COLORS.cardBg};">
            <td style="padding:10px 14px;text-align:right;font-weight:500;">عمولة المنصة (${data.commissionRate * 100}%)</td>
            <td style="padding:10px 14px;text-align:left;font-family:monospace;">${formatPdfPrice(data.commissionAmount)} ﷼</td>
          </tr>
          <tr style="border-top:0.5px solid ${PDF_COLORS.border};">
            <td style="padding:10px 14px;text-align:right;">ضريبة القيمة المضافة (${VAT_RATE * 100}%)</td>
            <td style="padding:10px 14px;text-align:left;font-family:monospace;">${formatPdfPrice(data.vatAmount)} ﷼</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid ${PDF_COLORS.primary};">
            <td style="padding:12px 14px;font-weight:700;font-size:13px;color:${PDF_COLORS.primary};text-align:right;">الإجمالي المسدد</td>
            <td style="padding:12px 14px;text-align:left;font-weight:700;font-size:13px;font-family:monospace;color:${PDF_COLORS.primary};">${formatPdfPrice(data.totalWithVat)} ﷼</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `));

  // Seller info
  sections.push(buildPdfSection("بيانات البائع", buildPdfInfoGrid([
    { label: "الاسم", value: escapeHtml(data.sellerName) },
    { label: "رقم الجوال", value: escapeHtml(data.sellerPhone) },
  ])));

  // Beneficiary info
  sections.push(buildPdfSection("بيانات المستفيد", buildPdfInfoGrid([
    { label: "اسم المستفيد", value: escapeHtml(BANK_DETAILS.beneficiary) },
    { label: "البنك", value: escapeHtml(BANK_DETAILS.bank) },
    { label: "رقم الآيبان (IBAN)", value: escapeHtml(BANK_DETAILS.iban) },
    { label: "الرقم الضريبي", value: escapeHtml(BANK_DETAILS.taxNumber) },
  ])));

  sections.push(buildPdfDisclaimer());
  if (qrDataUrl) sections.push(buildPdfQrSection(qrDataUrl));

  const shellBuilder = (pageNumber: number) => buildPdfPageShell({
    documentTitle: "إيصال سداد عمولة",
    documentSubtitle: data.receiptNumber,
    documentMeta: [`تاريخ السداد: ${formatPdfDate(data.paidAt)}`, `الرقم الضريبي: ${BANK_DETAILS.taxNumber}`],
    logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter: false,
  });

  const pages = paginateSections({ sections, mount, shellBuilder });
  await renderPagesToPdf({ pages, fileName: `إيصال-عمولة-${data.receiptNumber}.pdf` });
  document.body.removeChild(mount);
}
