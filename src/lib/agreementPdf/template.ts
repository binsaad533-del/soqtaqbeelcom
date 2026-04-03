import { BANK_DETAILS, COMMISSION_RATE, calculateCommission } from "@/hooks/useCommissions";
import type { AgreementPdfData } from "./types";

export const PAGE_WIDTH_PX = 794;
export const PAGE_HEIGHT_PX = 1123;

const FONT_FAMILY = `'IBM Plex Sans Arabic', system-ui, sans-serif`;
const PAGE_SHELL_STYLE = [
  `width:${PAGE_WIDTH_PX}px`,
  `height:${PAGE_HEIGHT_PX}px`,
  "background:#ffffff",
  `font-family:${FONT_FAMILY}`,
  "direction:rtl",
  "color:hsl(215 25% 18%)",
  "display:flex",
  "flex-direction:column",
  "box-sizing:border-box",
  "padding:34px 34px 28px",
  "gap:16px",
  "overflow:hidden",
].join(";");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeText = (value?: string | null, fallback = "—") => {
  const cleaned = value?.toString().trim();
  return escapeHtml(cleaned && cleaned.length > 0 ? cleaned : fallback);
};

const formatDate = (value?: string | null) => {
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

const formatPrice = (value?: number | null) => Number(value || 0).toLocaleString("en-US");

const compactText = (value?: string | null, maxLength = 150) => {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  if (!cleaned) return "—";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}…`;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
};

const createNode = (html: string) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  return wrapper.firstElementChild as HTMLElement;
};

const infoGrid = (items: Array<{ label: string; value: string; emphasized?: boolean }>) => `
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
    ${items
      .map(
        ({ label, value, emphasized }) => `
          <div style="border:0.5px solid hsl(214 32% 91%);border-radius:16px;padding:12px 14px;text-align:right;direction:rtl;background:${
            emphasized ? "hsl(210 100% 98%)" : "hsl(210 40% 98%)"
          }">
            <div style="font-size:10px;color:hsl(215 16% 45%);margin-bottom:4px;">${escapeHtml(label)}</div>
            <div style="font-size:${emphasized ? "16px" : "12px"};font-weight:${emphasized ? 600 : 500};color:${
              emphasized ? "hsl(212 84% 42%)" : "hsl(215 25% 18%)"
            };line-height:1.8;word-break:break-word;overflow-wrap:anywhere;">${value}</div>
          </div>`,
      )
      .join("")}
  </div>`;

const listCard = (items: string[], _tone: "neutral" | "success" | "warning" = "neutral") => {
  // Unified blue palette regardless of tone
  const accent = "hsl(212 84% 42%)";

  return `
    <div style="display:grid;gap:8px;">
      ${items
        .map(
          (item) => `
            <div style="display:flex;align-items:flex-start;gap:8px;border:0.5px solid hsl(214 32% 91%);border-radius:14px;padding:10px 12px;background:hsl(210 40% 98%);font-size:11px;line-height:1.8;color:hsl(215 25% 18%);">
              <span style="width:6px;height:6px;border-radius:999px;background:${accent};margin-top:7px;flex-shrink:0;"></span>
              <span>${safeText(item)}</span>
            </div>`,
        )
        .join("")}
    </div>`;
};

const section = (title: string, body: string, tone: "default" | "highlight" = "default") => {
  const background = tone === "highlight" ? "hsl(210 100% 98%)" : "#ffffff";
  return createNode(`
    <section style="border:0.5px solid hsl(214 32% 91%);border-radius:22px;padding:18px 18px 16px;background:${background};display:grid;gap:12px;break-inside:avoid;text-align:right;direction:rtl;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:0.5px solid hsl(214 32% 93%);padding-bottom:10px;">
        <h2 style="margin:0;font-size:15px;font-weight:600;color:hsl(215 28% 17%);">${escapeHtml(title)}</h2>
      </div>
      ${body}
    </section>
  `);
};

const buildPageShell = (data: AgreementPdfData, logoBase64: string, logoIconBase64: string, pageNumber: number) => {
  const page = document.createElement("div");
  page.style.cssText = PAGE_SHELL_STYLE;

  const header = createNode(`
    <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:14px;border-bottom:0.5px solid hsl(214 32% 93%);">
      <div style="display:grid;gap:5px;flex:1;text-align:right;">
        <div style="font-size:15px;font-weight:500;color:hsl(215 28% 17%);">اتفاقية الصفقة</div>
        <div style="font-size:10px;color:hsl(215 16% 45%);line-height:1.7;">${safeText(data.dealTitle)} — ${safeText(data.location)}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:9px;color:hsl(215 16% 45%);">
          <span>رقم الاتفاقية: ${safeText(data.agreementNumber)}</span>
          <span>الإصدار: ${data.version}</span>
          <span>التاريخ: ${formatDate(data.createdAt)}</span>
        </div>
      </div>
      ${logoBase64 ? `<div style="width:320px;display:flex;align-items:center;justify-content:flex-start;flex-shrink:0;"><img src="${logoBase64}" alt="سوق تقبيل" style="height:112px;width:320px;object-fit:contain;object-position:left center;display:block;" /></div>` : ""}
    </header>
  `);

  const content = document.createElement("div");
  content.style.cssText = "display:flex;flex-direction:column;flex:1;gap:12px;padding-top:2px;overflow:visible;";

  const navLinks = [
    { label: "الرئيسية", href: "https://soqtaqbeel.com/" },
    { label: "سوق الفرص", href: "https://soqtaqbeel.com/marketplace" },
    { label: "كيف تعمل المنصة", href: "https://soqtaqbeel.com/how-it-works" },
    { label: "تواصل معنا", href: "https://soqtaqbeel.com/contact" },
    { label: "مركز المساعدة", href: "https://soqtaqbeel.com/help" },
    { label: "العمولة", href: "https://soqtaqbeel.com/commission" },
  ];
  const navHtml = navLinks.map(
    (l, i) => `${i > 0 ? '<span style="color:hsl(214 32% 93%);font-size:9px;padding:0 4px;">|</span>' : ''}<a href="${l.href}" style="color:hsl(215 16% 45%);text-decoration:none;font-size:9px;">${escapeHtml(l.label)}</a>`
  ).join("");

  const footer = createNode(`
    <footer style="padding-top:10px;border-top:0.5px solid hsl(214 32% 93%);display:grid;gap:6px;text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:2px;flex-wrap:wrap;line-height:2;">
        ${navHtml}
      </div>
      ${logoIconBase64 ? `<div style="text-align:center;"><img src="${logoIconBase64}" alt="سوق تقبيل" style="height:28px;width:28px;object-fit:contain;opacity:0.5;" /></div>` : ""}
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;opacity:0.45;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5"><path d="M12 2c-2.5 0-4.5 1.5-5 4l-.5 3c-.1.5-.5.8-1 .8-.3 0-.5.2-.5.5s.2.5.5.5c.5 0 1 .2 1.3.5.3.4.2.8-.2 1.2-.5.5-1.5 1-2.5 1.5-.3.2-.5.5-.3.8.2.5.8.7 1.5.8.3 0 .5.2.5.5 0 .3.2.5.5.5h.5c.5 0 1 .2 1.5.5s1.2.8 2.2.8 1.7-.5 2.2-.8.9-.5 1.5-.5h.5c.3 0 .5-.2.5-.5 0-.3.2-.5.5-.5.7-.1 1.3-.3 1.5-.8.2-.3 0-.6-.3-.8-1-.5-2-1-2.5-1.5-.4-.4-.5-.8-.2-1.2.3-.3.8-.5 1.3-.5.3 0 .5-.2.5-.5s-.2-.5-.5-.5c-.5 0-.9-.3-1-.8l-.5-3c-.5-2.5-2.5-4-5-4z"/></svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 55%)" stroke-width="1.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
      </div>
      <div style="font-size:9px;color:hsl(215 16% 45%);line-height:1.8;">
        في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:8px;color:hsl(215 16% 55%);line-height:1.8;">
          © ${new Date().getFullYear()} المنصة مملوكة ومدارة بواسطة شركة Ain Jasaas
        </div>
        <div style="font-size:8px;color:hsl(215 16% 45%);white-space:nowrap;">صفحة ${pageNumber}</div>
      </div>
    </footer>
  `);

  page.append(header, content, footer);
  return { page, content };
};

const buildSections = (data: AgreementPdfData, qrDataUrl = "") => {
  const agreedPrice = data.financialTerms?.agreedPrice || 0;
  const currency = data.financialTerms?.currency || "﷼";
  const dealAmount = data.dealAmount || agreedPrice;
  const commissionAmount = data.commissionAmount ?? calculateCommission(dealAmount);
  const commissionRate = data.commissionRate ?? COMMISSION_RATE;
  const bothApproved = data.buyerApproved && data.sellerApproved;

  const sections: HTMLElement[] = [];

  sections.push(
    section(
      "الملخص التنفيذي",
      `
        <div style="display:grid;gap:12px;">
          <div style="border-radius:22px;padding:18px;background:linear-gradient(135deg, hsl(210 100% 98%), hsl(195 80% 96%));border:0.5px solid hsl(201 87% 86%);display:grid;gap:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div>
                <div style="font-size:11px;color:hsl(215 16% 45%);margin-bottom:4px;">حالة الاتفاقية</div>
                <div style="font-size:20px;font-weight:600;color:hsl(212 84% 42%);">
                  ${bothApproved ? "مكتملة وجاهزة للتحميل" : "بانتظار اعتماد الطرفين"}
                </div>
              </div>
              <div style="padding:10px 14px;border-radius:999px;background:hsl(212 84% 42% / 0.1);color:hsl(212 84% 42%);font-size:11px;font-weight:500;white-space:nowrap;">
                ${bothApproved ? "تهانينا للطرفين" : "اعتماد قيد الاستكمال"}
              </div>
            </div>
            ${infoGrid([
              { label: "قيمة الصفقة", value: `${formatPrice(agreedPrice)} ${escapeHtml(currency)}`, emphasized: true },
              { label: "نوع الصفقة", value: safeText(data.dealType) },
              { label: "النشاط التجاري", value: safeText(data.businessActivity) },
              { label: "الموقع", value: safeText(data.location) },
            ])}
          </div>
        </div>`,
      "highlight",
    ),
  );

  sections.push(
    section(
      "الأطراف والاعتماد",
      `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          ${[
            {
              label: "البائع",
              name: data.sellerName,
              contact: data.sellerContact,
              approved: data.sellerApproved,
              approvedAt: data.sellerApprovedAt,
            },
            {
              label: "المشتري",
              name: data.buyerName,
              contact: data.buyerContact,
              approved: data.buyerApproved,
              approvedAt: data.buyerApprovedAt,
            },
          ]
            .map(
              (party) => `
                <div style="border:0.5px solid ${party.approved ? "hsl(212 84% 82%)" : "hsl(214 32% 91%)"};background:${
                  party.approved ? "hsl(210 100% 97%)" : "hsl(210 40% 98%)"
                };border-radius:18px;padding:16px;display:grid;gap:7px;">
                  <div style="font-size:10px;color:hsl(215 16% 45%);">${party.label}</div>
                  <div style="font-size:15px;font-weight:600;color:hsl(215 28% 17%);">${safeText(party.name)}</div>
                  <div style="font-size:12px;color:hsl(215 16% 45%);direction:ltr;text-align:right;">${safeText(party.contact)}</div>
                  <div style="font-size:11px;font-weight:500;color:${party.approved ? "hsl(212 84% 42%)" : "hsl(212 60% 60%)"};">
                    ${party.approved ? `✓ تم الاعتماد في ${formatDate(party.approvedAt)}` : "بانتظار الاعتماد"}
                  </div>
                </div>`,
            )
            .join("")}
        </div>
      `,
    ),
  );

  sections.push(
    section(
      "شروط الاعتماد المختصرة",
      `
        <div style="display:grid;gap:10px;">
          ${[
            "اعتماد كل طرف يعني أنه راجع بيانات الصفقة الظاهرة في هذه الوثيقة ويوافق عليها وفق ما قدمه للطرف الآخر.",
            "تُصبح الاتفاقية مكتملة وقابلة للتحميل النهائي مباشرة بعد اعتماد الطرفين مع حفظ تاريخ كل اعتماد.",
            `عمولة المنصة ${commissionRate * 100}% من قيمة الصفقة، وتسدد إلى حساب Ain Jasaas البنكي الموضح في قسم العمولة.`,
          ]
            .map(
              (item, index) => `
                <div style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:hsl(210 40% 98%);border:0.5px solid hsl(214 32% 91%);">
                  <div style="width:22px;height:22px;border-radius:999px;background:hsl(212 84% 42% / 0.1);color:hsl(212 84% 42%);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;">${index + 1}</div>
                  <div style="font-size:11px;line-height:1.9;color:hsl(215 25% 18%);font-weight:400;">${escapeHtml(item)}</div>
                </div>`,
            )
            .join("")}
        </div>
      `,
      "highlight",
    ),
  );

  sections.push(
    section(
      "تفاصيل الصفقة الأساسية",
      infoGrid([
        { label: "المبلغ المتفق عليه", value: `${formatPrice(agreedPrice)} ${escapeHtml(currency)}`, emphasized: true },
        { label: "قيمة احتساب العمولة", value: `${formatPrice(dealAmount)} ${escapeHtml(currency)}` },
        { label: "ملاحظة السداد", value: safeText(data.financialTerms?.paymentNote) },
        { label: "رقم الإصدار", value: escapeHtml(String(data.version)) },
      ]),
    ),
  );

  if (data.includedAssets.length > 0) {
    chunk(data.includedAssets, 6).forEach((group, index) => {
      sections.push(section(index === 0 ? "الأصول المشمولة" : "الأصول المشمولة — متابعة", listCard(group, "success")));
    });
  }

  if (data.excludedAssets.length > 0) {
    chunk(data.excludedAssets, 6).forEach((group, index) => {
      sections.push(section(index === 0 ? "المستثنى من الصفقة" : "المستثنى من الصفقة — متابعة", listCard(group, "warning")));
    });
  }

  sections.push(
    section(
      "الإيجار والتراخيص",
      infoGrid([
        { label: "الإيجار السنوي", value: safeText(data.leaseDetails?.annualRent) },
        { label: "المتبقي من العقد", value: safeText(data.leaseDetails?.remaining) },
        { label: "رخصة البلدية", value: safeText(data.licenseStatus?.municipality) },
        { label: "الدفاع المدني", value: safeText(data.licenseStatus?.civilDefense) },
        { label: "كاميرات المراقبة", value: safeText(data.licenseStatus?.cameras) },
      ]),
    ),
  );

  sections.push(
    section(
      "الالتزامات المفصح عنها",
      infoGrid([
        { label: "التزامات مالية", value: safeText(data.liabilities?.financialLiabilities, "لا توجد") },
        { label: "رواتب متأخرة", value: safeText(data.liabilities?.delayedSalaries, "لا يوجد") },
        { label: "إيجار متأخر", value: safeText(data.liabilities?.unpaidRent, "لا يوجد") },
      ]),
    ),
  );

  if (data.documentsReferenced.length > 0) {
    chunk(data.documentsReferenced, 8).forEach((group, index) => {
      sections.push(section(index === 0 ? "المستندات المرجعية" : "المستندات المرجعية — متابعة", listCard(group)));
    });
  }

  sections.push(
    section(
      "الإقرارات المختصرة",
      `
        <div style="display:grid;gap:10px;">
          ${[
            { label: "إقرار المشتري", value: compactText(data.declarations?.buyerDeclares) },
            { label: "إقرار البائع", value: compactText(data.declarations?.sellerDeclares) },
            { label: "ملاحظة المنصة", value: compactText(data.declarations?.platformNote || "المنصة وسيط تقني فقط — الاتفاق يتم مباشرة بين الطرفين.") },
          ]
            .map(
              (item, index) => `
                <div style="border:0.5px solid ${index === 2 ? "hsl(201 87% 86%)" : "hsl(214 32% 91%)"};background:${
                  index === 2 ? "hsl(210 100% 98%)" : "hsl(210 40% 98%)"
                };border-radius:16px;padding:14px;display:grid;gap:6px;">
                  <div style="font-size:11px;font-weight:600;color:${index === 2 ? "hsl(212 84% 42%)" : "hsl(215 28% 17%)"};">${item.label}</div>
                  <div style="font-size:11px;line-height:1.9;color:hsl(215 16% 45%);font-weight:400;">${safeText(item.value)}</div>
                </div>`,
            )
            .join("")}
        </div>
      `,
    ),
  );

  if (data.importantNotes.length > 0) {
    chunk(data.importantNotes, 5).forEach((group, index) => {
      sections.push(section(index === 0 ? "ملاحظات مهمة" : "ملاحظات مهمة — متابعة", listCard(group, "warning")));
    });
  }

  if (data.amendmentReason) {
    sections.push(
      section(
        "سبب التعديل",
        `<div style="font-size:11px;line-height:2;color:hsl(212 60% 30%);background:hsl(210 100% 97%);border:0.5px solid hsl(212 84% 82%);border-radius:16px;padding:14px;font-weight:400;">${safeText(data.amendmentReason)}</div>`,
        "highlight",
      ),
    );
  }

  // ── Asset Photos ──
  if (data.assetPhotos && data.assetPhotos.length > 0) {
    const photosPerPage = 4;
    chunk(data.assetPhotos, photosPerPage).forEach((group, index) => {
      sections.push(
        section(
          index === 0 ? "صور الأصول والموقع" : "صور الأصول والموقع — متابعة",
          `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
            ${group
              .map(
                (url) => `
                  <div style="border:0.5px solid hsl(214 32% 91%);border-radius:16px;overflow:hidden;background:hsl(210 40% 98%);">
                    <img src="${url}" alt="صورة أصل" style="width:100%;height:180px;object-fit:cover;display:block;" crossorigin="anonymous" />
                  </div>`,
              )
              .join("")}
          </div>`,
          "highlight",
        ),
      );
    });
  }

  sections.push(
    section(
      "عمولة المنصة وبيانات الحساب البنكي",
      `
        <div style="display:grid;gap:12px;">
          <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:12px;">
            <div style="border-radius:20px;padding:16px;background:linear-gradient(135deg, hsl(212 84% 42%), hsl(196 85% 45%));color:white;display:grid;gap:8px;">
              <div style="font-size:10px;opacity:0.86;">المبلغ المستحق للمنصة</div>
              <div style="font-size:22px;font-weight:600;line-height:1.2;">${formatPrice(commissionAmount)} ﷼</div>
              <div style="font-size:11px;opacity:0.92;">${commissionRate * 100}% من قيمة الصفقة ${formatPrice(dealAmount)} ${escapeHtml(currency)}</div>
            </div>
            <div style="border:0.5px solid hsl(214 32% 91%);border-radius:20px;padding:16px;background:hsl(210 40% 98%);display:grid;gap:8px;">
              <div style="font-size:11px;font-weight:600;color:hsl(215 28% 17%);">تعليمات السداد</div>
              <div style="font-size:11px;line-height:1.9;color:hsl(215 16% 45%);">يرجى تحويل العمولة إلى حساب الشركة التالي ثم رفع إثبات السداد عبر المنصة لاستكمال التحقق.</div>
              <div style="font-size:11px;line-height:1.9;color:hsl(215 16% 45%);">الحساب باسم شركة Ain Jasaas / شركة عين جساس.</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
            ${[
              { label: "اسم المستفيد", value: BANK_DETAILS.beneficiary },
              { label: "البنك", value: BANK_DETAILS.bank },
              { label: "رقم الحساب", value: BANK_DETAILS.accountNumber },
              { label: "رقم الآيبان (IBAN)", value: BANK_DETAILS.iban },
              { label: "السجل التجاري", value: BANK_DETAILS.nationalId },
              { label: "ملكية المنصة", value: "Ain Jasaas — شركة عين جساس" },
            ]
              .map(
                ({ label, value }) => `
                   <div style="border:0.5px solid hsl(214 32% 91%);border-radius:16px;padding:12px 14px;background:#ffffff;display:grid;gap:4px;text-align:center;">
                    <div style="font-size:9px;color:hsl(215 16% 45%);">${escapeHtml(label)}</div>
                    <div style="font-size:12px;font-weight:600;color:hsl(215 28% 17%);line-height:1.8;direction:ltr;font-family:${FONT_FAMILY}, monospace;">${safeText(value)}</div>
                  </div>`,
              )
              .join("")}
          </div>
        </div>
        <div style="background:hsl(210 100% 97%);border:0.5px solid hsl(212 84% 82%);border-radius:16px;padding:14px;text-align:center;display:grid;gap:6px;">
          <div style="font-size:11px;font-weight:600;color:hsl(212 84% 32%);">تنويه مهم</div>
          <div style="font-size:10px;line-height:2;color:hsl(212 60% 35%);font-weight:400;">
            عمولة المنصة مستحقة على البائع فقط بنسبة ${commissionRate * 100}% من قيمة الصفقة، وتُسدد بعد إتمام الصفقة واعتماد الطرفين.<br />
            تحتفظ المنصة بحقها الكامل في المطالبة بمستحقاتها، ونثق بالتزامكم الكريم بالسداد في الوقت المحدد 🤝<br />
            للتواصل: a.almalki@soqtaqbeel.com — جوال: 0500668089
          </div>
        </div>
      `,
      "highlight",
    ),
  );

  // ── Recommendation + QR code ──
  sections.push(
    createNode(`
      <div style="display:grid;justify-items:center;gap:8px;padding:16px 20px;font-family:${FONT_FAMILY};text-align:center;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:56px;height:56px;border-radius:6px;" />` : ""}
        <div style="font-size:9px;line-height:2;color:hsl(215 16% 45%);text-align:center;">
          ننصح بتوثيق هذه الاتفاقية لدى الجهات الرسمية المعتمدة لضمان حفظ حقوق جميع الأطراف<br />
          يمكنكم مسح الرمز للتحقق من الاتفاقية إلكترونياً
        </div>
      </div>
    `),
  );

  return sections;
};

