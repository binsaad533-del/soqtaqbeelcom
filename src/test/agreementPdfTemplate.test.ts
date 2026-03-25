import { describe, expect, it } from "vitest";
import { buildAgreementPdfPages } from "@/lib/agreementPdf/template";
import type { AgreementPdfData } from "@/lib/agreementPdf/types";

const sampleData: AgreementPdfData = {
  agreementNumber: "AGR-123",
  version: 2,
  createdAt: "2026-03-25T12:00:00.000Z",
  dealTitle: "اتفاقية أثاث — حي الروضة",
  dealType: "تقبيل كامل",
  location: "جدة، الروضة",
  businessActivity: "معرض أثاث",
  buyerName: "المشتري التجريبي",
  buyerContact: "0500000000",
  sellerName: "البائع التجريبي",
  sellerContact: "0550000000",
  financialTerms: {
    agreedPrice: 250000,
    currency: "ر.س",
    paymentNote: "دفعة واحدة بعد الاعتماد النهائي",
  },
  includedAssets: ["مخزون أثاث", "اسم تجاري"],
  excludedAssets: ["السيارة الخاصة"],
  leaseDetails: { annualRent: "50,000 ر.س", remaining: "10 أشهر" },
  liabilities: { financialLiabilities: "لا توجد", delayedSalaries: "لا يوجد", unpaidRent: "لا يوجد" },
  licenseStatus: { municipality: "سارية", civilDefense: "سارية", cameras: "موجودة" },
  documentsReferenced: ["السجل التجاري", "عقد الإيجار"],
  declarations: {
    buyerDeclares: "أقر بمراجعة جميع البيانات المقدمة والموافقة عليها.",
    sellerDeclares: "أقر بصحة المعلومات المقدمة حسب علمي.",
    platformNote: "المنصة وسيط تقني فقط بين الطرفين.",
  },
  importantNotes: ["يلتزم الطرفان بالبنود بعد الاعتماد النهائي."],
  amendmentReason: null,
  buyerApproved: true,
  buyerApprovedAt: "2026-03-25T13:00:00.000Z",
  sellerApproved: true,
  sellerApprovedAt: "2026-03-25T13:05:00.000Z",
  commissionAmount: 2500,
  commissionRate: 0.01,
  dealAmount: 250000,
};

describe("buildAgreementPdfPages", () => {
  it("renders commission bank details and ownership info", () => {
    const mount = document.createElement("div");
    document.body.appendChild(mount);

    const pages = buildAgreementPdfPages({
      data: sampleData,
      logoBase64: "",
      mount,
    });

    expect(pages.length).toBeGreaterThan(0);
    expect(mount.textContent).toContain("رقم الآيبان");
    expect(mount.textContent).toContain("Ain Jasaas");
    expect(mount.textContent).toContain("شروط الاعتماد المختصرة");

    document.body.removeChild(mount);
  });
});