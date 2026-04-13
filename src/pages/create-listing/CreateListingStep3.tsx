import {
  Eye,
  Check,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AiStar from "@/components/AiStar";
import SarSymbol from "@/components/SarSymbol";
import { toEnglishNumerals } from "@/lib/arabicNumerals";
import type { CreateListingSharedState } from "./sharedState";

interface Props {
  state: CreateListingSharedState;
}

const getConfidenceBadge = (confidence: string) => {
  switch (confidence) {
    case "high":
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">ثقة عالية</span>;
    case "medium":
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">ثقة متوسطة</span>;
    case "low":
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">يحتاج تأكيد</span>;
    default:
      return null;
  }
};

const CreateListingStep3 = ({ state }: Props) => {
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
    imageReq,
    inventoryPricingMode,
    setInventoryPricingMode,
    bulkInventoryPrice,
    setBulkInventoryPrice,
    editingItemId,
    setEditingItemId,
  } = state;

  return (
    <div key="step-2" className={`space-y-6 ${stepDirection === "next" ? "animate-step-slide-in-next" : "animate-step-slide-in-prev"}`}>
      {!analyzed ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {analyzing ? (
            <>
              <AiStar size={56} className="mb-6" />
              <h2 className="font-medium mb-2">الذكاء الاصطناعي يحلّل الصور...</h2>
              <p className="text-sm text-muted-foreground max-w-sm">جاري اكتشاف الأصول وتمييز زوايا التصوير</p>
              <p className="text-xs text-success mt-2 animate-fade-in">لا تحتاج تعمل شيء — الـAI يتكفّل</p>
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
              <h2 className="font-medium mb-2">تحليل الصور بالذكاء الاصطناعي</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-1">سيقوم الـAI بتحليل صورك واكتشاف الأصول تلقائياً</p>
              <p className="text-xs text-success mb-4 animate-fade-in">فقط اضغط الزر — والباقي علينا</p>
              {allPhotoUrls.length === 0 && imageReq === "none" ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check size={14} className="text-success" />
                  هذا النوع من الصفقات لا يتطلب صوراً — يمكنك المتابعة للخطوة التالية
                </div>
              ) : allPhotoUrls.length === 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle size={14} />
                  {imageReq === "required" ? "يرجى رفع صور في الخطوة السابقة أولاً" : "لم يتم رفع صور — يمكنك المتابعة أو العودة لرفع صور"}
                </div>
              ) : (
                <>
                  {allPhotoUrls.length > 200 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-2.5 flex items-start gap-2 mb-4 max-w-sm text-right">
                      <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-warning">لديك {allPhotoUrls.length} صورة — سيتم تحليل أول 200 صورة فقط. الصور المتبقية ستُحفظ لكن لن تُحلل.</p>
                    </div>
                  )}
                  <Button onClick={handleAnalyze} className="gradient-primary text-primary-foreground rounded-xl">
                    <Eye size={16} strokeWidth={1.5} />
                    ابدأ التحليل الذكي ({Math.min(allPhotoUrls.length, 200)} من {allPhotoUrls.length} صورة)
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
              <h2 className="font-medium text-sm">نتائج التحليل الذكي</h2>
            </div>
            {analysisSummary && <p className="text-xs text-muted-foreground leading-relaxed">{analysisSummary}</p>}
          </div>

          {dedupActions.length > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-3 space-y-1 animate-fade-in">
              <div className="text-xs font-medium text-success flex items-center gap-1.5"><Check size={14} /> تم دمج العناصر المكررة تلقائياً</div>
              {dedupActions.map((action, i) => (
                <p key={i} className="text-[11px] text-success/80">— {action.description} ({action.merged_count} عنصر)</p>
              ))}
            </div>
          )}

          {/* Inventory pricing mode */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">طريقة التسعير:</span>
            <button
              onClick={() => setInventoryPricingMode("per_item")}
              className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", inventoryPricingMode === "per_item" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              تسعير كل عنصر
            </button>
            <button
              onClick={() => setInventoryPricingMode("bulk")}
              className={cn("text-xs px-3 py-1.5 rounded-lg transition-all", inventoryPricingMode === "bulk" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              سعر إجمالي
            </button>
          </div>

          {inventoryPricingMode === "bulk" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">السعر الإجمالي:</span>
              <input
                type="text"
                inputMode="numeric"
                lang="en"
                dir="ltr"
                placeholder="مثال: 50000"
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
              <span className="text-xs font-medium">{inventory.filter(i => i.included).length} أصل مشمول</span>
              <span className="text-[10px] text-muted-foreground">من أصل {inventory.length}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              const newItem = {
                id: `manual-${Date.now()}`,
                name: "عنصر جديد",
                qty: 1,
                condition: "جيد",
                category: "أخرى",
                included: true,
                confidence: "high" as const,
                detectionNote: "أضيف يدوياً",
                photoIndices: [],
                isSameAssetMultipleAngles: false,
                userConfirmed: true,
              };
              setInventory(prev => [newItem, ...prev]);
            }} className="text-xs text-primary gap-1">
              <Plus size={12} /> إضافة عنصر
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
                          <option value="جديد">جديد</option>
                          <option value="شبه جديد">شبه جديد</option>
                          <option value="جيد">جيد</option>
                          <option value="تالف">تالف</option>
                          {!["جديد", "شبه جديد", "جيد", "تالف"].includes(item.condition) && (
                            <option value={item.condition}>{item.condition}</option>
                          )}
                        </select>
                        {getConfidenceBadge(item.confidence)}
                        {item.isSameAssetMultipleAngles && <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">زوايا متعددة</span>}
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
                                placeholder="السعر"
                                value={item.unitPrice ? String(item.unitPrice) : ""}
                                onChange={(e) => {
                                  const val = toEnglishNumerals(e.target.value).replace(/[^\d]/g, "");
                                  setInventory((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, unitPrice: val ? Number(val) : null } : entry));
                                }}
                                className="w-16 h-7 text-[11px] bg-muted/50 border border-border/30 rounded-md px-1.5 outline-none focus:border-primary/50 transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-[10px] text-primary font-medium whitespace-nowrap w-14 text-start">
                                {item.unitPrice && item.unitPrice > 0 ? `= ${itemTotal.toLocaleString("en-US")}` : ""}
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
                      <span className="text-foreground">إجمالي الأصول المسعّرة ({pricedItems.length} من {includedItems.length}) — {totalQty} قطعة</span>
                      <span className="text-primary">{totalPrice > 0 ? <>{totalPrice.toLocaleString("en-US")} <SarSymbol size={10} /></> : "لم يتم تحديد أسعار"}</span>
                    </div>
                    {pricedItems.length < includedItems.length && pricedItems.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{includedItems.length - pricedItems.length} عنصر بدون سعر — يمكنك إضافته لاحقاً</p>
                    )}
                  </div>
                );
              })() : (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-foreground">السعر الإجمالي للأصول</span>
                  <span className="text-primary">{bulkInventoryPrice ? <>{Number(bulkInventoryPrice).toLocaleString("en-US")} <SarSymbol size={10} /></> : "لم يتم التحديد"}</span>
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
