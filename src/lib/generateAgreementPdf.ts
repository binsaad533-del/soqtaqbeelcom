import { buildAgreementPdfPages } from "@/lib/agreementPdf/template";
import type { AgreementPdfData } from "@/lib/agreementPdf/types";
import { createPdfMount, ensurePdfFontLoaded, generatePdfQR, loadPdfLogo, loadPdfLogoIcon, renderPagesToPdf } from "@/lib/pdfShared";

const safeFileName = (title: string) => title.replace(/[\\/:*?"<>|]/g, "-");

export async function generateAgreementPdf(data: AgreementPdfData) {
  const agreementUrl = `${window.location.origin}/agreement/${data.agreementNumber}`;

  const [logoBase64, logoIconBase64, qrDataUrl] = await Promise.all([
    loadPdfLogo(), loadPdfLogoIcon(), generatePdfQR(agreementUrl), ensurePdfFontLoaded(),
  ]);

  const mount = createPdfMount();

  try {
    const pages = buildAgreementPdfPages({ data, logoBase64, logoIconBase64, qrDataUrl, mount });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await renderPagesToPdf({ pages, fileName: `اتفاقية-${safeFileName(data.dealTitle || data.agreementNumber)}.pdf` });
  } finally {
    document.body.removeChild(mount);
  }
}
