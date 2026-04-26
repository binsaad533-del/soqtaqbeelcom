import {
  Eye,
  Check,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import { useInventoryAnalysisTranslation } from "@/hooks/useInventoryAnalysisTranslation";
import type { CreateListingSharedState } from "./sharedState";

const getUrlExtension = (url: string) => {
  try {
    return new URL(url).pathname.split(".").pop()?.toLowerCase() || "";
  } catch {
    return url.split(".").pop()?.toLowerCase() || "";
  }
};

interface Props {
  state: CreateListingSharedState;
}

const CreateListingStep3 = ({ state }: Props) => {
  const { t } = useTranslation();

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">{t("createListing.step3.confidence.high")}</span>;
      case "medium":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">{t("createListing.step3.confidence.medium")}</span>;
      case "low":
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{t("createListing.step3.confidence.low")}</span>;
      default:
        return null;
    }
  };

  // Translated label for condition values (label-only; value stays AR in DB)
  const conditionLabel = (cond: string): string => {
    const map: Record<string, string> = {
      "جديد": t("createListing.step3.conditions.new"),
      "شبه جديد": t("createListing.step3.conditions.almostNew"),
      "جيد": t("createListing.step3.conditions.good"),
      "تالف": t("createListing.step3.conditions.damaged"),
    };
    return map[cond] ?? cond;
  };

  const {
    stepDirection,
    analyzed,
    analyzing,
    analyzeProgress,
    inventory,
    setInventory,
    analysisSummary,
    dedupActions,
    handleAnalyze,
    allPhotoUrls,
    uploadedDocs,
    imageReq,
    inventoryPricingMode,
    setInventoryPricingMode,
    bulkInventoryPrice,
    setBulkInventoryPrice,
    editingItemId,
    setEditingItemId,
  } = state;

  // Translate AI-generated inventory output (analysisSummary, dedup descriptions, item.name, item.detectionNote).
  // For Arabic: pass-through. For other languages: fetch translation, fall back to AR on any error.
  const {
    analysisSummary: displaySummary,
    dedupActions: displayDedup,
    inventory: displayInventory,
    isTranslating,
  } = useInventoryAnalysisTranslation({
    analysisSummary: analyzed ? analysisSummary : null,
    dedupActions: analyzed ? dedupActions : [],
    inventory: analyzed ? inventory : [],
  });

  // Quick lookup for translated names/notes by item id, since edits / qty changes still operate on raw `inventory`.
  const translatedById = displayInventory.reduce<Record<string, { name: string; detectionNote: string }>>((acc, it) => {
    acc[it.id] = { name: it.name, detectionNote: it.detectionNote };
    return acc;
  }, {});

  const allDocumentUrls = Object.values(uploadedDocs).flat();
  const excelDocumentCount = allDocumentUrls.filter((url) => ["xls", "xlsx", "xlsm", "xlsb"].includes(getUrlExtension(url))).length;
  const hasDocuments = allDocumentUrls.length > 0;
  const hasPhotos = allPhotoUrls.length > 0;
  const hasInputs = hasPhotos || hasDocuments;

  const analyzingTitle = excelDocumentCount > 0
    ? hasPhotos
      ? t("createListing.step3.analyzing.excelAndPhotos")
      : t("createListing.step3.analyzing.excelOnly")
    : hasDocuments && !hasPhotos
      ? t("createListing.step3.analyzing.docsOnly")
      : t("createListing.step3.analyzing.photosOnly");

  const analyzingHint = excelDocumentCount > 0
    ? t("createListing.step3.analyzing.hintExcel", { count: excelDocumentCount })
    : hasDocuments && !hasPhotos
      ? t("createListing.step3.analyzing.hintDocs")
      : t("createListing.step3.analyzing.hintPhotos");

  const introTitle = excelDocumentCount > 0
    ? hasPhotos
      ? t("createListing.step3.intro.titleExcelAndPhotos")
      : t("createListing.step3.intro.titleExcelOnly")
    : hasDocuments && !hasPhotos
      ? t("createListing.step3.intro.titleDocsOnly")
      : t("createListing.step3.intro.titlePhotosOnly");

  const introHint = excelDocumentCount > 0
    ? hasPhotos
      ? t("createListing.step3.intro.hintExcelAndPhotos")
      : t("createListing.step3.intro.hintExcelOnly")
    : hasDocuments && !hasPhotos
      ? t("createListing.step3.intro.hintDocsOnly")
      : t("createListing.step3.intro.hintPhotosOnly");

  const analyzeButtonLabel = excelDocumentCount > 0
    ? hasPhotos
      ? t("createListing.step3.analyzeButton.excelAndPhotos", { photos: Math.min(allPhotoUrls.length, 30), excel: excelDocumentCount })
      : t("createListing.step3.analyzeButton.excelOnly", { count: excelDocumentCount })
    : hasDocuments && !hasPhotos
      ? t("createListing.step3.analyzeButton.docsOnly", { count: allDocumentUrls.length })
      : t("createListing.step3.analyzeButton.photosOnly", { analyzed: Math.min(allPhotoUrls.length, 30), total: allPhotoUrls.length });

  return (
    <div key="step-2" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
      {!analyzed ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {analyzing ? (
            <>
              <AiStar size={56} className="mb-6" />
              <h2 className="font-medium mb-2">{analyzingTitle}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">{analyzingHint}</p>
              <p className="text-xs text-success mt-2 animate-fade-in">{t("createListing.step3.analyzing.relax")}</p>
              <div className="mt-6 w-56">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary transition-all duration-700" style={{ width: `${analyzeProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{analyzeProgress}%</p>
              </div>
            </>
          ) : (
            <>
              <AiStar size={48} className="mb-6" />
              <h2 className="font-medium mb-2">{introTitle}</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-1">{introHint}</p>
              <p className="text-xs text-success mb-4 animate-fade-in">{t("createListing.step3.intro.cta")}</p>
              {!hasInputs && imageReq === "none" ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check size={14} className="text-success" />
                  {t("createListing.step3.intro.noNeedNotice")}
                </div>
              ) : !hasInputs ? (
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle size={14} />
                  {imageReq === "required" ? t("createListing.step3.intro.missingRequired") : t("createListing.step3.intro.missingOptional")}
                </div>
              ) : (
                <>
                  {excelDocumentCount > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-start gap-2 mb-4 max-w-sm text-right">
                      <Check size={14} className="text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-primary">{t("createListing.step3.intro.excelDetected", { count: excelDocumentCount })}</p>
                    </div>
                  )}
                  {allPhotoUrls.length > 30 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 flex items-start gap-2 mb-4 max-w-sm text-right">
                      <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-warning">{t("createListing.step3.intro.photosLimit", { count: allPhotoUrls.length })}</p>
                    </div>
                  )}
                  <Button onClick={handleAnalyze} className="gradient-primary text-primary-foreground rounded-xl">
                    <Eye size={16} strokeWidth={1.5} />
                    {analyzeButtonLabel}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
              <h2 className="font-medium text-sm">{t("createListing.step3.results.title")}</h2>
            </div>
            {isTranslating && analysisSummary ? (
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-3/4 mx-auto" />
                <Skeleton className="h-3 w-2/3 mx-auto" />
              </div>
            ) : (
              displaySummary && <p className="text-xs text-muted-foreground leading-relaxed">{displaySummary}</p>
            )}
          </div>

          {dedupActions.length > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-3 space-y-1 animate-fade-in">
              <div className="text-xs font-medium text-success flex items-center gap-1.5"><Check size={14} /> {t("createListing.step3.results.dedupTitle")}</div>
              {isTranslating ? (
                <div className="space-y-1.5 pt-1">
                  {dedupActions.map((_, i) => (
                    <Skeleton key={i} className="h-3 w-2/3" />
                  ))}
                </div>
              ) : (
                displayDedup.map((action, i) => (
                  <p key={i} className="text-[11px] text-success/80">{t("createListing.step3.results.dedupItem", { description: action.description, count: action.merged_count })}</p>
                ))
              )}
            </div>
          )}

          {/* Inventory pricing mode */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">{t("createListing.step3.results.pricingMode")}</span>
            <button
              onClick={() => setInventoryPricingMode("per_item")}
              className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", inventoryPricingMode === "per_item" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {t("createListing.step3.results.modePerItem")}
            </button>
            <button
              onClick={() => setInventoryPricingMode("bulk")}
              className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", inventoryPricingMode === "bulk" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {t("createListing.step3.results.modeBulk")}
            </button>
          </div>

          {inventoryPricingMode === "bulk" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("createListing.step3.results.bulkPriceLabel")}</span>
              <input
                type="text"
                inputMode="numeric"
                lang="en"
                dir="ltr"
                placeholder={t("createListing.step3.results.bulkPricePlaceholder")}
                value={bulkInventoryPrice}
                onChange={(e) => setBulkInventoryPrice(toEnglishNumerals(e.target.value).replace(/[^\d]/g, ""))}
                className="flex-1 h-9 text-sm bg-background border border-border rounded-lg px-3 outline-none focus:border-primary/50 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <SarSymbol size={12} />
            </div>
          )}

          {/* Inventory actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{t("createListing.step3.results.includedCount", { count: inventory.filter(i => i.included).length })}</span>
              <span className="text-[10px] text-muted-foreground">{t("createListing.step3.results.outOfTotal", { count: inventory.length })}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              const newItem = {
                id: `manual-${Date.now()}`,
                name: t("createListing.step3.results.defaultNewItemName"),
                qty: 1,
                condition: "جيد",
                category: "أخرى",
                included: true,
                confidence: "high" as const,
                detectionNote: t("createListing.step3.results.addedManually"),
                photoIndices: [],
                isSameAssetMultipleAngles: false,
                userConfirmed: true,
              };
              setInventory(prev => [newItem, ...prev]);
            }} className="text-xs text-primary gap-1">
              <Plus size={12} /> {t("createListing.step3.results.addItem")}
            </Button>
          </div>

          <div className="space-y-2">
            {inventory.map((item) => {
              const itemTotal = (item.unitPrice || 0) * item.qty;
              return (
                <div key={item.id} className={cn("p-2.5 rounded-xl border transition-all", item.included ? "border-border/50 bg-card" : "border-border/30 bg-muted/30 opacity-60")}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {editingItemId === item.id ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, name: e.target.value } : entry))}
                          onBlur={() => setEditingItemId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                          autoFocus
                          className="text-xs bg-transparent border-b border-primary/30 outline-none w-full"
                        />
                      ) : (
                        <div className="text-xs font-medium cursor-pointer hover:text-primary transition-colors truncate" onClick={() => setEditingItemId(item.id)}>{item.name}</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{item.category}</span>
                        <select
                          value={item.condition}
                          onChange={(e) => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, condition: e.target.value } : entry))}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border outline-none cursor-pointer transition-colors",
                            item.condition === "جديد" && "bg-success/10 border-success/30 text-success",
                            item.condition === "شبه جديد" && "bg-primary/10 border-primary/30 text-primary",
                            item.condition === "جيد" && "bg-accent border-accent-foreground/20 text-accent-foreground",
                            item.condition === "تالف" && "bg-destructive/10 border-destructive/30 text-destructive",
                            !["جديد", "شبه جديد", "جيد", "تالف"].includes(item.condition) && "bg-muted/50 border-border/30 text-muted-foreground"
                          )}
                        >
                          <option value="جديد">{t("createListing.step3.conditions.new")}</option>
                          <option value="شبه جديد">{t("createListing.step3.conditions.almostNew")}</option>
                          <option value="جيد">{t("createListing.step3.conditions.good")}</option>
                          <option value="تالف">{t("createListing.step3.conditions.damaged")}</option>
                          {!["جديد", "شبه جديد", "جيد", "تالف"].includes(item.condition) && (
                            <option value={item.condition}>{conditionLabel(item.condition)}</option>
                          )}
                        </select>
                        {getConfidenceBadge(item.confidence)}
                        {item.isSameAssetMultipleAngles && <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">{t("createListing.step3.results.multipleAngles")}</span>}
                      </div>
                      {item.detectionNote && <div className="text-[10px] text-muted-foreground mt-0.5 italic leading-tight">{item.detectionNote}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-muted/50 rounded-md h-7">
                        <button onClick={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))} className="px-1 h-full text-muted-foreground hover:text-foreground transition-colors"><Minus size={10} /></button>
                        <input type="text" inputMode="numeric" lang="en" dir="ltr" value={item.qty} onChange={(e) => { const val = toEnglishNumerals(e.target.value); const num = parseInt(val.replace(/[^\d]/g, "")) || 1; setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(1, num) } : entry)); }} className="w-6 text-center text-[11px] bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <button onClick={() => setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry))} className="px-1 h-full text-muted-foreground hover:text-foreground transition-colors"><Plus size={10} /></button>
                      </div>
                      {inventoryPricingMode === "per_item" && (
                        <div className="flex items-center gap-1 w-32">
                          {item.included ? (
                            <>
                              <input
                                type="text"
                                inputMode="numeric"
                                lang="en"
                                dir="ltr"
                                placeholder={t("createListing.step3.results.pricePlaceholder")}
                                value={item.unitPrice ? String(item.unitPrice) : ""}
                                onChange={(e) => {
                                  const val = toEnglishNumerals(e.target.value).replace(/[^\d]/g, "");
                                  setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, unitPrice: val ? Number(val) : null } : entry));
                                }}
                                className="w-16 h-7 text-[11px] bg-muted/50 border border-border/30 rounded-md px-1.5 outline-none focus:border-primary/50 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[10px] text-primary font-medium whitespace-nowrap w-14 text-start">
                                {item.unitPrice && item.unitPrice > 0 ? t("createListing.step3.results.unitPriceEquals", { value: itemTotal.toLocaleString("en-US") }) : ""}
                              </span>
                            </>
                          ) : <div className="w-full" />}
                        </div>
                      )}
                      <button onClick={() => setInventory((prev) => prev.filter((entry) => entry.id !== item.id))} className="text-muted-foreground hover:text-destructive transition-colors p-0.5"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inventory Total */}
          {inventory.filter(i => i.included).length > 0 && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
              {inventoryPricingMode === "per_item" ? (() => {
                const includedItems = inventory.filter(i => i.included);
                const totalQty = includedItems.reduce((sum, i) => sum + i.qty, 0);
                const pricedItems = includedItems.filter(i => i.unitPrice && i.unitPrice > 0);
                const totalPrice = pricedItems.reduce((sum, i) => sum + (i.unitPrice || 0) * i.qty, 0);
                const categories = [...new Set(pricedItems.map(i => i.category))];
                return (
                  <div className="space-y-2">
                    {categories.length > 1 && categories.map(cat => {
                      const catTotal = pricedItems.filter(i => i.category === cat).reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0);
                      return catTotal > 0 ? (
                        <div key={cat} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="text-foreground">{catTotal.toLocaleString("en-US")} <SarSymbol size={9} /></span>
                        </div>
                      ) : null;
                    })}
                    <div className="flex items-center justify-between text-sm font-medium border-t border-primary/10 pt-2">
                      <span className="text-foreground">{t("createListing.step3.totals.pricedSummary", { priced: pricedItems.length, included: includedItems.length, qty: totalQty })}</span>
                      <span className="text-primary">{totalPrice > 0 ? <>{totalPrice.toLocaleString("en-US")} <SarSymbol size={10} /></> : t("createListing.step3.totals.notPriced")}</span>
                    </div>
                    {pricedItems.length < includedItems.length && pricedItems.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{t("createListing.step3.totals.unpricedHint", { count: includedItems.length - pricedItems.length })}</p>
                    )}
                  </div>
                );
              })() : (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-foreground">{t("createListing.step3.totals.bulkTotalLabel")}</span>
                  <span className="text-primary">{bulkInventoryPrice ? <>{Number(bulkInventoryPrice).toLocaleString("en-US")} <SarSymbol size={10} /></> : t("createListing.step3.totals.bulkNotSet")}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreateListingStep3;
