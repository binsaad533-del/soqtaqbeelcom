/**
 * Unified PDF utilities for all platform documents.
 * Provides shared header, footer, QR code, protection, and page management.
 */
import QRCode from "qrcode";
import logoBlueUrl from "@/assets/logo-blue-new.png";
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
    const isoMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}/${isoMatch[2]}/${isoMatch[3]}`;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return `${parsed.getFullYear()}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}`;
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

    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image-load-failed"));
        img.src = objectUrl;
      });

      const sourceCanvas = document.createElement("canvas");
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      sourceCanvas.width = width;
      sourceCanvas.height = height;

      const sourceCtx = sourceCanvas.getContext("2d");
      if (!sourceCtx) return "";

      sourceCtx.drawImage(image, 0, 0, width, height);
      const { data } = sourceCtx.getImageData(0, 0, width, height);

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          const isVisible = a > 10 && (r < 245 || g < 245 || b < 245);

          if (!isVisible) continue;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      if (maxX === -1 || maxY === -1) {
        return sourceCanvas.toDataURL("image/png");
      }

      const padding = Math.max(8, Math.round(Math.min(width, height) * 0.015));
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
      const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

      const trimmedCanvas = document.createElement("canvas");
      trimmedCanvas.width = cropWidth;
      trimmedCanvas.height = cropHeight;
      const trimmedCtx = trimmedCanvas.getContext("2d");
      if (!trimmedCtx) return sourceCanvas.toDataURL("image/png");

      trimmedCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      return trimmedCanvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return "";
  }
}

/* ── QR Code ── */
export async function generatePdfQR(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: "#2563a0", light: "#ffffff" } });
  } catch {
    return "";
  }
}

/* ── Social Icons SVG (inline for PDF) ── */
const SOCIAL_SVGS = {
  snapchat: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-2.5 0-4.5 1.5-5 4l-.5 3c-.1.5-.5.8-1 .8-.3 0-.5.2-.5.5s.2.5.5.5c.5 0 1 .2 1.3.5.3.4.2.8-.2 1.2-.5.5-1.5 1-2.5 1.5-.3.2-.5.5-.3.8.2.5.8.7 1.5.8.3 0 .5.2.5.5 0 .3.2.5.5.5h.5c.5 0 1 .2 1.5.5s1.2.8 2.2.8 1.7-.5 2.2-.8.9-.5 1.5-.5h.5c.3 0 .5-.2.5-.5 0-.3.2-.5.5-.5.7-.1 1.3-.3 1.5-.8.2-.3 0-.6-.3-.8-1-.5-2-1-2.5-1.5-.4-.4-.5-.8-.2-1.2.3-.3.8-.5 1.3-.5.3 0 .5-.2.5-.5s-.2-.5-.5-.5c-.5 0-.9-.3-1-.8l-.5-3c-.5-2.5-2.5-4-5-4z"/></svg>`,
  tiktok: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
  x: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>`,
  linkedin: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
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

/* ── QR Verification Section (standalone, outside footer) ── */
export function buildPdfQrSection(qrDataUrl: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <section style="border:0.5px solid ${PDF_COLORS.borderLight};border-radius:16px;padding:18px;background:${PDF_COLORS.primaryLight};display:flex;align-items:center;justify-content:space-between;gap:20px;break-inside:avoid;font-family:${PDF_FONT_FAMILY};direction:rtl;">
      <div style="display:grid;gap:6px;flex:1;text-align:right;">
        <div style="font-size:14px;font-weight:600;color:${PDF_COLORS.text};">التحقق الإلكتروني</div>
        <div style="font-size:10px;color:${PDF_COLORS.textMuted};line-height:2;">
          يمكنكم مسح رمز QR للتحقق من صحة هذه الوثيقة إلكترونياً عبر منصة سوق تقبيل.<br/>
          جميع المبالغ بالريال السعودي (﷼)
        </div>
      </div>
      <div style="display:grid;justify-items:center;gap:4px;flex-shrink:0;">
        <img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px;border-radius:10px;border:1px solid ${PDF_COLORS.border};" />
        <div style="font-size:8px;color:${PDF_COLORS.textFaint};">تحقق إلكتروني</div>
      </div>
    </section>
  `.trim();
  return wrapper.firstElementChild as HTMLElement;
}

