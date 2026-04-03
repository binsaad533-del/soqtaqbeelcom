import { BANK_DETAILS, COMMISSION_RATE, calculateCommission } from "@/hooks/useCommissions";
import type { AgreementPdfData } from "./types";
import {
  PDF_PAGE_WIDTH_PX, PDF_PAGE_HEIGHT_PX, PDF_FONT_FAMILY, PDF_COLORS,
  escapeHtml, safeText, formatPdfDate, formatPdfPrice,
  buildPdfPageShell, buildPdfSection, buildPdfInfoGrid,
  buildPdfBankSection, buildPdfQrSection, buildPdfDisclaimer,
} from "@/lib/pdfShared";

export const PAGE_WIDTH_PX = PDF_PAGE_WIDTH_PX;
export const PAGE_HEIGHT_PX = PDF_PAGE_HEIGHT_PX;

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

const listCard = (items: string[]) => {
  const accent = PDF_COLORS.primary;
  return `
    <div style="display:grid;gap:8px;">
      ${items
        .map(
          (item) => `
            <div style="display:flex;align-items:flex-start;gap:8px;border:0.5px solid ${PDF_COLORS.border};border-radius:14px;padding:10px 12px;background:${PDF_COLORS.cardBg};font-size:11px;line-height:1.8;color:${PDF_COLORS.text};">
              <span style="width:6px;height:6px;border-radius:999px;background:${accent};margin-top:7px;flex-shrink:0;"></span>
              <span>${safeText(item)}</span>
            </div>`,
        )
        .join("")}
    </div>`;
};

const section = (title: string, body: string, highlight = false) =>
  buildPdfSection(title, body, highlight);

