import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo.png";

interface AgreementData {
  agreementNumber: string;
  version: number;
  createdAt: string;
  dealTitle: string | null;
  dealType: string;
  location: string | null;
  businessActivity: string | null;
  buyerName: string | null;
  buyerContact: string | null;
  sellerName: string | null;
  sellerContact: string | null;
  financialTerms: { agreedPrice?: number; currency?: string; paymentNote?: string } | null;
  includedAssets: string[];
  excludedAssets: string[];
  leaseDetails: { annualRent?: string; remaining?: string } | null;
  liabilities: { financialLiabilities?: string; delayedSalaries?: string; unpaidRent?: string } | null;
  licenseStatus: { municipality?: string; civilDefense?: string; cameras?: string } | null;
  documentsReferenced: string[];
  declarations: { buyerDeclares?: string; sellerDeclares?: string; platformNote?: string } | null;
  importantNotes: string[];
  amendmentReason: string | null;
  buyerApproved: boolean;
  buyerApprovedAt: string | null;
  sellerApproved: boolean;
  sellerApprovedAt: string | null;
  commissionAmount?: number | null;
  commissionRate?: number | null;
  dealAmount?: number | null;
}

const PAGE_W = 210;
const PAGE_H = 297;

const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
};

const formatPrice = (n: number) => n.toLocaleString("en-US");

