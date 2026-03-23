import { useState, useEffect } from "react";
import {
  DEAL_TYPES,
  DEAL_TYPE_MAP,
  detectConflicts,
  getRequiredDisclosures,
  getRequiredDocuments,
  type DealTypeConfig,
  type ConflictRule,
} from "@/lib/dealStructureConfig";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import {
  Check,
  GripVertical,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Star,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
      newTypes = [...selectedTypes, typeId];
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

  const conflicts = detectConflicts(selectedTypes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-medium mb-1">هيكل الصفقة</h2>
        <p className="text-sm text-muted-foreground">
          اختر نوع أو أكثر من أنواع الصفقة — يمكنك تقديم خيارات بديلة للمشتري
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
                      <span className="font-medium text-sm">{dt.label}</span>
                      {isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" /> الخيار الرئيسي
                        </span>
                      )}
                      {isSelected && !isPrimary && idx >= 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          بديل {idx}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{dt.desc}</p>

                    {/* Quick actions when selected */}
                    {isSelected && (
                      <div className="flex items-center gap-2 mt-2">
                        {!isPrimary && (
                          <button
                            onClick={() => setPrimary(dt.id)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Star size={10} /> تعيين كرئيسي
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
                    className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Info size={16} />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
                    {dt.includes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-success mb-1 flex items-center gap-1">
                          <Check size={12} /> يشمل
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dt.includes.map((item, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-success/10 text-success">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {dt.excludes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> لا يشمل
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dt.excludes.map((item, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {dt.cautionNotes.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-warning mb-1 flex items-center gap-1">
                          <Shield size={12} /> تنبيهات
                        </div>
                        <ul className="space-y-0.5">
                          {dt.cautionNotes.map((note, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <span className="text-warning mt-0.5">•</span> {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-1">
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Shield size={11} /> {dt.mandatoryDisclosures.length} إفصاح مطلوب
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText size={11} /> {dt.requiredDocuments.length} مستند مطلوب
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="space-y-2">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl text-sm",
                c.severity === "critical"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-warning/10 text-warning border border-warning/20"
              )}
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="text-xs">{c.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected summary */}
      {selectedTypes.length > 0 && (
        <div className="bg-accent/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AiStar size={18} animate={false} />
            <span className="text-sm font-medium">ملخص هيكل الصفقة</span>
          </div>
          <div className="space-y-1.5">
            {selectedTypes.map((typeId, idx) => {
              const dt = DEAL_TYPE_MAP[typeId];
              if (!dt) return null;
              return (
                <div key={typeId} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-medium",
                    typeId === primaryType ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {typeId === primaryType ? "رئيسي" : `بديل ${idx}`}
                  </span>
                  <span>{dt.label}</span>
                </div>
              );
            })}
          </div>
          {/* Required Disclosures */}
          <div className="pt-2 border-t border-border/30">
            <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
              <Shield size={12} className="text-warning" />
              الإفصاحات المطلوبة ({getRequiredDisclosures(selectedTypes).length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getRequiredDisclosures(selectedTypes).map((d, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/15">
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Required Documents */}
          <div className="pt-2 border-t border-border/30">
            <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
              <FileText size={12} className="text-primary" />
              المستندات المطلوبة ({getRequiredDocuments(selectedTypes).length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getRequiredDocuments(selectedTypes).map((d, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealStructureEngine;
