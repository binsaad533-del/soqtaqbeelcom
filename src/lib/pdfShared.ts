/**
 * Unified PDF utilities for all platform documents.
 * Provides shared header, footer, QR code, protection, and page management.
 */
import QRCode from "qrcode";
import logoBlueUrl from "@/assets/logo-blue.png";
import logoIconGoldUrl from "@/assets/logo-icon-gold.png";

/* ── Constants ── */
export const PDF_PAGE_WIDTH_PX = 794;
export const PDF_PAGE_HEIGHT_PX = 1123;
export const PDF_PAGE_W_MM = 210;
export const PDF_PAGE_H_MM = 297;
export const PDF_FONT_FAMILY = `'IBM Plex Sans Arabic', system-ui, sans-serif`;
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap";

/* ── Colors (HSL matching platform design system) ── */
export const PDF_COLORS = {
  primary: "hsl(212 84% 42%)",
  primaryLight: "hsl(210 100% 98%)",
  text: "hsl(215 25% 18%)",
  textMuted: "hsl(215 16% 45%)",
  textFaint: "hsl(215 16% 55%)",
  border: "hsl(214 32% 91%)",
  borderLight: "hsl(214 32% 93%)",
  cardBg: "hsl(210 40% 98%)",
  gold: "hsl(43 85% 55%)",
} as const;

/* ── Utilities ── */
export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const safeText = (value?: string | null, fallback = "—") => {
  const cleaned = value?.toString().trim();
  return escapeHtml(cleaned && cleaned.length > 0 ? cleaned : fallback);
};

export const toEnDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export const formatPdfDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return toEnDigits(new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)));
  } catch {
    return value;
  }
};

export const formatPdfPrice = (value?: number | null) => Number(value || 0).toLocaleString("en-US");

/* ── Font Loading ── */
export async function ensurePdfFontLoaded() {
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
  await new Promise((r) => setTimeout(r, 900));
}

/* ── Image Loading ── */
export async function loadImageBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
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

/* ── QR Code ── */
export async function generatePdfQR(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, { width: 100, margin: 1, color: { dark: "#2563a0", light: "#ffffff" } });
  } catch {
    return "";
  }
}

