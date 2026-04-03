import { jsPDF } from "jspdf";
import { PAGE_HEIGHT_PX, PAGE_WIDTH_PX, buildAgreementPdfPages } from "@/lib/agreementPdf/template";
import type { AgreementPdfData } from "@/lib/agreementPdf/types";
import { createPdfMount, ensurePdfFontLoaded, generatePdfQR, loadPdfLogo, loadPdfLogoIcon, protectPdf } from "@/lib/pdfShared";

const PAGE_W = 210;
const PAGE_H = 297;

const safeFileName = (title: string) => title.replace(/[\\/:*?"<>|]/g, "-");

export async function generateAgreementPdf(data: AgreementPdfData) {
  const pdf = new jsPDF("p", "mm", "a4");
  protectPdf(pdf);
  const html2canvas = (await import("html2canvas")).default;

  // Generate QR code linking to the agreement page
  const agreementUrl = `${window.location.origin}/agreement/${data.agreementNumber}`;
  const qrDataUrl = await generatePdfQR(agreementUrl);

  const [logoBase64, logoIconBase64] = await Promise.all([loadPdfLogo(), loadPdfLogoIcon(), ensurePdfFontLoaded()]);

  const mount = createPdfMount();

  try {
    const pages = buildAgreementPdfPages({ data, logoBase64, logoIconBase64, qrDataUrl, mount });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
        windowWidth: PAGE_WIDTH_PX,
        windowHeight: PAGE_HEIGHT_PX,
      });

      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    }

    pdf.save(`اتفاقية-${safeFileName(data.dealTitle || data.agreementNumber)}.pdf`);
  } finally {
    document.body.removeChild(mount);
  }
}