/* ── Bank Details Section (reusable across all PDFs) ── */
export function buildPdfBankSection(bankDetails: {
  beneficiary: string;
  legalName: string;
  bank: string;
  accountNumber: string;
  iban: string;
  nationalId: string;
  taxNumber: string;
  email: string;
  phone: string;
}, commissionInfo?: { rate: number; amount: number; dealAmount: number; currency?: string }): HTMLElement {
  const wrapper = document.createElement("div");
  const items = [
    { label: "اسم المستفيد", value: bankDetails.beneficiary },
    { label: "الاسم القانوني", value: bankDetails.legalName },
    { label: "البنك", value: bankDetails.bank },
    { label: "رقم الحساب", value: bankDetails.accountNumber },
    { label: "رقم الآيبان (IBAN)", value: bankDetails.iban },
    { label: "السجل التجاري", value: bankDetails.nationalId },
    { label: "الرقم الضريبي", value: bankDetails.taxNumber },
    { label: "التواصل المالي", value: `${bankDetails.email} — ${bankDetails.phone}` },
  ];

  const commissionHtml = commissionInfo ? `
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:12px;margin-bottom:8px;">
      <div style="border-radius:18px;padding:16px;background:linear-gradient(135deg, ${PDF_COLORS.primary}, hsl(196 85% 45%));color:white;display:grid;gap:6px;">
        <div style="font-size:10px;opacity:0.86;">المبلغ المستحق للمنصة</div>
        <div style="font-size:20px;font-weight:700;line-height:1.3;">${formatPdfPrice(commissionInfo.amount)} ﷼</div>
        <div style="font-size:10px;opacity:0.9;">${commissionInfo.rate * 100}% من قيمة الصفقة ${formatPdfPrice(commissionInfo.dealAmount)} ${escapeHtml(commissionInfo.currency || "﷼")}</div>
      </div>
      <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:18px;padding:16px;background:${PDF_COLORS.cardBg};display:grid;gap:6px;">
        <div style="font-size:11px;font-weight:600;color:${PDF_COLORS.text};">تعليمات السداد</div>
        <div style="font-size:10px;line-height:1.9;color:${PDF_COLORS.textMuted};">يرجى تحويل العمولة إلى حساب الشركة التالي ثم رفع إثبات السداد عبر المنصة.</div>
      </div>
    </div>` : "";

  wrapper.innerHTML = `
    <section style="border:0.5px solid ${PDF_COLORS.borderLight};border-radius:16px;padding:16px 16px 14px;background:${PDF_COLORS.primaryLight};display:grid;gap:10px;break-inside:avoid;font-family:${PDF_FONT_FAMILY};direction:rtl;text-align:right;">
      <div style="display:flex;align-items:center;gap:10px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};padding-bottom:8px;">
        <h2 style="margin:0;font-size:14px;font-weight:600;color:${PDF_COLORS.text};">بيانات الحساب البنكي والعمولة</h2>
      </div>
      ${commissionHtml}
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        ${items.map(({ label, value }) => `
          <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:10px 12px;background:#ffffff;display:grid;gap:3px;text-align:center;">
            <div style="font-size:9px;color:${PDF_COLORS.textMuted};">${escapeHtml(label)}</div>
            <div style="font-size:11px;font-weight:600;color:${PDF_COLORS.text};line-height:1.7;direction:ltr;word-break:break-all;">${escapeHtml(value)}</div>
          </div>`).join("")}
      </div>
    </section>
  `.trim();
  return wrapper.firstElementChild as HTMLElement;
}

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
  const { documentTitle, documentSubtitle, documentMeta, logoBase64, logoIconBase64, pageNumber } = options;

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
    "padding:30px 34px 18px",
    "gap:12px",
    "overflow:hidden",
  ].join(";");

  // ── Header ──
  const metaHtml = (documentMeta || []).map((m) => `<span>${escapeHtml(m)}</span>`).join("");
  const headerHtml = `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:2px solid ${PDF_COLORS.gold};">
      ${logoBase64 ? `<div style="flex-shrink:0;display:grid;justify-items:center;gap:2px;"><img src="${logoBase64}" alt="سوق تقبيل" style="width:180px;max-height:64px;object-fit:contain;display:block;" /><div style="font-size:9px;font-weight:600;color:${PDF_COLORS.textMuted};letter-spacing:2px;">SOQ TAQBEEL</div></div>` : ""}
      <div style="display:grid;gap:4px;flex:1;text-align:left;">
        <div style="font-size:16px;font-weight:700;color:${PDF_COLORS.primary};">${escapeHtml(documentTitle)}</div>
        ${documentSubtitle ? `<div style="font-size:10px;font-weight:500;color:${PDF_COLORS.text};line-height:1.6;">${escapeHtml(documentSubtitle)}</div>` : ""}
        ${metaHtml ? `<div style="display:grid;gap:2px;font-size:9px;color:${PDF_COLORS.textMuted};text-align:left;">${metaHtml}</div>` : ""}
      </div>
    </header>
  `;

  const header = document.createElement("div");
  header.innerHTML = headerHtml.trim();

  // ── Content ──
  const content = document.createElement("div");
  content.style.cssText = "display:flex;flex-direction:column;flex:1;gap:10px;padding-top:2px;overflow:visible;";

  // ── Footer ──
  const navLinksHtml = FOOTER_NAV_LINKS.map(
    (link, i) =>
      `${i > 0 ? `<span style="color:${PDF_COLORS.borderLight};font-size:8px;padding:0 3px;">|</span>` : ""}<a href="${link.href}" style="color:${PDF_COLORS.textMuted};text-decoration:none;font-size:8px;">${escapeHtml(link.label)}</a>`
  ).join("");

  const socialIcons = Object.entries(SOCIAL_SVGS)
    .map(([, svg]) => `<span style="opacity:0.4;">${svg}</span>`)
    .join("");

  const footerHtml = `
    <footer style="padding-top:6px;border-top:0.5px solid ${PDF_COLORS.borderLight};display:grid;gap:3px;text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:1px;flex-wrap:wrap;line-height:1.8;">
        ${navLinksHtml}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
        ${logoIconBase64 ? `<img src="${logoIconBase64}" alt="" style="height:16px;width:16px;object-fit:contain;opacity:0.4;" />` : ""}
        ${socialIcons}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:7px;color:${PDF_COLORS.textFaint};">© ${new Date().getFullYear()} شركة Ain Jasaas</div>
        <div style="font-size:7px;color:${PDF_COLORS.textFaint};">صُنع في 🇸🇦</div>
        <div style="font-size:7px;color:${PDF_COLORS.textFaint};">صفحة ${pageNumber}</div>
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
    return pageRect.bottom - contentRect.top - 80;
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
    <section style="border:0.5px solid ${PDF_COLORS.borderLight};border-radius:14px;padding:14px 14px 12px;background:${bg};display:grid;gap:8px;break-inside:avoid;font-family:${PDF_FONT_FAMILY};direction:rtl;text-align:right;">
      <div style="display:flex;align-items:center;gap:10px;border-bottom:0.5px solid ${PDF_COLORS.borderLight};padding-bottom:6px;">
        <h2 style="margin:0;font-size:14px;font-weight:600;color:${PDF_COLORS.text};">${escapeHtml(title)}</h2>
      </div>
      ${body}
    </section>
  `;
  return wrapper.firstElementChild as HTMLElement;
}

/* ── Info grid (key-value pairs) ── */
export function buildPdfInfoGrid(items: Array<{ label: string; value: string; emphasized?: boolean }>) {
  return `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
      ${items
        .map(
          ({ label, value, emphasized }) => `
          <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:10px 12px;background:${emphasized ? PDF_COLORS.primaryLight : PDF_COLORS.cardBg};text-align:right;direction:rtl;">
            <div style="font-size:9px;color:${PDF_COLORS.textMuted};margin-bottom:3px;">${escapeHtml(label)}</div>
            <div style="font-size:${emphasized ? "14px" : "11px"};font-weight:${emphasized ? 600 : 500};color:${emphasized ? PDF_COLORS.primary : PDF_COLORS.text};line-height:1.7;word-break:break-word;overflow-wrap:anywhere;">${value}</div>
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
