import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEAL_TYPES,
  DEAL_TYPE_MAP,
  CONFLICT_RULES,
  detectConflicts,
  getRequiredDisclosures,
  getRequiredDocuments,
  type ConflictRule,
} from "@/lib/dealStructureConfig";
import { tDealItem } from "@/lib/dealStructureI18n";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import {
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Star,
} from "lucide-react";

export interface DealStructureSelection {
  selectedTypes: string[];
  primaryType: string;
  conflicts: ConflictRule[];
  requiredDisclosures: string[];
  requiredDocuments: string[];
  isValid: boolean;
}

interface DealStructureEngineProps {
  value: DealStructureSelection;
  onChange: (selection: DealStructureSelection) => void;
}

const DealStructureEngine = ({ value, onChange }: DealStructureEngineProps) => {
  const { t } = useTranslation();
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const { selectedTypes, primaryType } = value;

  const updateSelection = (types: string[], primary: string) => {
    const conflicts = detectConflicts(types);
    const requiredDisclosures = getRequiredDisclosures(types);
    const requiredDocuments = getRequiredDocuments(types);
    const isValid = types.length > 0 && !!primary && conflicts.every(c => c.severity !== "critical");
    onChange({ selectedTypes: types, primaryType: primary, conflicts, requiredDisclosures, requiredDocuments, isValid });
  };

  const toggleType = (typeId: string) => {
    let newTypes: string[];
    if (selectedTypes.includes(typeId)) {
      newTypes = selectedTypes.filter(t => t !== typeId);
    } else {
      // Auto-resolve conflicts: remove any type that conflicts with the new selection
      newTypes = [...selectedTypes];
      for (const rule of CONFLICT_RULES) {
        if (rule.types.includes(typeId)) {
          const conflicting = rule.types.find(t => t !== typeId);
          if (conflicting && newTypes.includes(conflicting)) {
            newTypes = newTypes.filter(t => t !== conflicting);
          }
        }
      }
      newTypes = [...newTypes, typeId];
    }
    let newPrimary = primaryType;
    if (newTypes.length === 0) newPrimary = "";
    else if (!newTypes.includes(newPrimary)) newPrimary = newTypes[0];
    else if (!newPrimary && newTypes.length > 0) newPrimary = newTypes[0];
    updateSelection(newTypes, newPrimary);
  };

  const setPrimary = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      updateSelection(selectedTypes, typeId);
    }
  };

  const moveType = (typeId: string, direction: "up" | "down") => {
    const idx = selectedTypes.indexOf(typeId);
    if (idx === -1) return;
    const newTypes = [...selectedTypes];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newTypes.length) return;
    [newTypes[idx], newTypes[swapIdx]] = [newTypes[swapIdx], newTypes[idx]];
    updateSelection(newTypes, primaryType);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-medium mb-1">{t("createListing.dealStructureSection.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("createListing.dealStructureSection.subtitle")}
        </p>
      </div>

      {/* Deal type cards */}
      <div className="space-y-3">
        {DEAL_TYPES.map((dt) => {
          const isSelected = selectedTypes.includes(dt.id);
          const isPrimary = primaryType === dt.id;
          const isExpanded = expandedType === dt.id;
          const idx = selectedTypes.indexOf(dt.id);

          return (
            <div key={dt.id} className="relative">
              <div
                className={cn(
                  "rounded-xl border transition-all overflow-hidden",
                  isSelected
                    ? isPrimary
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : "border-primary/20 bg-primary/[0.02]"
                    : "border-border/50 hover:border-border"
                )}
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox area */}
                  <button
                    onClick={() => toggleType(dt.id)}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{t(`createListing.dealTypes.${dt.id}.label`, { defaultValue: dt.label })}</span>
                      {isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" /> {t("deal.mainOption")}
                        </span>
                      )}
                      {isSelected && !isPrimary && idx >= 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {t("deal.alternative")} {idx}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t(`createListing.dealTypes.${dt.id}.description`, { defaultValue: dt.desc })}</p>

                    {/* Quick actions when selected */}
                    {isSelected && (
                      <div className="flex items-center gap-2 mt-2">
                        {!isPrimary && (
                          <button
                            onClick={() => setPrimary(dt.id)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Star size={10} /> {t("deal.setAsPrimary")}
                          </button>
                        )}
                        {selectedTypes.length > 1 && idx > 0 && (
                          <button onClick={() => moveType(dt.id, "up")} className="p-0.5 text-muted-foreground hover:text-foreground">
                            <ChevronUp size={14} />
                          </button>
                        )}
                        {selectedTypes.length > 1 && idx < selectedTypes.length - 1 && (
                          <button onClick={() => moveType(dt.id, "down")} className="p-0.5 text-muted-foreground hover:text-foreground">
                            <ChevronDown size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : dt.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0 transition-colors"
                    title={t("deal.viewDetails")}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {dt.includes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-success mb-1 flex items-center gap-1">
                          <Check size={12} /> {t("deal.includes")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dt.includes.map((item, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-success/10 text-success">
                              {tDealItem(t, dt.id, "includes", i, item)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {dt.excludes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> {t("deal.excludes")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dt.excludes.map((item, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                              {tDealItem(t, dt.id, "excludes", i, item)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {dt.cautionNotes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-warning mb-1 flex items-center gap-1">
                          <Shield size={12} /> {t("createListing.dealStructureSection.cautionLabel")}
                        </div>
                        <ul className="space-y-0.5">
                          {dt.cautionNotes.map((note, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <span className="text-warning mt-0.5">•</span> {tDealItem(t, dt.id, "cautionNotes", i, note)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-1">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Shield size={11} /> {t("createListing.dealStructureSection.disclosuresCount", { count: dt.mandatoryDisclosures.length })}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText size={11} /> {t("createListing.dealStructureSection.documentsCount", { count: dt.requiredDocuments.length })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No conflict warnings - AI auto-resolves conflicts silently */}

    </div>
  );
};

export default DealStructureEngine;