export function buildAgreementPdfPages(options: {
  data: AgreementPdfData;
  logoBase64: string;
  logoIconBase64?: string;
  qrDataUrl?: string;
  mount: HTMLElement;
}) {
  const { data, logoBase64, logoIconBase64 = "", qrDataUrl = "", mount } = options;
  const sections = buildSections(data, qrDataUrl);
  const pages: HTMLElement[] = [];

  let pageNumber = 1;
  let current = buildPageShell(data, logoBase64, logoIconBase64, pageNumber);
  mount.appendChild(current.page);
  pages.push(current.page);

  // Measure available content height (page height minus header, footer, padding, gaps)
  const getAvailableHeight = () => {
    const pageRect = current.page.getBoundingClientRect();
    const contentRect = current.content.getBoundingClientRect();
    // The available space is from content top to footer top (page bottom - footer height - padding)
    return pageRect.bottom - contentRect.top - 60; // 60px reserved for footer + gap
  };

  sections.forEach((block) => {
    const nextBlock = block.cloneNode(true) as HTMLElement;
    current.content.appendChild(nextBlock);

    const contentBottom = current.content.scrollHeight;
    const available = getAvailableHeight();
    const hasOverflow = contentBottom > available;

    if (hasOverflow && current.content.childElementCount > 1) {
      current.content.removeChild(nextBlock);
      pageNumber += 1;
      current = buildPageShell(data, logoBase64, logoIconBase64, pageNumber);
      mount.appendChild(current.page);
      pages.push(current.page);
      current.content.appendChild(nextBlock);
    }
  });

  return pages;
}