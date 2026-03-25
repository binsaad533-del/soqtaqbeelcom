import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo.png";
import { BANK_DETAILS, COMMISSION_RATE, calculateCommission } from "@/hooks/useCommissions";

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
    return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
};
const formatPrice = (n: number) => n.toLocaleString("en-US");

async function loadLogoBase64(): Promise<string> {
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return ""; }
}

export async function generateAgreementPdf(data: AgreementData) {
  const pdf = new jsPDF("p", "mm", "a4");
  const html2canvas = (await import("html2canvas")).default;
  const logoBase64 = await loadLogoBase64();

  // Ensure font is loaded
  if (!document.querySelector('link[href*="IBM+Plex+Sans+Arabic"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    await new Promise(r => setTimeout(r, 800));
  }

  // Build a single continuous HTML block — let html2canvas + jsPDF handle pagination
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px;
    background: white;
    font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
    direction: rtl;
    color: #1e293b;
    line-height: 1.7;
    padding: 50px;
  `;
  document.body.appendChild(container);

  container.innerHTML = buildHtml(data, logoBase64);

  const canvas = await html2canvas(container, {
    scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", width: 794,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgHeight = (canvas.height * PAGE_W) / canvas.width;

  // Paginate the single tall image across A4 pages
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, PAGE_W, imgHeight);
  heightLeft -= PAGE_H;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, PAGE_W, imgHeight);
    heightLeft -= PAGE_H;
  }

  document.body.removeChild(container);
  pdf.save(`اتفاقية-${data.dealTitle || data.agreementNumber}.pdf`);
}

/* ── Build single continuous HTML ── */

function buildHtml(data: AgreementData, logoBase64: string): string {
  const f = `'IBM Plex Sans Arabic', system-ui, sans-serif`;
  const agreedPrice = data.financialTerms?.agreedPrice || 0;
  const currency = data.financialTerms?.currency || "ر.س";
  const bothApproved = data.buyerApproved && data.sellerApproved;
  const commAmount = data.commissionAmount || calculateCommission(data.dealAmount || agreedPrice);
  const commRate = data.commissionRate || COMMISSION_RATE;
  const dealAmt = data.dealAmount || agreedPrice;

  const logo = logoBase64
    ? `<img src="${logoBase64}" style="height: 36px; margin: 0 auto 6px auto; display: block;" />`
    : "";

  const sTitle = (t: string) =>
    `<h2 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 24px 0 10px 0; padding-bottom: 6px; border-bottom: 1.5px solid #e2e8f0; font-family: ${f};">${t}</h2>`;

  const row = (label: string, value: string) =>
    `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 11.5px; font-family: ${f};">
      <span style="color: #64748b;">${label}</span>
      <span style="color: #1e293b; font-weight: 600;">${value}</span>
    </div>`;

  const partyCard = (label: string, name: string | null, contact: string | null, approved: boolean, approvedAt: string | null) =>
    `<div style="flex: 1; background: ${approved ? "#f0fdf4" : "#f8fafc"}; border: 1px solid ${approved ? "#bbf7d0" : "#e2e8f0"}; border-radius: 10px; padding: 14px; font-family: ${f};">
      <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">${label}</div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${name || "—"}</div>
      ${contact ? `<div style="font-size: 10px; color: #64748b; direction: ltr; text-align: right;">${contact}</div>` : ""}
      <div style="margin-top: 8px; font-size: 10px; color: ${approved ? "#16a34a" : "#d97706"}; font-weight: 600;">
        ${approved ? `✓ تم الاعتماد${approvedAt ? ` — ${formatDate(approvedAt)}` : ""}` : "في انتظار الاعتماد"}
      </div>
    </div>`;

  const listItem = (text: string, color: string) =>
    `<div style="padding: 4px 0; font-size: 11.5px; color: #334155; display: flex; align-items: center; gap: 6px; font-family: ${f};">
      <span style="width: 5px; height: 5px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>${text}
    </div>`;

  let html = "";

  // ── Header ──
  html += `
    <div style="text-align: center; margin-bottom: 24px;">
      ${logo}
      <div style="font-size: 9px; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 4px;">سوق تقبيل — Taqbeel Marketplace</div>
      <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 3px 0; font-family: ${f};">اتفاقية الصفقة</h1>
      <p style="font-size: 11px; color: #64748b; margin: 0;">${data.dealTitle || ""} — ${data.location || ""}</p>
      <div style="margin-top: 10px; display: flex; justify-content: center; gap: 16px; font-size: 9px; color: #94a3b8;">
        <span>رقم: ${data.agreementNumber}</span>
        <span>الإصدار: ${data.version}</span>
        <span>التاريخ: ${formatDate(data.createdAt)}</span>
      </div>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px 0;" />`;

  // ── Completion badge ──
  if (bothApproved) {
    html += `<div style="text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; margin-bottom: 20px;">
      <div style="font-size: 13px; font-weight: 700; color: #16a34a; font-family: ${f};">🎉 تم اعتماد الاتفاقية من كلا الطرفين</div>
    </div>`;
  }

  // ── Party cards ──
  html += `<div style="display: flex; gap: 12px; margin-bottom: 20px;">
    ${partyCard("البائع", data.sellerName, data.sellerContact, data.sellerApproved, data.sellerApprovedAt)}
    ${partyCard("المشتري", data.buyerName, data.buyerContact, data.buyerApproved, data.buyerApprovedAt)}
  </div>`;

  // ── Price ──
  html += `<div style="text-align: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
    <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: ${f};">السعر المتفق عليه</div>
    <div style="font-size: 24px; font-weight: 700; color: #1d4ed8; font-family: ${f};">${formatPrice(agreedPrice)} ${currency}</div>
    ${data.financialTerms?.paymentNote ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${data.financialTerms.paymentNote}</div>` : ""}
  </div>`;

  // ── Deal details ──
  html += sTitle("تفاصيل الصفقة");
  html += row("نوع الصفقة", data.dealType);
  html += row("النشاط التجاري", data.businessActivity || "—");
  html += row("الموقع", data.location || "—");

  // ── Assets ──
  if (data.includedAssets.length > 0) {
    html += sTitle("الأصول المشمولة");
    html += data.includedAssets.map(a => listItem(a, "#22c55e")).join("");
  }
  if (data.excludedAssets.length > 0) {
    html += sTitle("المستثنى من الصفقة");
    html += data.excludedAssets.map(a => listItem(a, "#f59e0b")).join("");
  }

  // ── Lease + Licenses ──
  html += sTitle("تفاصيل الإيجار والتراخيص");
  html += row("الإيجار السنوي", data.leaseDetails?.annualRent || "—");
  html += row("المتبقي من العقد", data.leaseDetails?.remaining || "—");
  html += row("رخصة البلدية", data.licenseStatus?.municipality || "—");
  html += row("الدفاع المدني", data.licenseStatus?.civilDefense || "—");
  html += row("كاميرات المراقبة", data.licenseStatus?.cameras || "—");

  // ── Liabilities ──
  html += sTitle("الالتزامات المفصح عنها");
  html += row("التزامات مالية", data.liabilities?.financialLiabilities || "لا توجد");
  html += row("رواتب متأخرة", data.liabilities?.delayedSalaries || "لا يوجد");
  html += row("إيجار متأخر", data.liabilities?.unpaidRent || "لا يوجد");

  // ── Documents ──
  if (data.documentsReferenced.length > 0) {
    html += sTitle("المستندات المرجعية");
    html += data.documentsReferenced.map(d =>
      `<div style="padding: 4px 0; font-size: 11px; color: #334155; border-bottom: 1px solid #f1f5f9; font-family: ${f};">📄 ${d}</div>`
    ).join("");
  }

  // ── Declarations ──
  html += sTitle("الإقرارات والموافقات");
  if (data.declarations?.buyerDeclares) {
    html += `<div style="background: #f8fafc; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
      <div style="font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 3px; font-family: ${f};">إقرار المشتري:</div>
      <div style="font-size: 11px; color: #64748b; font-family: ${f};">${data.declarations.buyerDeclares}</div>
    </div>`;
  }
  if (data.declarations?.sellerDeclares) {
    html += `<div style="background: #f8fafc; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
      <div style="font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 3px; font-family: ${f};">إقرار البائع:</div>
      <div style="font-size: 11px; color: #64748b; font-family: ${f};">${data.declarations.sellerDeclares}</div>
    </div>`;
  }
  if (data.declarations?.platformNote) {
    html += `<div style="background: #eff6ff; border-radius: 8px; padding: 10px 12px; border: 1px solid #bfdbfe;">
      <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; margin-bottom: 3px; font-family: ${f};">ملاحظة المنصة:</div>
      <div style="font-size: 11px; color: #3b82f6; font-family: ${f};">${data.declarations.platformNote}</div>
    </div>`;
  }

  // ── Important notes ──
  if (data.importantNotes.length > 0) {
    html += sTitle("ملاحظات مهمة");
    html += data.importantNotes.map(n =>
      `<div style="padding: 5px 0; font-size: 11px; color: #92400e; border-bottom: 1px solid #fef3c7; font-family: ${f};">⚠️ ${n}</div>`
    ).join("");
  }

  // ── Amendment ──
  if (data.amendmentReason) {
    html += `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-top: 16px;">
      <div style="font-size: 10px; font-weight: 700; color: #92400e; margin-bottom: 3px; font-family: ${f};">سبب التعديل:</div>
      <div style="font-size: 11px; color: #a16207; font-family: ${f};">${data.amendmentReason}</div>
    </div>`;
  }

  // ── Commission + Bank Details ──
  html += sTitle("عمولة المنصة");
  html += `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 10px; color: #64748b; margin-bottom: 3px; font-family: ${f};">المبلغ المستحق</div>
        <div style="font-size: 20px; font-weight: 700; color: #1d4ed8; font-family: ${f};">${formatPrice(commAmount)} ر.س</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">(${(commRate * 100)}% من ${formatPrice(dealAmt)} ر.س)</div>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 10px 0;" />
      <div style="font-size: 10px; font-weight: 700; color: #334155; margin-bottom: 8px; font-family: ${f};">بيانات التحويل البنكي:</div>
      ${bankRow("اسم المستفيد", BANK_DETAILS.beneficiary, f)}
      ${bankRow("البنك", BANK_DETAILS.bank, f)}
      ${bankRow("رقم الحساب", BANK_DETAILS.accountNumber, f)}
      ${bankRow("رقم الآيبان (IBAN)", BANK_DETAILS.iban, f)}
    </div>
    <div style="font-size: 9px; color: #94a3b8; text-align: center; font-family: ${f};">
      يرجى رفع إثبات التحويل بعد السداد عبر المنصة
    </div>`;

  // ── Footer ──
  html += `
    <div style="margin-top: 30px; padding-top: 16px; border-top: 1.5px solid #e2e8f0; text-align: center; font-family: ${f};">
      ${logo}
      <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">سوق تقبيل — Taqbeel Marketplace</div>
      <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">منصة ذكية لتقبيل المشاريع والأعمال التجارية في المملكة العربية السعودية</div>
      <div style="font-size: 9px; color: #94a3b8; line-height: 1.5;">
        المنصة مملوكة ومدارة بواسطة شركة عين جساس للمقاولات — Ain Jasaas<br />
        سجل تجاري: ${BANK_DETAILS.nationalId}
      </div>
      <div style="font-size: 8px; color: #cbd5e1; margin-top: 8px;">
        هذه الوثيقة محفوظة إلكترونياً ولا يمكن تعديلها — رقم الاتفاقية: ${data.agreementNumber}
      </div>
    </div>`;

  return html;
}

function bankRow(label: string, value: string, f: string): string {
  return `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; font-family: ${f};">
    <span style="color: #64748b;">${label}</span>
    <span style="color: #1e293b; font-weight: 600; font-family: monospace, ${f}; direction: ltr;">${value}</span>
  </div>`;
}