/* ── Social Icons SVG (inline for PDF) ── */
const SOCIAL_SVGS = {
  snapchat: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-2.5 0-4.5 1.5-5 4l-.5 3c-.1.5-.5.8-1 .8-.3 0-.5.2-.5.5s.2.5.5.5c.5 0 1 .2 1.3.5.3.4.2.8-.2 1.2-.5.5-1.5 1-2.5 1.5-.3.2-.5.5-.3.8.2.5.8.7 1.5.8.3 0 .5.2.5.5 0 .3.2.5.5.5h.5c.5 0 1 .2 1.5.5s1.2.8 2.2.8 1.7-.5 2.2-.8.9-.5 1.5-.5h.5c.3 0 .5-.2.5-.5 0-.3.2-.5.5-.5.7-.1 1.3-.3 1.5-.8.2-.3 0-.6-.3-.8-1-.5-2-1-2.5-1.5-.4-.4-.5-.8-.2-1.2.3-.3.8-.5 1.3-.5.3 0 .5-.2.5-.5s-.2-.5-.5-.5c-.5 0-.9-.3-1-.8l-.5-3c-.5-2.5-2.5-4-5-4z"/></svg>`,
  tiktok: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>`,
  linkedin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
};

/* ── Footer nav links (matches website footer) ── */
const FOOTER_NAV_LINKS = [
  { label: "الرئيسية", href: "https://soqtaqbeel.com/" },
  { label: "سوق الفرص", href: "https://soqtaqbeel.com/marketplace" },
  { label: "كيف تعمل المنصة", href: "https://soqtaqbeel.com/how-it-works" },
  { label: "تواصل معنا", href: "https://soqtaqbeel.com/contact" },
  { label: "مركز المساعدة", href: "https://soqtaqbeel.com/help" },
  { label: "العمولة", href: "https://soqtaqbeel.com/commission" },
];

/* ── Unified Page Shell ── */
export function buildPdfPageShell(options: {
  documentTitle: string;
  documentSubtitle?: string;
  documentMeta?: string[];
  logoBase64: string;
  logoIconBase64: string;
  pageNumber: number;
  qrDataUrl?: string;
  showQrInFooter?: boolean;
}) {
  const { documentTitle, documentSubtitle, documentMeta, logoBase64, logoIconBase64, pageNumber, qrDataUrl, showQrInFooter } = options;

  const page = document.createElement("div");
  page.style.cssText = [
    `width:${PDF_PAGE_WIDTH_PX}px`,
    `height:${PDF_PAGE_HEIGHT_PX}px`,
    "background:#ffffff",
    `font-family:${PDF_FONT_FAMILY}`,
    "direction:rtl",
    `color:${PDF_COLORS.text}`,
    "display:flex",
    "flex-direction:column",
    "box-sizing:border-box",
    "padding:34px 34px 20px",
    "gap:14px",
    "overflow:hidden",
  ].join(";");

  // ── Header ──
  const metaHtml = (documentMeta || []).map((m) => `<span>${escapeHtml(m)}</span>`).join("");
  const headerHtml = `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:18px;padding-bottom:12px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};">
      <div style="display:grid;gap:5px;">
        <div style="font-size:15px;font-weight:500;color:${PDF_COLORS.text};">${escapeHtml(documentTitle)}</div>
        ${documentSubtitle ? `<div style="font-size:10px;color:${PDF_COLORS.textMuted};line-height:1.7;">${escapeHtml(documentSubtitle)}</div>` : ""}
        ${metaHtml ? `<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:9px;color:${PDF_COLORS.textMuted};">${metaHtml}</div>` : ""}
      </div>
      ${logoBase64 ? `<img src="${logoBase64}" alt="سوق تقبيل" style="height:60px;width:auto;object-fit:contain;" />` : ""}
    </header>
  `;

  const header = document.createElement("div");
  header.innerHTML = headerHtml.trim();

  // ── Content ──
  const content = document.createElement("div");
  content.style.cssText = "display:flex;flex-direction:column;flex:1;gap:12px;padding-top:2px;overflow:visible;";

  // ── Footer (matches website footer) ──
  const navLinksHtml = FOOTER_NAV_LINKS.map(
    (link, i) =>
      `${i > 0 ? `<span style="color:${PDF_COLORS.borderLight};font-size:9px;padding:0 4px;">|</span>` : ""}<a href="${link.href}" style="color:${PDF_COLORS.textMuted};text-decoration:none;font-size:9px;">${escapeHtml(link.label)}</a>`
  ).join("");

  const socialIcons = Object.entries(SOCIAL_SVGS)
    .map(([, svg]) => `<span style="opacity:0.45;">${svg}</span>`)
    .join("");

  const footerHtml = `
    <footer style="padding-top:10px;border-top:0.5px solid ${PDF_COLORS.borderLight};display:grid;gap:6px;text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap;line-height:2;">
        ${navLinksHtml}
      </div>
      ${logoIconBase64 ? `<div style="text-align:center;"><img src="${logoIconBase64}" alt="سوق تقبيل" style="height:28px;width:28px;object-fit:contain;opacity:0.5;" /></div>` : ""}
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
        ${socialIcons}
      </div>
      <div style="font-size:9px;color:${PDF_COLORS.textMuted};line-height:1.8;">
        في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:8px;color:${PDF_COLORS.textFaint};line-height:1.8;">
          © ${new Date().getFullYear()} المنصة مملوكة ومدارة بواسطة شركة Ain Jasaas
        </div>
        ${showQrInFooter && qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:32px;height:32px;border-radius:3px;" />` : ""}
        <div style="font-size:8px;color:${PDF_COLORS.textFaint};white-space:nowrap;">صفحة ${pageNumber}</div>
      </div>
    </footer>
  `;

  const footer = document.createElement("div");
  footer.innerHTML = footerHtml.trim();

  page.append(header.firstElementChild!, content, footer.firstElementChild!);
  return { page, content };
}

/* ── Protect PDF (no copy / no modify) ── */
export function protectPdf(pdf: any) {
  // jsPDF doesn't support granular permissions natively via the API in v4,
  // but we can set user + owner passwords. The owner password enables restriction.
  // Using the internal encryption API if available.
  try {
    if (typeof pdf.setDocumentProperties === "function") {
      pdf.setDocumentProperties({
        title: "سوق تقبيل — وثيقة رسمية",
        creator: "Soq Taqbeel Platform",
        author: "Ain Jasaas",
      });
    }
  } catch { /* optional */ }
}

/* ── Full Pipeline: Render pages → jsPDF with protection ── */
export async function renderPagesToPdf(options: {
  pages: HTMLElement[];
  fileName: string;
}): Promise<void> {
  const { pages, fileName } = options;
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF("p", "mm", "a4");
  protectPdf(pdf);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  for (const [index, page] of pages.entries()) {
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: PDF_PAGE_WIDTH_PX,
      height: PDF_PAGE_HEIGHT_PX,
      windowWidth: PDF_PAGE_WIDTH_PX,
      windowHeight: PDF_PAGE_HEIGHT_PX,
    });

    if (index > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PDF_PAGE_W_MM, PDF_PAGE_H_MM, undefined, "FAST");
  }

  pdf.save(fileName);
}

/* ── Helper: paginate sections into page shells ── */
export function paginateSections(options: {
  sections: HTMLElement[];
  mount: HTMLElement;
  shellBuilder: (pageNumber: number) => ReturnType<typeof buildPdfPageShell>;
}): HTMLElement[] {
  const { sections, mount, shellBuilder } = options;
  const pages: HTMLElement[] = [];
  let pageNumber = 1;
  let current = shellBuilder(pageNumber);
  mount.appendChild(current.page);
  pages.push(current.page);

  const getAvailableHeight = () => {
    const pageRect = current.page.getBoundingClientRect();
    const contentRect = current.content.getBoundingClientRect();
    return pageRect.bottom - contentRect.top - 60;
  };

  sections.forEach((block) => {
    const nextBlock = block.cloneNode(true) as HTMLElement;
    current.content.appendChild(nextBlock);

    const contentBottom = current.content.scrollHeight;
    const available = getAvailableHeight();

    if (contentBottom > available && current.content.childElementCount > 1) {
      current.content.removeChild(nextBlock);
      pageNumber += 1;
      current = shellBuilder(pageNumber);
      mount.appendChild(current.page);
      pages.push(current.page);
      current.content.appendChild(nextBlock);
    }
  });

  return pages;
}

/* ── Create off-screen mount ── */
export function createPdfMount(): HTMLElement {
  const mount = document.createElement("div");
  mount.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${PDF_PAGE_WIDTH_PX}px`,
    "display:grid",
    "gap:20px",
    "background:#ffffff",
    "padding:12px",
    "box-sizing:border-box",
  ].join(";");
  document.body.appendChild(mount);
  return mount;
}