/** Pre-load the logo as a base64 data URL for embedding in the off-screen HTML */
async function loadLogoBase64(): Promise<string> {
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function generateAgreementPdf(data: AgreementData) {
  const pdf = new jsPDF("p", "mm", "a4");
  const html2canvas = (await import("html2canvas")).default;
  const logoBase64 = await loadLogoBase64();

  // Ensure IBM Plex Sans Arabic font is loaded
  if (!document.querySelector('link[href*="IBM+Plex+Sans+Arabic"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    await new Promise(r => setTimeout(r, 800));
  }

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px;
    background: white;
    font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
    direction: rtl;
    color: #1e293b;
    line-height: 1.8;
    padding: 0;
  `;
  document.body.appendChild(container);

  const agreedPrice = data.financialTerms?.agreedPrice || 0;
  const currency = data.financialTerms?.currency || "ر.س";
  const bothApproved = data.buyerApproved && data.sellerApproved;

  const html = buildHtml(data, agreedPrice, currency, bothApproved, logoBase64);
  container.innerHTML = html;

  const pages = container.querySelectorAll<HTMLElement>(":scope > div");

  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];
    pages.forEach((p, j) => { p.style.display = j === i ? "block" : "none"; });

    const canvas = await html2canvas(pageEl, {
      scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", width: 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeight = (canvas.height * PAGE_W) / canvas.width;

    if (i > 0) pdf.addPage();

    if (imgHeight <= PAGE_H) {
      pdf.addImage(imgData, "PNG", 0, 0, PAGE_W, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, PAGE_W, imgHeight);
      heightLeft -= PAGE_H;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, PAGE_W, imgHeight);
        heightLeft -= PAGE_H;
      }
    }
  }

  document.body.removeChild(container);
  const title = data.dealTitle || data.agreementNumber;
  pdf.save(`اتفاقية-${title}.pdf`);
}

/* ── HTML Builder ── */

function buildHtml(
  data: AgreementData,
  agreedPrice: number,
  currency: string,
  bothApproved: boolean,
  logoBase64: string,
): string {
  const fontFamily = `'IBM Plex Sans Arabic', system-ui, sans-serif`;
  const sectionTitle = `font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; font-family: ${fontFamily};`;
  const infoRow = (label: string, value: string) =>
    `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-family: ${fontFamily};">
      <span style="color: #64748b;">${label}</span>
      <span style="color: #1e293b; font-weight: 600;">${value}</span>
    </div>`;

  const partyCard = (label: string, name: string | null, contact: string | null, approved: boolean, approvedAt: string | null) => `
    <div style="flex: 1; background: ${approved ? "#f0fdf4" : "#f8fafc"}; border: 1px solid ${approved ? "#bbf7d0" : "#e2e8f0"}; border-radius: 12px; padding: 18px; font-family: ${fontFamily};">
      <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">${label}</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">${name || "—"}</div>
      ${contact ? `<div style="font-size: 11px; color: #64748b; direction: ltr; text-align: right;">${contact}</div>` : ""}
      <div style="margin-top: 10px; font-size: 11px; color: ${approved ? "#16a34a" : "#d97706"}; font-weight: 600;">
        ${approved ? `✓ تم الاعتماد${approvedAt ? ` — ${formatDate(approvedAt)}` : ""}` : "في انتظار الاعتماد"}
      </div>
    </div>`;

  const listItem = (text: string, color: string) =>
    `<div style="padding: 5px 0; font-size: 12px; color: #334155; display: flex; align-items: center; gap: 8px; font-family: ${fontFamily};">
      <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>${text}
    </div>`;

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" style="height: 40px; margin: 0 auto 8px auto; display: block;" />`
    : "";

  // ── Page 1: Header + Parties + Price + Deal Details + Assets ──
  let page1 = `<div style="padding: 50px 50px 40px 50px; font-family: ${fontFamily};">`;

  // Header with logo
  page1 += `
    <div style="text-align: center; margin-bottom: 30px;">
      ${logoImg}
      <div style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px;">سوق تقبيل — Taqbeel Marketplace</div>
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; font-family: ${fontFamily};">اتفاقية الصفقة</h1>
      <p style="font-size: 12px; color: #64748b; margin: 0;">${data.dealTitle || ""} — ${data.location || ""}</p>
      <div style="margin-top: 12px; display: flex; justify-content: center; gap: 20px; font-size: 10px; color: #94a3b8;">
        <span>رقم: ${data.agreementNumber}</span>
        <span>الإصدار: ${data.version}</span>
        <span>التاريخ: ${formatDate(data.createdAt)}</span>
      </div>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px 0;" />`;

  // Completion badge
  if (bothApproved) {
    page1 += `
      <div style="text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 700; color: #16a34a; font-family: ${fontFamily};">🎉 تم اعتماد الاتفاقية من كلا الطرفين</div>
        <div style="font-size: 11px; color: #4ade80; margin-top: 4px;">هذه الاتفاقية محفوظة ولا يمكن تعديلها</div>
      </div>`;
  }

  // Party cards
  page1 += `
    <div style="display: flex; gap: 14px; margin-bottom: 28px;">
      ${partyCard("البائع", data.sellerName, data.sellerContact, data.sellerApproved, data.sellerApprovedAt)}
      ${partyCard("المشتري", data.buyerName, data.buyerContact, data.buyerApproved, data.buyerApprovedAt)}
    </div>`;

  // Price highlight
  page1 += `
    <div style="text-align: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 22px; margin-bottom: 28px;">
      <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; font-family: ${fontFamily};">السعر المتفق عليه</div>
      <div style="font-size: 26px; font-weight: 700; color: #1d4ed8; font-family: ${fontFamily};">${formatPrice(agreedPrice)} ${currency}</div>
      ${data.financialTerms?.paymentNote ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">${data.financialTerms.paymentNote}</div>` : ""}
    </div>`;

  // Deal details
  page1 += `
    <div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">تفاصيل الصفقة</h2>
      ${infoRow("نوع الصفقة", data.dealType)}
      ${infoRow("النشاط التجاري", data.businessActivity || "—")}
      ${infoRow("الموقع", data.location || "—")}
    </div>`;

  // Assets
  if (data.includedAssets.length > 0) {
    page1 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">الأصول المشمولة</h2>
      ${data.includedAssets.map(a => listItem(a, "#22c55e")).join("")}
    </div>`;
  }
  if (data.excludedAssets.length > 0) {
    page1 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">المستثنى من الصفقة</h2>
      ${data.excludedAssets.map(a => listItem(a, "#f59e0b")).join("")}
    </div>`;
  }

  page1 += `</div>`;

  // ── Page 2: Lease/Licenses + Liabilities + Docs + Declarations + Commission + Footer ──
  let page2 = `<div style="padding: 50px 50px 40px 50px; font-family: ${fontFamily};">`;

  // Lease + Licenses
  page2 += `
    <div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">تفاصيل الإيجار والتراخيص</h2>
      ${infoRow("الإيجار السنوي", data.leaseDetails?.annualRent || "—")}
      ${infoRow("المتبقي من العقد", data.leaseDetails?.remaining || "—")}
      ${infoRow("رخصة البلدية", data.licenseStatus?.municipality || "—")}
      ${infoRow("الدفاع المدني", data.licenseStatus?.civilDefense || "—")}
      ${infoRow("كاميرات المراقبة", data.licenseStatus?.cameras || "—")}
    </div>`;

  // Liabilities
  page2 += `
    <div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">الالتزامات المفصح عنها</h2>
      ${infoRow("التزامات مالية", data.liabilities?.financialLiabilities || "لا توجد")}
      ${infoRow("رواتب متأخرة", data.liabilities?.delayedSalaries || "لا يوجد")}
      ${infoRow("إيجار متأخر", data.liabilities?.unpaidRent || "لا يوجد")}
    </div>`;

  // Documents
  if (data.documentsReferenced.length > 0) {
    page2 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">المستندات المرجعية</h2>
      ${data.documentsReferenced.map(d => `<div style="padding: 5px 0; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; font-family: ${fontFamily};">📄 ${d}</div>`).join("")}
    </div>`;
  }

  // ── Declarations (buyer + seller + platform) ──
  page2 += `<div style="margin-bottom: 28px;">
    <h2 style="${sectionTitle}">الإقرارات والموافقات</h2>`;

  if (data.declarations?.buyerDeclares) {
    page2 += `<div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px; font-family: ${fontFamily};">إقرار المشتري:</div>
      <div style="font-size: 12px; color: #64748b; font-family: ${fontFamily};">${data.declarations.buyerDeclares}</div>
    </div>`;
  }
  if (data.declarations?.sellerDeclares) {
    page2 += `<div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
      <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px; font-family: ${fontFamily};">إقرار البائع:</div>
      <div style="font-size: 12px; color: #64748b; font-family: ${fontFamily};">${data.declarations.sellerDeclares}</div>
    </div>`;
  }
  if (data.declarations?.platformNote) {
    page2 += `<div style="background: #eff6ff; border-radius: 10px; padding: 14px; border: 1px solid #bfdbfe;">
      <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px; font-family: ${fontFamily};">ملاحظة المنصة:</div>
      <div style="font-size: 12px; color: #3b82f6; font-family: ${fontFamily};">${data.declarations.platformNote}</div>
    </div>`;
  }
  page2 += `</div>`;

  // Important notes
  if (data.importantNotes.length > 0) {
    page2 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">ملاحظات مهمة</h2>
      ${data.importantNotes.map(n => `<div style="padding: 6px 0; font-size: 12px; color: #92400e; border-bottom: 1px solid #fef3c7; font-family: ${fontFamily};">⚠️ ${n}</div>`).join("")}
    </div>`;
  }

  // Amendment reason
  if (data.amendmentReason) {
    page2 += `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 28px;">
      <div style="font-size: 11px; font-weight: 700; color: #92400e; margin-bottom: 4px; font-family: ${fontFamily};">سبب التعديل:</div>
      <div style="font-size: 12px; color: #a16207; font-family: ${fontFamily};">${data.amendmentReason}</div>
    </div>`;
  }

  // ── Commission Section ──
  if (data.commissionAmount && data.dealAmount) {
    page2 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">عمولة المنصة</h2>
      <div style="text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; font-family: ${fontFamily};">المبلغ المستحق</div>
        <div style="font-size: 20px; font-weight: 700; color: #1d4ed8; font-family: ${fontFamily};">${formatPrice(data.commissionAmount)} ر.س</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">(${((data.commissionRate || 0.01) * 100)}% من ${formatPrice(data.dealAmount)} ر.س)</div>
      </div>
      <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; font-family: ${fontFamily};">
        يرجى التحويل إلى حساب شركة عين جساس للمقاولات — مصرف الراجحي
      </div>
    </div>`;
  } else if (data.dealAmount || agreedPrice) {
    const amount = data.dealAmount || agreedPrice;
    const commAmount = amount * (data.commissionRate || 0.01);
    page2 += `<div style="margin-bottom: 28px;">
      <h2 style="${sectionTitle}">عمولة المنصة</h2>
      <div style="font-size: 11px; color: #64748b; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; font-family: ${fontFamily};">
        عمولة المنصة: <strong>${formatPrice(commAmount)} ر.س</strong> (${((data.commissionRate || 0.01) * 100)}% من قيمة الصفقة)
        <br /><span style="font-size: 10px; color: #94a3b8;">يرجى التحويل إلى حساب شركة عين جساس للمقاولات — مصرف الراجحي</span>
      </div>
    </div>`;
  }

  // ── Footer with branding ──
  page2 += `
    <div style="margin-top: 40px; padding-top: 18px; border-top: 2px solid #e2e8f0; text-align: center; font-family: ${fontFamily};">
      ${logoImg}
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">سوق تقبيل — Taqbeel Marketplace</div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">منصة ذكية لتقبيل المشاريع والأعمال التجارية في المملكة العربية السعودية</div>
      <div style="font-size: 10px; color: #94a3b8; line-height: 1.6;">
        المنصة مملوكة ومدارة بواسطة شركة عين جساس للمقاولات — Ain Jasaas<br />
        سجل تجاري: 7017628152
      </div>
      <div style="font-size: 9px; color: #cbd5e1; margin-top: 10px;">
        هذه الوثيقة محفوظة إلكترونياً ولا يمكن تعديلها — رقم الاتفاقية: ${data.agreementNumber}
      </div>
    </div>`;

  page2 += `</div>`;

  return page1 + page2;
}
