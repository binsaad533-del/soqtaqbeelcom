import { jsPDF } from "jspdf";

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

// A4: 210 x 297mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const MAX_Y = PAGE_H - MARGIN_BOTTOM;

export async function generateAgreementPdf(data: AgreementData) {
  const pdf = new jsPDF("p", "mm", "a4");

  // We'll render the PDF as an image-based approach using a hidden canvas
  // to support Arabic text properly since jsPDF doesn't natively support RTL Arabic.
  // Instead, we create a temporary off-screen HTML element, render it with html2canvas,
  // and split into properly paginated A4 pages.

  const html2canvas = (await import("html2canvas")).default;

  // Build a clean HTML document for PDF (no interactive elements)
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; /* A4 at 96dpi */
    background: white;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    direction: rtl;
    color: #1a1a1a;
    line-height: 1.7;
    padding: 0;
  `;
  document.body.appendChild(container);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch { return d; }
  };

  const formatPrice = (n: number) => n.toLocaleString("en-US");

  const sectionStyle = `margin-bottom: 28px;`;
  const sectionTitleStyle = `
    font-size: 15px; font-weight: 700; color: #0f172a;
    margin-bottom: 12px; padding-bottom: 6px;
    border-bottom: 2px solid #e2e8f0;
  `;
  const rowStyle = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;
  `;
  const labelStyle = `color: #64748b; font-weight: 500;`;
  const valueStyle = `color: #1e293b; font-weight: 600;`;

  const row = (label: string, value: string) =>
    `<div style="${rowStyle}"><span style="${labelStyle}">${label}</span><span style="${valueStyle}">${value}</span></div>`;

  const agreedPrice = data.financialTerms?.agreedPrice || 0;
  const currency = data.financialTerms?.currency || "ر.س";

  let html = `
    <!-- Page 1: Header + Parties + Deal Details + Financial -->
    <div style="padding: 50px 50px 40px 50px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 35px;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; letter-spacing: 1px;">سوق تقبيل</div>
        <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">اتفاقية الصفقة</h1>
        <p style="font-size: 13px; color: #64748b; margin: 0;">${data.dealTitle || ""} — ${data.location || ""}</p>
        <div style="margin-top: 14px; display: flex; justify-content: center; gap: 20px; font-size: 11px; color: #94a3b8;">
          <span>رقم الاتفاقية: ${data.agreementNumber}</span>
          <span>الإصدار: ${data.version}</span>
          <span>التاريخ: ${formatDate(data.createdAt)}</span>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 30px 0;" />

      <!-- Parties -->
      <div style="${sectionStyle}">
        <h2 style="${sectionTitleStyle}">أطراف الاتفاقية</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">الطرف الأول (البائع)</div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${data.sellerName || "—"}</div>
            <div style="font-size: 12px; color: #64748b;" dir="ltr">${data.sellerContact || "—"}</div>
            ${data.sellerApproved ? `<div style="margin-top: 8px; font-size: 11px; color: #16a34a;">✓ تم الاعتماد — ${data.sellerApprovedAt ? formatDate(data.sellerApprovedAt) : ""}</div>` : `<div style="margin-top: 8px; font-size: 11px; color: #f59e0b;">في الانتظار</div>`}
          </div>
          <div style="background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">الطرف الثاني (المشتري)</div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${data.buyerName || "—"}</div>
            <div style="font-size: 12px; color: #64748b;" dir="ltr">${data.buyerContact || "—"}</div>
            ${data.buyerApproved ? `<div style="margin-top: 8px; font-size: 11px; color: #16a34a;">✓ تم الاعتماد — ${data.buyerApprovedAt ? formatDate(data.buyerApprovedAt) : ""}</div>` : `<div style="margin-top: 8px; font-size: 11px; color: #f59e0b;">في الانتظار</div>`}
          </div>
        </div>
      </div>

      <!-- Deal Details -->
      <div style="${sectionStyle}">
        <h2 style="${sectionTitleStyle}">تفاصيل الصفقة</h2>
        ${row("عنوان الصفقة", data.dealTitle || "—")}
        ${row("نوع الصفقة", data.dealType)}
        ${row("الموقع", data.location || "—")}
        ${row("النشاط التجاري", data.businessActivity || "—")}
      </div>

      <!-- Financial Terms -->
      <div style="${sectionStyle}">
        <h2 style="${sectionTitleStyle}">الشروط المالية</h2>
        <div style="text-align: center; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">السعر المتفق عليه</div>
          <div style="font-size: 24px; font-weight: 800; color: #0369a1;">${formatPrice(agreedPrice)} ${currency}</div>
        </div>
        ${data.financialTerms?.paymentNote ? row("ملاحظة الدفع", data.financialTerms.paymentNote) : ""}
      </div>
    </div>
  `;

  // Page 2: Assets + Lease + Liabilities + Licenses
  html += `
    <div style="padding: 50px 50px 40px 50px; page-break-before: always;">
  `;

  if (data.includedAssets.length > 0) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">الأصول المشمولة</h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${data.includedAssets.map(a => `<li style="padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 8px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"></span>${a}</li>`).join("")}
      </ul>
    </div>`;
  }

  if (data.excludedAssets.length > 0) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">المستثنى من الصفقة</h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${data.excludedAssets.map(a => `<li style="padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 8px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0;"></span>${a}</li>`).join("")}
      </ul>
    </div>`;
  }

  html += `
    <div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">تفاصيل الإيجار</h2>
      ${row("الإيجار السنوي", data.leaseDetails?.annualRent || "—")}
      ${row("المتبقي من العقد", data.leaseDetails?.remaining || "—")}
    </div>

    <div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">الالتزامات المفصح عنها</h2>
      ${row("التزامات مالية", data.liabilities?.financialLiabilities || "لا توجد")}
      ${row("رواتب متأخرة", data.liabilities?.delayedSalaries || "لا يوجد")}
      ${row("إيجار متأخر", data.liabilities?.unpaidRent || "لا يوجد")}
    </div>

    <div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">حالة التراخيص</h2>
      ${row("رخصة البلدية", data.licenseStatus?.municipality || "—")}
      ${row("الدفاع المدني", data.licenseStatus?.civilDefense || "—")}
      ${row("كاميرات المراقبة", data.licenseStatus?.cameras || "—")}
    </div>
  `;

  if (data.documentsReferenced.length > 0) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">المستندات المرجعية</h2>
      ${data.documentsReferenced.map(d => `<div style="padding: 6px 0; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">📄 ${d}</div>`).join("")}
    </div>`;
  }

  html += `</div>`;

  // Page 3: Declarations + Notes + Footer
  html += `
    <div style="padding: 50px 50px 40px 50px; page-break-before: always;">
  `;

  if (data.declarations) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">الإقرارات</h2>`;
    if (data.declarations.buyerDeclares) {
      html += `<div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px;">إقرار المشتري:</div>
        <div style="font-size: 13px; color: #64748b;">${data.declarations.buyerDeclares}</div>
      </div>`;
    }
    if (data.declarations.sellerDeclares) {
      html += `<div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px;">إقرار البائع:</div>
        <div style="font-size: 13px; color: #64748b;">${data.declarations.sellerDeclares}</div>
      </div>`;
    }
    if (data.declarations.platformNote) {
      html += `<div style="background: #eff6ff; border-radius: 10px; padding: 14px; border: 1px solid #bfdbfe;">
        <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px;">ملاحظة المنصة:</div>
        <div style="font-size: 13px; color: #3b82f6;">${data.declarations.platformNote}</div>
      </div>`;
    }
    html += `</div>`;
  }

  if (data.importantNotes.length > 0) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">ملاحظات مهمة</h2>
      ${data.importantNotes.map(n => `<div style="padding: 8px 0; font-size: 13px; color: #92400e; border-bottom: 1px solid #fef3c7;">⚠️ ${n}</div>`).join("")}
    </div>`;
  }

  if (data.amendmentReason) {
    html += `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 28px;">
      <div style="font-size: 11px; font-weight: 700; color: #92400e; margin-bottom: 4px;">سبب التعديل:</div>
      <div style="font-size: 13px; color: #a16207;">${data.amendmentReason}</div>
    </div>`;
  }

  // Commission
  if (data.commissionAmount && data.dealAmount) {
    html += `<div style="${sectionStyle}">
      <h2 style="${sectionTitleStyle}">عمولة المنصة</h2>
      <div style="text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">المبلغ المستحق</div>
        <div style="font-size: 20px; font-weight: 800; color: #0369a1;">${formatPrice(data.commissionAmount)} ر.س</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">(${((data.commissionRate || 0.01) * 100)}% من ${formatPrice(data.dealAmount)} ر.س)</div>
      </div>
    </div>`;
  }

  // Footer
  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">سوق تقبيل</div>
      <div style="font-size: 11px; color: #94a3b8;">منصة ذكية لتقبيل المشاريع والأعمال التجارية في المملكة العربية السعودية</div>
      <div style="font-size: 10px; color: #cbd5e1; margin-top: 12px;">هذه الوثيقة محفوظة إلكترونياً ولا يمكن تعديلها — رقم الاتفاقية: ${data.agreementNumber}</div>
    </div>
  </div>`;

  container.innerHTML = html;

  // Find all "page" divs
  const pages = container.querySelectorAll<HTMLElement>(":scope > div");

  for (let i = 0; i < pages.length; i++) {
    // Isolate each page for rendering
    const pageEl = pages[i];
    // Temporarily show only this page
    pages.forEach((p, j) => { p.style.display = j === i ? "block" : "none"; });

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeight = (canvas.height * PAGE_W) / canvas.width;

    if (i > 0) pdf.addPage();

    // If page content fits in one A4 page
    if (imgHeight <= PAGE_H) {
      pdf.addImage(imgData, "PNG", 0, 0, PAGE_W, imgHeight);
    } else {
      // Split tall content across multiple PDF pages
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

  // Restore and cleanup
  document.body.removeChild(container);

  const title = data.dealTitle || data.agreementNumber;
  pdf.save(`اتفاقية-${title}.pdf`);
}