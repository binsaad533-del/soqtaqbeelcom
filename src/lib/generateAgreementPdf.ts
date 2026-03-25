import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo.png";
import { PAGE_HEIGHT_PX, PAGE_WIDTH_PX, buildAgreementPdfPages } from "@/lib/agreementPdf/template";
import type { AgreementPdfData } from "@/lib/agreementPdf/types";

const PAGE_W = 210;
const PAGE_H = 297;
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap";

async function loadLogoBase64(): Promise<string> {
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function ensureFontLoaded() {
  let link = document.querySelector<HTMLLinkElement>('link[data-agreement-pdf-font="true"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    link.dataset.agreementPdfFont = "true";
    document.head.appendChild(link);
  }

  if ("fonts" in document) {
    await Promise.all([
      document.fonts.load('400 16px "IBM Plex Sans Arabic"'),
      document.fonts.load('700 16px "IBM Plex Sans Arabic"'),
      document.fonts.ready,
    ]);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
}

const safeFileName = (title: string) => title.replace(/[\\/:*?"<>|]/g, "-");

export async function generateAgreementPdf(data: AgreementPdfData) {
  const pdf = new jsPDF("p", "mm", "a4");
  const html2canvas = (await import("html2canvas")).default;
  const [logoBase64] = await Promise.all([loadLogoBase64(), ensureFontLoaded()]);

  const mount = document.createElement("div");
  mount.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${PAGE_WIDTH_PX}px`,
    "display:grid",
    "gap:20px",
    "background:#ffffff",
    "padding:12px",
    "box-sizing:border-box",
  ].join(";");
  document.body.appendChild(mount);

  try {
    const pages = buildAgreementPdfPages({ data, logoBase64, mount });
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
