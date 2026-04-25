import {
  Eye,
  Check,
  ClipboardList,
  Shield,
  AlertTriangle,
  Loader2,
  MapPin,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import AiInlineStar from "@/components/AiInlineStar";
import SarSymbol from "@/components/SarSymbol";
import { FormField, SelectField } from "./FormFields";
import { isFieldVisible } from "@/lib/dealTypeFieldRules";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import { DEAL_TYPE_MAP } from "@/lib/dealStructureConfig";
import { tDealItemByValue } from "@/lib/dealStructureI18n";
import type { CreateListingSharedState } from "./sharedState";

interface Props {
  state: CreateListingSharedState;
}

const CreateListingStep4 = ({ state }: Props) => {
  const { t } = useTranslation();
  const {
    stepDirection,
    dealStructure,
    disclosure,
    setDisclosure,
    inventory,
    uploadedDocs,
    locationLat,
    locationLng,
    sellerNote,
    setSellerNote,
    sellerName,
    isCrOnly,
    crExtractionDone,
    crExtraction,
    publishAttempted,
    canPublish,
    photosOk,
    disclosureErrors,
    imageReq,
    usesUnifiedUpload,
    unifiedFileCount,
    unifiedUnconfirmedCount,
    setReviewDialogOpen,
    totalPhotos,
    allPhotoUrls,
    primaryDealLabel,
    saving,
    loading,
    dealCheckLoading,
    dealCheckResult,
    dealCheckError,
    handleRunInlineDealCheck,
    handlePublishClick,
  } = state;

  const SELLER_NOTE_MAX = 2000;
  const dealTypeForTransparency = dealStructure.primaryType || "full_takeover";

  // Translate primary deal label using dealLabel namespace, fallback to AR label
  const tDealLabel = (id: string, fallback: string) =>
    t(`createListing.dealLabel.${id}`, { defaultValue: fallback });

  const translatedPrimaryDealLabel = dealStructure.primaryType
    ? tDealLabel(dealStructure.primaryType, primaryDealLabel)
    : primaryDealLabel;

  // Option label maps (value stays AR for DB, label translated)
  const opt = (group: string) =>
    t(`createListing.step4.options.${group}`, { returnObjects: true }) as Record<string, string>;

  return (
    <div key="step-3" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={16} strokeWidth={1.5} className="text-primary" />
          <h2 className="font-medium text-sm">{t("createListing.step4.sectionTitle")}</h2>
        </div>

        {isCrOnly && crExtractionDone && crExtraction && (
          <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
            <Check size={14} className="text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-success">{t("createListing.step4.crAutoFillTitle")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("createListing.step4.crAutoFillHint")}</p>
            </div>
          </div>
        )}

        {dealStructure.requiredDisclosures.length > 0 && (() => {
          const isDisclosureComplete = (item: string): boolean => {
            const lower = item;
            if (lower.includes("عدم شمول") || lower.includes("نقل النشاط"))
              return dealStructure.primaryType === "assets_only" || dealStructure.primaryType === "assets_setup";
            if (lower.includes("كمية") || lower.includes("الكمية"))
              return inventory.length > 0 && inventory.every(item => item.qty > 0);
            if (lower.includes("أصول") || lower.includes("قائمة") || lower.includes("حالة كل"))
              return inventory.length > 0;
            if (lower.includes("ملكية") || lower.includes("تأكيد الملكية"))
              return inventory.length > 0;
            if (lower.includes("إيجار") || lower.includes("الإيجار"))
              return !!(disclosure.annual_rent && disclosure.lease_duration);
            if (lower.includes("رواتب") || lower.includes("عمالة"))
              return !!disclosure.overdue_salaries;
            if (lower.includes("ديون") || lower.includes("التزامات") || lower.includes("مالية"))
              return !!disclosure.liabilities;
            if (lower.includes("نشاط") || lower.includes("تجاري"))
              return !!disclosure.business_activity;
            if (lower.includes("موردين") || lower.includes("عقود") || lower.includes("نزاعات") || lower.includes("ضرائب") || lower.includes("زكاة"))
              return !!disclosure.liabilities;
            return false;
          };
          return (
            <div className="bg-muted/30 border border-border/40 rounded-xl p-3">
              <div className="text-xs font-medium text-foreground/70 mb-2 flex items-center gap-1">
                <Shield size={12} /> {t("createListing.step4.disclosuresTitle")}
              </div>
              <div className="space-y-1.5">
                {dealStructure.requiredDisclosures.map((item) => {
                  const complete = isDisclosureComplete(item);
                  return (
                    <div key={item} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] ${complete ? "bg-success/5 border border-success/20 text-success" : "bg-muted/30 text-muted-foreground"}`}>
                      {complete ? <Check size={12} className="shrink-0" /> : <span className="w-3 h-3 rounded-full border border-muted-foreground/30 shrink-0" />}
                      <span>{tDealItemByValue(t, item)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {publishAttempted && !canPublish && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-destructive">{t("createListing.step4.validationTitle")}</p>
              <ul className="text-[11px] text-destructive/80 mt-1 space-y-0.5 list-disc list-inside">
                {!photosOk && imageReq === "required" && <li>{t("createListing.step4.validationPhotos")}</li>}
                {Object.entries(disclosureErrors).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {isFieldVisible(dealTypeForTransparency, "business_activity") && (
            <FormField
              label={disclosure.business_activity ? t("createListing.step4.fields.activityLabelAuto") : t("createListing.step4.fields.activityLabel")}
              placeholder={t("createListing.step4.fields.activityPlaceholder")}
              value={disclosure.business_activity}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, business_activity: v }))}
              error={publishAttempted && disclosureErrors["business_activity"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "city") && (
            <FormField
              label={disclosure.city ? t("createListing.step4.fields.cityLabelAuto") : t("createListing.step4.fields.cityLabel")}
              placeholder={t("createListing.step4.fields.cityPlaceholder")}
              value={disclosure.city}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, city: v }))}
              error={publishAttempted && disclosureErrors["city"]}
            />
          )}
          {locationLat && locationLng && (
            <a
              href={`https://www.google.com/maps?q=${locationLat},${locationLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors"
            >
              <MapPin size={14} className="text-success" />
              <span className="text-sm text-success">{t("createListing.step4.mapPickedTitle")}</span>
              <span className="text-[10px] text-success/70 mr-auto">{t("createListing.step4.mapPickedHint")}</span>
            </a>
          )}
          {isFieldVisible(dealTypeForTransparency, "price") && (
            <FormField
              label={t("createListing.step4.fields.priceLabel")}
              placeholder={t("createListing.step4.fields.pricePlaceholder")}
              value={disclosure.price}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, price: toEnglishNumerals(v) }))}
              error={publishAttempted && disclosureErrors["price"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "annual_rent") && (
            <FormField
              label={t("createListing.step4.fields.annualRentLabel")}
              placeholder={t("createListing.step4.fields.annualRentPlaceholder")}
              value={disclosure.annual_rent}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, annual_rent: toEnglishNumerals(v) }))}
              error={publishAttempted && disclosureErrors["annual_rent"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "lease_duration") && (
            <SelectField
              label={t("createListing.step4.fields.leaseDuration")}
              value={disclosure.lease_duration}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_duration: v }))}
              options={["سنة", "سنتين", "3 سنوات", "4 سنوات", "5 سنوات", "أكثر من 5 سنوات"]}
              optionLabels={opt("leaseDuration")}
              error={publishAttempted && disclosureErrors["lease_duration"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "lease_paid_period") && (
            <SelectField
              label={t("createListing.step4.fields.leasePaidPeriod")}
              value={disclosure.lease_paid_period}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_paid_period: v }))}
              options={["مسدد بالكامل", "متأخر شهر", "متأخر شهرين", "متأخر 3 أشهر أو أكثر"]}
              optionLabels={opt("leasePaidPeriod")}
              error={publishAttempted && disclosureErrors["lease_paid_period"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "lease_remaining") && (
            <SelectField
              label={t("createListing.step4.fields.leaseRemaining")}
              value={disclosure.lease_remaining}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, lease_remaining: v }))}
              options={["أقل من 6 أشهر", "6-12 شهر", "1-2 سنة", "2-3 سنوات", "أكثر من 3 سنوات"]}
              optionLabels={opt("leaseRemaining")}
              error={publishAttempted && disclosureErrors["lease_remaining"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "liabilities") && (
            <SelectField
              label={t("createListing.step4.fields.liabilities")}
              value={disclosure.liabilities}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, liabilities: v }))}
              options={["لا يوجد", "أقل من 10,000", "10,000 - 50,000", "50,000 - 100,000", "أكثر من 100,000"]}
              optionLabels={opt("liabilities")}
              error={publishAttempted && disclosureErrors["liabilities"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "overdue_salaries") && (
            <SelectField
              label={t("createListing.step4.fields.overdueSalaries")}
              value={disclosure.overdue_salaries}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, overdue_salaries: v }))}
              options={["لا يوجد", "شهر واحد", "شهرين", "3 أشهر أو أكثر"]}
              optionLabels={opt("overdueMonths")}
              error={publishAttempted && disclosureErrors["overdue_salaries"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "overdue_rent") && (
            <SelectField
              label={t("createListing.step4.fields.overdueRent")}
              value={disclosure.overdue_rent}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, overdue_rent: v }))}
              options={["لا يوجد", "شهر واحد", "شهرين", "3 أشهر أو أكثر"]}
              optionLabels={opt("overdueMonths")}
              error={publishAttempted && disclosureErrors["overdue_rent"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "municipality_license") && (
            <SelectField
              label={t("createListing.step4.fields.municipalityLicense")}
              value={disclosure.municipality_license}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, municipality_license: v }))}
              options={["سارية", "منتهية", "قيد التجديد", "غير موجودة"]}
              optionLabels={opt("licenseStatus")}
              error={publishAttempted && disclosureErrors["municipality_license"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "civil_defense_license") && (
            <SelectField
              label={t("createListing.step4.fields.civilDefenseLicense")}
              value={disclosure.civil_defense_license}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, civil_defense_license: v }))}
              options={["سارية", "منتهية", "قيد التجديد", "غير موجودة"]}
              optionLabels={opt("licenseStatus")}
              error={publishAttempted && disclosureErrors["civil_defense_license"]}
            />
          )}
          {isFieldVisible(dealTypeForTransparency, "surveillance_cameras") && (
            <SelectField
              label={t("createListing.step4.fields.surveillanceCameras")}
              value={disclosure.surveillance_cameras}
              onChange={(v) => setDisclosure((prev) => ({ ...prev, surveillance_cameras: v }))}
              options={["موجودة وتعمل", "موجودة لا تعمل", "غير موجودة"]}
              optionLabels={opt("cameras")}
              error={publishAttempted && disclosureErrors["surveillance_cameras"]}
            />
          )}
        </div>

        {/* Inline Deal Check */}
        {!dealCheckResult && !dealCheckLoading && (
          <div className="border-t border-border/50 pt-4 mt-2">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4 text-center space-y-3">
              <AiStar size={24} />
              <h3 className="text-sm font-medium">{t("createListing.step4.dealCheck.introTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("createListing.step4.dealCheck.introHint")}</p>
              <Button
                onClick={handleRunInlineDealCheck}
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
              >
                <Eye size={14} strokeWidth={1.5} />
                {t("createListing.step4.dealCheck.introButton")} <AiInlineStar size={11} />
              </Button>
              <p className="text-[10px] text-muted-foreground self-center">{t("createListing.step4.dealCheck.introNote")}</p>
            </div>
          </div>
        )}

        {dealCheckLoading && (
          <div className="py-6 flex flex-col items-center gap-3 animate-fade-in">
            <div className="relative">
              <AiStar size={28} />
              <Loader2 size={44} strokeWidth={1} className="absolute -top-2 -left-2 text-primary/30 animate-spin" />
            </div>
            <p className="text-sm font-medium">{t("createListing.step4.dealCheck.loading")}</p>
          </div>
        )}

        {dealCheckError && !dealCheckLoading && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-warning">{t("createListing.step4.dealCheck.errorTitle")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{dealCheckError}</p>
            </div>
          </div>
        )}

        {dealCheckResult && !dealCheckLoading && (
          <div className="space-y-4 animate-fade-in">
            <div className={cn("rounded-xl p-4 border",
              dealCheckResult.ratingColor === "green" ? "bg-emerald-50 border-emerald-200" :
              dealCheckResult.ratingColor === "yellow" ? "bg-amber-50 border-amber-200" :
              dealCheckResult.ratingColor === "red" ? "bg-red-50 border-red-200" :
              dealCheckResult.ratingColor === "blue" ? "bg-blue-50 border-blue-200" :
              "bg-muted border-border"
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-sm font-medium",
                  dealCheckResult.ratingColor === "green" ? "text-emerald-700" :
                  dealCheckResult.ratingColor === "yellow" ? "text-amber-700" :
                  dealCheckResult.ratingColor === "red" ? "text-red-700" :
                  dealCheckResult.ratingColor === "blue" ? "text-blue-700" :
                  "text-foreground"
                )}>{dealCheckResult.rating}</span>
                <span className="text-[11px] font-semibold text-muted-foreground">{t("createListing.step4.dealCheck.priceFairness", { verdict: dealCheckResult.fairnessVerdict })}</span>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <AiStar size={12} animate={false} />
                <span className="text-[11px] font-medium text-primary">{t("createListing.step4.dealCheck.recommendation")}</span>
              </div>
              <p className="text-xs leading-relaxed">{dealCheckResult.recommendation}</p>
            </div>

            {dealCheckResult.risks?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} strokeWidth={1.3} className="text-red-500/70" />
                  {t("createListing.step4.dealCheck.risks")}
                </h4>
                <ul className="space-y-1">
                  {dealCheckResult.risks.slice(0, 4).map((risk: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dealCheckResult.strengths?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                  <Check size={12} strokeWidth={1.3} className="text-emerald-600" />
                  {t("createListing.step4.dealCheck.strengths")}
                </h4>
                <ul className="space-y-1">
                  {dealCheckResult.strengths.slice(0, 4).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dealCheckResult.missingInfo?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} strokeWidth={1.3} className="text-amber-500" />
                  {t("createListing.step4.dealCheck.missing")}
                </h4>
                <ul className="space-y-1">
                  {dealCheckResult.missingInfo.map((info: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                      {info}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
              <AiStar size={16} animate className="shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("createListing.step4.dealCheck.afterAdjust")}
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunInlineDealCheck}
                className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
              >
                <Loader2 size={12} strokeWidth={1.5} className="ml-1" />
                {t("createListing.step4.dealCheck.rerun")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Listing Summary & Publish */}
      <div className="border-t border-border/50 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Eye size={20} strokeWidth={1.5} className="text-primary" />
          <div>
            <h2 className="font-medium text-sm">{t("createListing.step4.summary.title")}</h2>
            <p className="text-[10px] text-muted-foreground">{t("createListing.step4.summary.subtitle")}</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="text-xs font-medium text-primary mb-1">{t("createListing.step4.summary.dealStructureTitle")}</div>
          {dealStructure.selectedTypes.map((typeId, idx) => {
            const type = DEAL_TYPE_MAP[typeId];
            if (!type) return null;
            return (
              <div key={typeId} className="flex items-center gap-2 text-xs">
                <span className={cn("px-1.5 py-0.5 rounded font-medium", typeId === dealStructure.primaryType ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {typeId === dealStructure.primaryType ? t("createListing.step4.summary.primaryBadge") : t("createListing.step4.summary.alternateBadge", { n: idx })}
                </span>
                <span>{tDealLabel(typeId, type.label)}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-accent/30 rounded-xl p-5">
          <p className="text-sm leading-relaxed text-foreground">
            {t("createListing.step4.summary.sentenceTemplate", {
              activity: disclosure.business_activity || t("createListing.step4.summary.sentenceProject"),
              district: disclosure.district || t("createListing.step4.summary.sentenceDash"),
              city: disclosure.city || t("createListing.step4.summary.sentenceDash"),
            })}
            {t("createListing.step4.summary.sentenceStructure", { label: translatedPrimaryDealLabel })}
            {" "}{t("createListing.step4.summary.sentenceAssets", {
              count: inventory.filter((item) => item.included).length,
              qty: inventory.filter((item) => item.included).reduce((sum, item) => sum + item.qty, 0),
            })}
            {disclosure.annual_rent && t("createListing.step4.summary.sentenceAnnualRent", { value: disclosure.annual_rent })}
            {disclosure.lease_remaining && t("createListing.step4.summary.sentenceLeaseRemaining", { value: disclosure.lease_remaining })}
            {disclosure.price && t("createListing.step4.summary.sentencePrice", { value: Number(disclosure.price).toLocaleString() })}
          </p>

          {locationLat && locationLng && (
            <a
              href={`https://www.google.com/maps?q=${locationLat},${locationLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors mt-3"
            >
              <MapPin size={14} className="text-success" />
              <span className="text-sm text-success">{t("createListing.step4.mapPickedTitle")}</span>
              <span className="text-[10px] text-success/70 mr-auto">{t("createListing.step4.mapPickedHint")}</span>
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="text-lg font-medium text-foreground">{totalPhotos}</div>
            <div className="text-[10px] text-muted-foreground">{t("createListing.step4.summary.statPhotos")}</div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="text-lg font-medium text-foreground">{inventory.filter((item) => item.included).length}</div>
            <div className="text-[10px] text-muted-foreground">{t("createListing.step4.summary.statAssets")}</div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="text-lg font-medium text-foreground">{Object.values(uploadedDocs).flat().length}</div>
            <div className="text-[10px] text-muted-foreground">{t("createListing.step4.summary.statDocs")}</div>
          </div>
        </div>

        {publishAttempted && !photosOk && imageReq === "required" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-destructive shrink-0" />
            <p className="text-xs text-destructive">{t("createListing.step4.summary.photosMissingNotice")}</p>
          </div>
        )}

        {/* Live Preview */}
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card transition-all duration-500 ease-out">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
            <Eye size={14} strokeWidth={1.5} className="text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">{t("createListing.step4.summary.previewHeader")}</span>
          </div>
          <div className="p-4">
            <div className="rounded-xl border border-border/40 overflow-hidden bg-background shadow-soft transition-shadow duration-300 hover:shadow-soft-lg">
              <div className="h-36 overflow-hidden bg-muted/30 transition-all duration-500">
                {allPhotoUrls.length > 0 ? (
                  <img src={allPhotoUrls[0]} alt={t("createListing.step4.summary.photoAlt")} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} strokeWidth={1} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground truncate transition-all duration-300">
                    <span className="inline-block animate-fade-in">{disclosure.business_activity || t("createListing.step4.summary.previewActivityFallback")}</span>
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium shrink-0 mr-2 transition-all duration-300">
                    {translatedPrimaryDealLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground transition-all duration-300">
                  <MapPin size={11} strokeWidth={1.5} />
                  <span className="inline-block animate-fade-in">{disclosure.district || t("createListing.step4.summary.previewDistrictFallback")}, {disclosure.city || t("createListing.step4.summary.previewCityFallback")}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-base font-semibold text-primary transition-all duration-300">
                    <span className="inline-block animate-fade-in">{disclosure.price ? <>{Number(disclosure.price).toLocaleString()} <SarSymbol size={12} /></> : "—"}</span>
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground transition-all duration-300">
                    <span>{t("createListing.step4.summary.previewPhotos", { count: totalPhotos })}</span>
                    <span>·</span>
                    <span>{t("createListing.step4.summary.previewAssets", { count: inventory.filter(i => i.included).length })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seller Note */}
        <div className="border-t border-border/50 pt-4 mt-2">
          <label className="block text-sm font-medium mb-2">{t("createListing.step4.sellerNote.label")}</label>
          <div className="relative">
            <textarea
              value={sellerNote}
              onChange={(e) => {
                if (e.target.value.length <= SELLER_NOTE_MAX) setSellerNote(e.target.value);
              }}
              placeholder={t("createListing.step4.sellerNote.placeholder", { name: sellerName || t("createListing.step4.sellerNote.fallbackName") })}
              rows={8}
              maxLength={SELLER_NOTE_MAX}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/50"
            />
            <span className={cn(
              "absolute bottom-2 left-3 text-[10px]",
              sellerNote.length > SELLER_NOTE_MAX * 0.9 ? "text-destructive" : "text-muted-foreground/40"
            )}>
              {sellerNote.length}/{SELLER_NOTE_MAX}
            </span>
          </div>
        </div>

        {/* Unified upload review summary */}
        {usesUnifiedUpload && (
          <>
            {unifiedFileCount === 0 && (
              <div className="bg-muted/40 border border-border/40 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{t("createListing.step4.unifiedReview.emptyTitle")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("createListing.step4.unifiedReview.emptyHint")}
                  </p>
                </div>
              </div>
            )}

            {unifiedFileCount > 0 && unifiedUnconfirmedCount > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-warning">{t("createListing.step4.unifiedReview.needsReviewTitle")}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("createListing.step4.unifiedReview.needsReviewHint", { unconfirmed: unifiedUnconfirmedCount, total: unifiedFileCount })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setReviewDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    className="rounded-lg gap-1.5 h-8 border-warning/40 text-warning hover:bg-warning/10"
                  >
                    <FolderOpen size={13} strokeWidth={1.5} />
                    {t("createListing.step4.unifiedReview.reviewNow")}
                  </Button>
                </div>
              </div>
            )}

            {unifiedFileCount > 0 && unifiedUnconfirmedCount === 0 && (
              <div className="bg-success/5 border border-success/20 rounded-xl p-3 flex items-center gap-2">
                <Check size={14} className="text-success shrink-0" />
                <p className="text-xs font-medium text-success">
                  {t("createListing.step4.unifiedReview.readyTitle", { count: unifiedFileCount })}
                </p>
              </div>
            )}
          </>
        )}

        <Button
          onClick={handlePublishClick}
          disabled={saving || loading || (!canPublish && publishAttempted) || (usesUnifiedUpload && unifiedUnconfirmedCount > 0)}
          title={
            usesUnifiedUpload && unifiedUnconfirmedCount > 0
              ? t("createListing.step4.publishBlockedTitle")
              : undefined
          }
          className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={1.5} />}
          {t("createListing.step4.publishButton")}
        </Button>
      </div>
    </div>
  );
};

export default CreateListingStep4;