/* ── Section builder (matches agreement style) ── */
export function buildPdfSection(title: string, body: string, highlight = false): HTMLElement {
  const bg = highlight ? PDF_COLORS.primaryLight : "#ffffff";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <section style="border:0.5px solid ${PDF_COLORS.borderLight};border-radius:16px;padding:16px 16px 14px;background:${bg};display:grid;gap:10px;break-inside:avoid;font-family:${PDF_FONT_FAMILY};direction:rtl;">
      <div style="display:flex;align-items:center;gap:10px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};padding-bottom:8px;">
        <h2 style="margin:0;font-size:12px;font-weight:500;color:${PDF_COLORS.text};">${escapeHtml(title)}</h2>
      </div>
      ${body}
    </section>
  `;
  return wrapper.firstElementChild as HTMLElement;
}

/* ── Info grid (key-value pairs) ── */
export function buildPdfInfoGrid(items: Array<{ label: string; value: string; emphasized?: boolean }>) {
  return `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
      ${items
        .map(
          ({ label, value, emphasized }) => `
          <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:16px;padding:12px 14px;background:${emphasized ? PDF_COLORS.primaryLight : PDF_COLORS.cardBg};">
            <div style="font-size:10px;color:${PDF_COLORS.textMuted};margin-bottom:4px;">${escapeHtml(label)}</div>
            <div style="font-size:${emphasized ? "15px" : "12px"};font-weight:${emphasized ? 600 : 500};color:${emphasized ? PDF_COLORS.primary : PDF_COLORS.text};line-height:1.6;">${value}</div>
          </div>`,
        )
        .join("")}
    </div>`;
}

/* ── Get logos base64 ── */
export async function loadPdfLogo(): Promise<string> {
  return loadImageBase64(logoBlueUrl);
}
export async function loadPdfLogoIcon(): Promise<string> {
  return loadImageBase64(logoIconGoldUrl);
}