const buildSections = (data: AgreementPdfData, qrDataUrl = "") => {
  const agreedPrice = data.financialTerms?.agreedPrice || 0;
  const currency = data.financialTerms?.currency || "﷼";
  const dealAmount = data.dealAmount || agreedPrice;
  const commissionAmount = data.commissionAmount ?? calculateCommission(dealAmount);
  const commissionRate = data.commissionRate ?? COMMISSION_RATE;
  const bothApproved = data.buyerApproved && data.sellerApproved;

  const sections: HTMLElement[] = [];

  // ── Executive Summary ──
  sections.push(
    section(
      "الملخص التنفيذي",
      `
        <div style="display:grid;gap:12px;">
          <div style="border-radius:22px;padding:18px;background:linear-gradient(135deg, ${PDF_COLORS.primaryLight}, hsl(195 80% 96%));border:0.5px solid hsl(201 87% 86%);display:grid;gap:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div>
                <div style="font-size:11px;color:${PDF_COLORS.textMuted};margin-bottom:4px;">حالة الاتفاقية</div>
                <div style="font-size:20px;font-weight:600;color:${PDF_COLORS.primary};">
                  ${bothApproved ? "مكتملة وجاهزة للتحميل" : "بانتظار اعتماد الطرفين"}
                </div>
              </div>
              <div style="padding:10px 14px;border-radius:999px;background:${PDF_COLORS.primary}1a;color:${PDF_COLORS.primary};font-size:11px;font-weight:500;white-space:nowrap;">
                ${bothApproved ? "تهانينا للطرفين" : "اعتماد قيد الاستكمال"}
              </div>
            </div>
            ${buildPdfInfoGrid([
              { label: "قيمة الصفقة", value: `${formatPdfPrice(agreedPrice)} ${escapeHtml(currency)}`, emphasized: true },
              { label: "نوع الصفقة", value: safeText(data.dealType) },
              { label: "النشاط التجاري", value: safeText(data.businessActivity) },
              { label: "الموقع", value: safeText(data.location) },
            ])}
          </div>
        </div>`,
      true,
    ),
  );

  // ── Parties ──
  sections.push(
    section(
      "الأطراف والاعتماد",
      `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          ${[
            { label: "البائع", name: data.sellerName, contact: data.sellerContact, approved: data.sellerApproved, approvedAt: data.sellerApprovedAt },
            { label: "المشتري", name: data.buyerName, contact: data.buyerContact, approved: data.buyerApproved, approvedAt: data.buyerApprovedAt },
          ]
            .map(
              (party) => `
                <div style="border:0.5px solid ${party.approved ? "hsl(212 84% 82%)" : PDF_COLORS.border};background:${
                  party.approved ? "hsl(210 100% 97%)" : PDF_COLORS.cardBg
                };border-radius:18px;padding:16px;display:grid;gap:7px;">
                  <div style="font-size:10px;color:${PDF_COLORS.textMuted};">${party.label}</div>
                  <div style="font-size:15px;font-weight:600;color:${PDF_COLORS.text};">${safeText(party.name)}</div>
                  <div style="font-size:12px;color:${PDF_COLORS.textMuted};direction:ltr;text-align:right;">${safeText(party.contact)}</div>
                  <div style="font-size:11px;font-weight:500;color:${party.approved ? PDF_COLORS.primary : "hsl(212 60% 60%)"};">
                    ${party.approved ? `✓ تم الاعتماد في ${formatPdfDate(party.approvedAt)}` : "بانتظار الاعتماد"}
                  </div>
                </div>`,
            )
            .join("")}
        </div>
      `,
    ),
  );

  // ── Terms ──
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
                <div style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:16px;background:${PDF_COLORS.cardBg};border:0.5px solid ${PDF_COLORS.border};">
                  <div style="width:22px;height:22px;border-radius:999px;background:${PDF_COLORS.primary}1a;color:${PDF_COLORS.primary};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;">${index + 1}</div>
                  <div style="font-size:11px;line-height:1.9;color:${PDF_COLORS.text};font-weight:400;">${escapeHtml(item)}</div>
                </div>`,
            )
            .join("")}
        </div>
      `,
      true,
    ),
  );

  // ── Deal Details ──
  sections.push(
    section(
      "تفاصيل الصفقة الأساسية",
      buildPdfInfoGrid([
        { label: "المبلغ المتفق عليه", value: `${formatPdfPrice(agreedPrice)} ${escapeHtml(currency)}`, emphasized: true },
        { label: "قيمة احتساب العمولة", value: `${formatPdfPrice(dealAmount)} ${escapeHtml(currency)}` },
        { label: "ملاحظة السداد", value: safeText(data.financialTerms?.paymentNote) },
        { label: "رقم الإصدار", value: escapeHtml(String(data.version)) },
      ]),
    ),
  );

  // ── Assets ──
  if (data.includedAssets.length > 0) {
    chunk(data.includedAssets, 6).forEach((group, index) => {
      sections.push(section(index === 0 ? "الأصول المشمولة" : "الأصول المشمولة — متابعة", listCard(group)));
    });
  }

  if (data.excludedAssets.length > 0) {
    chunk(data.excludedAssets, 6).forEach((group, index) => {
      sections.push(section(index === 0 ? "المستثنى من الصفقة" : "المستثنى من الصفقة — متابعة", listCard(group)));
    });
  }

  // ── Lease & Licenses ──
  sections.push(
    section(
      "الإيجار والتراخيص",
      buildPdfInfoGrid([
        { label: "الإيجار السنوي", value: safeText(data.leaseDetails?.annualRent) },
        { label: "المتبقي من العقد", value: safeText(data.leaseDetails?.remaining) },
        { label: "رخصة البلدية", value: safeText(data.licenseStatus?.municipality) },
        { label: "الدفاع المدني", value: safeText(data.licenseStatus?.civilDefense) },
        { label: "كاميرات المراقبة", value: safeText(data.licenseStatus?.cameras) },
      ]),
    ),
  );

  // ── Liabilities ──
  sections.push(
    section(
      "الالتزامات المفصح عنها",
      buildPdfInfoGrid([
        { label: "التزامات مالية", value: safeText(data.liabilities?.financialLiabilities, "لا توجد") },
        { label: "رواتب متأخرة", value: safeText(data.liabilities?.delayedSalaries, "لا يوجد") },
        { label: "إيجار متأخر", value: safeText(data.liabilities?.unpaidRent, "لا يوجد") },
      ]),
    ),
  );

  // ── Documents ──
  if (data.documentsReferenced.length > 0) {
    chunk(data.documentsReferenced, 8).forEach((group, index) => {
      sections.push(section(index === 0 ? "المستندات المرجعية" : "المستندات المرجعية — متابعة", listCard(group)));
    });
  }

  // ── Declarations ──
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
                <div style="border:0.5px solid ${index === 2 ? "hsl(201 87% 86%)" : PDF_COLORS.border};background:${
                  index === 2 ? PDF_COLORS.primaryLight : PDF_COLORS.cardBg
                };border-radius:16px;padding:14px;display:grid;gap:6px;">
                  <div style="font-size:14px;font-weight:600;color:${index === 2 ? PDF_COLORS.primary : PDF_COLORS.text};">${item.label}</div>
                  <div style="font-size:11px;line-height:1.9;color:${PDF_COLORS.textMuted};font-weight:400;">${safeText(item.value)}</div>
                </div>`,
            )
            .join("")}
        </div>
      `,
    ),
  );

  // ── Important Notes ──
  if (data.importantNotes.length > 0) {
    chunk(data.importantNotes, 5).forEach((group, index) => {
      sections.push(section(index === 0 ? "ملاحظات مهمة" : "ملاحظات مهمة — متابعة", listCard(group)));
    });
  }

  // ── Amendment Reason ──
  if (data.amendmentReason) {
    sections.push(
      section(
        "سبب التعديل",
        `<div style="font-size:11px;line-height:2;color:hsl(212 60% 30%);background:${PDF_COLORS.primaryLight};border:0.5px solid hsl(212 84% 82%);border-radius:16px;padding:14px;font-weight:400;">${safeText(data.amendmentReason)}</div>`,
        true,
      ),
    );
  }

  // ── Asset Photos ──
  if (data.assetPhotos && data.assetPhotos.length > 0) {
    chunk(data.assetPhotos, 4).forEach((group, index) => {
      sections.push(
        section(
          index === 0 ? "صور الأصول والموقع" : "صور الأصول والموقع — متابعة",
          `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
            ${group
              .map(
                (url) => `
                  <div style="border:0.5px solid ${PDF_COLORS.border};border-radius:16px;overflow:hidden;background:${PDF_COLORS.cardBg};">
                    <img src="${url}" alt="صورة أصل" style="width:100%;height:180px;object-fit:cover;display:block;" crossorigin="anonymous" />
                  </div>`,
              )
              .join("")}
          </div>`,
          true,
        ),
      );
    });
  }

  // ── Bank Details (shared component) ──
  sections.push(
    buildPdfBankSection(BANK_DETAILS, {
      rate: commissionRate,
      amount: commissionAmount,
      dealAmount,
      currency,
    }),
  );

  // ── Commission Notice ──
  sections.push(
    createNode(`
      <div style="background:${PDF_COLORS.primaryLight};border:0.5px solid hsl(212 84% 82%);border-radius:16px;padding:14px;text-align:center;display:grid;gap:6px;font-family:${PDF_FONT_FAMILY};direction:rtl;">
        <div style="font-size:14px;font-weight:600;color:hsl(212 84% 32%);">تنويه مهم</div>
        <div style="font-size:10px;line-height:2;color:hsl(212 60% 35%);font-weight:400;">
          عمولة المنصة مستحقة على البائع فقط بنسبة ${commissionRate * 100}% من قيمة الصفقة، وتُسدد بعد إتمام الصفقة واعتماد الطرفين.<br />
          تحتفظ المنصة بحقها الكامل في المطالبة بمستحقاتها، ونثق بالتزامكم الكريم بالسداد في الوقت المحدد 🤝<br />
          للتواصل: ${BANK_DETAILS.email} — جوال: ${BANK_DETAILS.phone}
        </div>
      </div>
    `),
  );

  // ── Disclaimer ──
  sections.push(buildPdfDisclaimer());

  // ── QR Code (shared component) ──
  if (qrDataUrl) {
    sections.push(buildPdfQrSection(qrDataUrl));
  }

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
  const shellBuilder = (pn: number) =>
    buildPdfPageShell({
      documentTitle: "اتفاقية الصفقة",
      documentSubtitle: `${safeText(data.dealTitle)} — ${safeText(data.location)}`,
      documentMeta: [
        `رقم الاتفاقية: ${safeText(data.agreementNumber)}`,
        `الإصدار: ${data.version}`,
        `التاريخ: ${formatPdfDate(data.createdAt)}`,
      ],
      logoBase64,
      logoIconBase64,
      pageNumber: pn,
      qrDataUrl,
      showQrInFooter: false,
    });

  let current = shellBuilder(pageNumber);
  mount.appendChild(current.page);
  pages.push(current.page);

  const getAvailableHeight = () => {
    const pageRect = current.page.getBoundingClientRect();
    const contentRect = current.content.getBoundingClientRect();
    return pageRect.bottom - contentRect.top - 110;
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
