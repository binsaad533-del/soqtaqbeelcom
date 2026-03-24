import { useState, useCallback, useRef } from "react";
import { validateImageFile, validateDocFile, logAudit } from "@/lib/security";
import { Check, Upload, Camera, FileText, ClipboardList, Eye, ArrowLeft, ArrowRight, Plus, Trash2, Loader2, Shield, AlertTriangle, Minus, Image as ImageIcon, Layers, DoorOpen, Building2, MapPin, Tag, Wrench, Sparkles } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListings } from "@/hooks/useListings";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DealStructureEngine, { type DealStructureSelection } from "@/components/DealStructureEngine";
import { DEAL_TYPE_MAP, getRequiredDocuments } from "@/lib/dealStructureConfig";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { label: "هيكل الصفقة والصور", icon: Camera, hint: "اختر نوع الصفقة وارفع الصور — مقبل يتكفّل بالباقي" },
  { label: "التحليل والجرد والمستندات", icon: Eye, hint: "مقبل يحلل ويجرد تلقائياً — فقط راجع وأكّد" },
  { label: "الإفصاح والنشر", icon: Check, hint: "أكمل البيانات وانشر بضغطة واحدة" },
];

const allPhotoGroups = [
  { id: "interior", label: "صور داخلية للمحل", desc: "صور واضحة للمساحة الداخلية من زوايا مختلفة", min: 3, icon: "Camera", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "location_only"] },
  { id: "exterior", label: "واجهة المحل", desc: "صور للمدخل والواجهة الخارجية", min: 2, icon: "DoorOpen", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "location_only"] },
  { id: "building", label: "المبنى", desc: "صور عامة للمبنى من الخارج", min: 1, icon: "Building2", dealTypes: ["full_takeover", "transfer_no_liabilities", "location_only"] },
  { id: "street", label: "الشارع المحيط", desc: "صور للشارع والمحيط التجاري", min: 1, icon: "MapPin", dealTypes: ["full_takeover", "transfer_no_liabilities", "location_only"] },
  { id: "signage", label: "اللوحة / اللافتة", desc: "صورة واضحة للافتة المحل", min: 1, icon: "Tag", dealTypes: ["full_takeover", "transfer_no_liabilities"] },
  { id: "equipment", label: "المعدات والأجهزة", desc: "صور قريبة للمعدات والأثاث والأجهزة", min: 4, icon: "Wrench", dealTypes: ["full_takeover", "transfer_no_liabilities", "assets_setup", "assets_only"] },
  { id: "cr_doc", label: "صورة السجل التجاري", desc: "صورة واضحة للسجل التجاري", min: 1, icon: "FileText", dealTypes: ["cr_only"] },
];

interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  condition: string;
  category: string;
  included: boolean;
  confidence: "high" | "medium" | "low";
  detectionNote: string;
  photoIndices: number[];
  isSameAssetMultipleAngles: boolean;
  userConfirmed: boolean;
}

interface DedupAction {
  description: string;
  merged_count: number;
}

const CreateListingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dealStructure, setDealStructure] = useState<DealStructureSelection>({
    selectedTypes: [],
    primaryType: "",
    conflicts: [],
    requiredDisclosures: [],
    requiredDocuments: [],
    isValid: false,
  });
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [dedupActions, setDedupActions] = useState<DedupAction[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [listingId, setListingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showDealStructure, setShowDealStructure] = useState(true);

  const [disclosure, setDisclosure] = useState({
    business_activity: "",
    city: "",
    district: "",
    price: "",
    annual_rent: "",
    lease_duration: "",
    lease_paid_period: "",
    lease_remaining: "",
    liabilities: "",
    overdue_salaries: "",
    overdue_rent: "",
    municipality_license: "",
    civil_defense_license: "",
    surveillance_cameras: "",
  });

  const { createListing, updateListing, uploadFile, loading } = useListings();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoGroup, setActivePhotoGroup] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);

  const photoGroups = allPhotoGroups.filter(group => {
    if (dealStructure.selectedTypes.length === 0) return true;
    return dealStructure.selectedTypes.some(dt => group.dealTypes.includes(dt));
  });

  const ensureListing = useCallback(async () => {
    if (listingId) return listingId;
    const { data, error } = await createListing({
      deal_type: dealStructure.primaryType || "full_takeover",
      primary_deal_type: dealStructure.primaryType,
      deal_options: dealStructure.selectedTypes.map((id, i) => ({
        type_id: id,
        priority: i,
        is_primary: id === dealStructure.primaryType,
      })),
      status: "draft",
    } as any);
    if (error || !data) {
      toast.error("حدث خطأ أثناء حفظ المسودة");
      return null;
    }
    const id = (data as any).id;
    setListingId(id);
    return id;
  }, [listingId, dealStructure, createListing]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;
    const id = await ensureListing();
    if (!id) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }
      const url = await uploadFile(id, file, `photos/${activePhotoGroup}`);
      if (url) urls.push(url);
    }
    setPhotos(prev => ({
      ...prev,
      [activePhotoGroup]: [...(prev[activePhotoGroup] || []), ...urls],
    }));
    const allPhotos = { ...photos, [activePhotoGroup]: [...(photos[activePhotoGroup] || []), ...urls] };
    await updateListing(id, { photos: allPhotos } as any);
    setSaving(false);
    e.target.value = "";
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeDocType) return;
    const id = await ensureListing();
    if (!id) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];
    for (const file of files) {
      const validation = validateDocFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }
      const url = await uploadFile(id, file, `docs/${activeDocType}`);
      if (url) urls.push(url);
    }
    setUploadedDocs(prev => ({
      ...prev,
      [activeDocType]: [...(prev[activeDocType] || []), ...urls],
    }));
    const allDocs = { ...uploadedDocs, [activeDocType]: [...(uploadedDocs[activeDocType] || []), ...urls] };
    await updateListing(id, { documents: Object.entries(allDocs).map(([type, files]) => ({ type, files })) } as any);
    setSaving(false);
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    const allPhotoUrls = Object.values(photos).flat();
    if (allPhotoUrls.length === 0) {
      toast.error("يرجى رفع صور أولاً");
      return;
    }

    setAnalyzing(true);
    setAnalyzeProgress(10);

    const progressInterval = setInterval(() => {
      setAnalyzeProgress(prev => Math.min(prev + 8, 85));
    }, 1500);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-inventory", {
        body: { photoUrls: allPhotoUrls, photoGroups: photos },
      });

      clearInterval(progressInterval);
      setAnalyzeProgress(100);

      if (error || !data || data.error) {
        throw new Error(data?.error || error?.message || "فشل التحليل");
      }

      const assets: InventoryItem[] = (data.assets || []).map((a: any, i: number) => ({
        id: String(i + 1),
        name: a.name,
        qty: a.quantity || 1,
        condition: a.condition || "غير واضح",
        category: a.category || "أخرى",
        included: true,
        confidence: a.confidence || "medium",
        detectionNote: a.detection_note || "",
        photoIndices: a.photo_indices || [],
        isSameAssetMultipleAngles: a.is_same_asset_multiple_angles || false,
        userConfirmed: a.confidence === "high",
      }));

      setInventory(assets);
      setAnalysisSummary(data.analysis_summary || "");
      setDedupActions(data.dedup_actions || []);
      setAnalyzed(true);
      toast.success("تم تحليل الصور وتحديد الأصول بدقة");
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(err.message || "حدث خطأ أثناء تحليل الصور");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!dealStructure.isValid) {
        toast.error("يرجى اختيار هيكل الصفقة أولاً");
        return;
      }
      const id = await ensureListing();
      if (id) {
        await updateListing(id, {
          deal_type: dealStructure.primaryType,
          primary_deal_type: dealStructure.primaryType,
          deal_options: dealStructure.selectedTypes.map((typeId, i) => ({
            type_id: typeId,
            priority: i,
            is_primary: typeId === dealStructure.primaryType,
          })),
        } as any);
      }
      // Auto-start analysis when moving to step 2
      if (!analyzed && Object.values(photos).flat().length > 0) {
        setCurrentStep(1);
        setTimeout(() => handleAnalyze(), 300);
        return;
      }
    }
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
  };

  const handleBack = () => {
    if (currentStep === 0 && !showDealStructure) {
      setShowDealStructure(true);
      return;
    }
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handlePublish = async () => {
    const id = listingId;
    if (!id) return;
    setSaving(true);

    const fields = Object.values(disclosure);
    const filled = fields.filter(v => v.trim() !== "").length;
    const score = Math.round((filled / fields.length) * 100);

    await updateListing(id, {
      ...disclosure,
      price: disclosure.price ? Number(disclosure.price) : null,
      annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
      disclosure_score: score,
      inventory: inventory.filter(i => i.included),
      deal_disclosures: dealStructure.requiredDisclosures,
      required_documents: dealStructure.requiredDocuments,
      status: "published",
      published_at: new Date().toISOString(),
      title: `${disclosure.business_activity || "مشروع"} — ${disclosure.district || ""}, ${disclosure.city || ""}`,
    } as any);

    await logAudit("listing_published", "listing", id, { title: disclosure.business_activity });
    setSaving(false);
    toast.success("تم نشر الإعلان بنجاح!");
    navigate("/dashboard");
  };

  const totalPhotos = Object.values(photos).reduce((a, b) => a + b.length, 0);
  const allPhotoUrls = Object.values(photos).flat();
  const disclosureScore = (() => {
    const fields = Object.values(disclosure);
    const filled = fields.filter(v => v.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  })();

  const dynamicDocTypes = dealStructure.requiredDocuments.length > 0
    ? dealStructure.requiredDocuments
    : ["عقد الإيجار", "السجل التجاري", "رخصة البلدية", "رخصة الدفاع المدني", "فواتير شراء المعدات", "مستندات أخرى"];

  const primaryDealLabel = DEAL_TYPE_MAP[dealStructure.primaryType]?.label || dealStructure.primaryType;

  const lowConfidenceItems = inventory.filter(i => i.confidence === "low" && !i.userConfirmed);
  const medConfidenceItems = inventory.filter(i => i.confidence === "medium" && !i.userConfirmed);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high": return <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">ثقة عالية</span>;
      case "medium": return <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">ثقة متوسطة</span>;
      case "low": return <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">يحتاج تأكيد</span>;
      default: return null;
    }
  };

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <h1 className="text-2xl font-medium mb-2">إضافة فرصة تقبيل</h1>
        <p className="text-sm text-muted-foreground">أنشئ إعلان تقبيل احترافي بمساعدة الذكاء الاصطناعي</p>
        <p className="text-sm font-bold text-primary animate-fade-in [animation-delay:0.5s] [animation-fill-mode:backwards] mb-8">
          <Sparkles size={14} className="inline-block ml-1" />
          بدون ما تكتب سطر واحد
        </p>

        <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif,.raw,.cr2,.nef,.arw,.dng" multiple className="hidden" onChange={handlePhotoUpload} />
        <input ref={docInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleDocUpload} />

        {/* Steps indicator - 3 steps */}
        <div className="flex items-center justify-between mb-8 pb-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => { if (i < currentStep) setCurrentStep(i); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all w-full justify-center",
                  i === currentStep ? "bg-primary/10 text-primary font-medium border border-primary/20" :
                  i < currentStep ? "text-success cursor-pointer hover:bg-success/5" : "text-muted-foreground"
                )}
              >
                {i < currentStep ? <Check size={13} strokeWidth={2} /> : <step.icon size={13} strokeWidth={1.3} />}
                <span>{step.label}</span>
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step hint banner */}
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in" key={currentStep}>
          <Sparkles size={14} strokeWidth={1.5} className="text-primary shrink-0" />
          <span className="text-sm font-medium text-primary">{steps[currentStep].hint}</span>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-xs text-primary mb-4">
            <Loader2 size={14} className="animate-spin" />
            جاري الحفظ...
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8 min-h-[400px]">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 1: Deal Structure + Photos */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 0 && (
            <div className="space-y-6">
              {/* Deal Structure Section */}
              <div>
                <button
                  onClick={() => setShowDealStructure(!showDealStructure)}
                  className="flex items-center justify-between w-full text-right"
                >
                  <div className="flex items-center gap-2">
                    <Shield size={18} strokeWidth={1.5} className="text-primary" />
                    <h2 className="font-medium text-sm">هيكل الصفقة</h2>
                    {dealStructure.isValid && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                        <Check size={10} className="inline ml-0.5" />
                        {primaryDealLabel}
                      </span>
                    )}
                  </div>
                  <ArrowLeft size={14} className={cn("text-muted-foreground transition-transform", showDealStructure && "rotate-90")} />
                </button>
                {showDealStructure && (
                  <div className="mt-3 animate-fade-in">
                    <DealStructureEngine value={dealStructure} onChange={(val) => { setDealStructure(val); if (val.isValid) setTimeout(() => setShowDealStructure(false), 400); }} />
                  </div>
                )}
              </div>

              {/* Divider */}
              {dealStructure.isValid && (
                <>
                  <div className="border-t border-border/50" />

                  {/* Photos Section */}
                  <div className="space-y-5">
                    {/* Hero banner */}
                    <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-5 border border-primary/10 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles size={20} strokeWidth={1.5} className="text-primary" />
                        <Camera size={20} strokeWidth={1.5} className="text-primary" />
                      </div>
                      <h2 className="font-semibold text-sm mb-1">فقط ارفع الصور — مقبل يتولى الباقي!</h2>
                      <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed mb-1">
                        الذكاء الاصطناعي يستخرج قائمة الأصول ويحلل حالتها تلقائياً
                      </p>
                      <p className="text-sm font-semibold text-primary animate-fade-in [animation-delay:0.4s] [animation-fill-mode:backwards]">
                        ✦ بدون أي إدخال يدوي منك ✦
                      </p>
                      <p className="text-sm font-bold animate-fade-in [animation-delay:0.8s] [animation-fill-mode:backwards] mt-1" style={{ color: 'hsl(var(--success))' }}>
                        بدون ما تكتب سطر واحد
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${Math.min(100, (totalPhotos / 12) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-primary">{totalPhotos} صورة</span>
                    </div>

                    {/* Photo groups */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {photoGroups.map((group) => {
                        const count = photos[group.id]?.length || 0;
                        const done = count >= group.min;
                        return (
                          <div key={group.id} className={cn(
                            "p-3.5 rounded-xl border transition-all",
                            done ? "border-success/30 bg-success/5" : "border-border/50 bg-card hover:border-primary/30"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                {(() => {
                                  const iconMap: Record<string, any> = { Camera, DoorOpen, Building2, MapPin, Tag, Wrench, FileText };
                                  const Icon = iconMap[group.icon] || Camera;
                                  return <Icon size={18} strokeWidth={1.5} className="text-primary" />;
                                })()}
                                <div>
                                  <div className="text-xs font-medium">{group.label}</div>
                                  <div className="text-[10px] text-muted-foreground">{group.min} صور على الأقل</div>
                                </div>
                              </div>
                              <button
                                onClick={() => { setActivePhotoGroup(group.id); fileInputRef.current?.click(); }}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-[0.97]",
                                  done ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                              >
                                <Upload size={12} strokeWidth={1.5} />
                                {count > 0 ? `${count} ✓` : "رفع"}
                              </button>
                            </div>
                            {photos[group.id]?.length > 0 && (
                              <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-1">
                                {photos[group.id].map((url, i) => (
                                  <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/30" />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Encouragement */}
                    <div className="text-center pt-2 pb-1">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-accent/10 border border-primary/10">
                        <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
                        <p className="text-sm font-medium text-foreground">
                          كلما زادت الصور، كان التحليل أدق والإعلان أقوى
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 2: AI Analysis + Inventory Review + Documents */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* AI Analysis Section */}
              {!analyzed ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  {analyzing ? (
                    <>
                      <AiStar size={56} className="mb-6" />
                      <h2 className="font-medium mb-2">الذكاء الاصطناعي يحلّل الصور...</h2>
                      <p className="text-sm text-muted-foreground max-w-sm">جاري اكتشاف الأصول وتمييز زوايا التصوير</p>
                      <div className="mt-6 w-56">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full gradient-primary transition-all duration-700" style={{ width: `${analyzeProgress}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">{analyzeProgress}%</p>
                      </div>
                      <div className="mt-4 space-y-1 text-[11px] text-muted-foreground">
                        {analyzeProgress > 20 && <p className="flex items-center justify-center gap-1"><Eye size={12} className="text-primary" /> تحليل تفاصيل الصور...</p>}
                        {analyzeProgress > 45 && <p className="flex items-center justify-center gap-1"><Layers size={12} className="text-primary" /> مقارنة الأصول بين الصور...</p>}
                        {analyzeProgress > 65 && <p className="flex items-center justify-center gap-1"><ClipboardList size={12} className="text-primary" /> تمييز الزوايا من الأصول المتعددة...</p>}
                        {analyzeProgress > 80 && <p className="flex items-center justify-center gap-1"><Check size={12} className="text-success" /> إعداد الجرد النهائي...</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <AiStar size={48} className="mb-6" />
                      <h2 className="font-medium mb-2">تحليل الصور بالذكاء الاصطناعي</h2>
                      <p className="text-sm text-muted-foreground max-w-sm mb-4">سيقوم مقبل بتحليل صورك واكتشاف الأصول تلقائياً</p>
                      {totalPhotos === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-warning">
                          <AlertTriangle size={14} />
                          يرجى رفع صور في الخطوة السابقة أولاً
                        </div>
                      ) : (
                        <Button onClick={handleAnalyze} className="gradient-primary text-primary-foreground rounded-xl">
                          <Eye size={16} strokeWidth={1.5} />
                          ابدأ التحليل الذكي ({totalPhotos} صورة)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Analysis complete summary */}
                  <div className="rounded-xl bg-success/5 border border-success/20 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <Check size={18} strokeWidth={1.5} className="text-success" />
                      </div>
                      <h2 className="font-medium text-sm">اكتمل التحليل — تم اكتشاف {inventory.length} أصل</h2>
                    </div>
                    {analysisSummary && <p className="text-xs text-muted-foreground">{analysisSummary}</p>}
                    <div className="flex flex-wrap gap-3 justify-center mt-3">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-success/5 border border-success/20">
                        <div className="text-sm font-medium text-success">{inventory.filter(i => i.confidence === "high").length}</div>
                        <div className="text-[10px] text-success">ثقة عالية</div>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-warning/5 border border-warning/20">
                        <div className="text-sm font-medium text-warning">{inventory.filter(i => i.confidence === "medium").length}</div>
                        <div className="text-[10px] text-warning">ثقة متوسطة</div>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="text-sm font-medium text-destructive">{inventory.filter(i => i.confidence === "low").length}</div>
                        <div className="text-[10px] text-destructive">يحتاج تأكيد</div>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Review */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={16} strokeWidth={1.5} className="text-primary" />
                        <h3 className="font-medium text-sm">مراجعة الجرد</h3>
                        <span className="text-[10px] text-muted-foreground">
                          {inventory.filter(i => i.included).length} مشمول — {inventory.filter(i => !i.included).length} مستثنى
                        </span>
                      </div>
                      <button
                        onClick={() => setInventory(prev => [...prev, {
                          id: String(Date.now()),
                          name: "عنصر جديد",
                          qty: 1,
                          condition: "جيدة",
                          category: "أخرى",
                          included: true,
                          confidence: "high",
                          detectionNote: "مضاف يدوياً",
                          photoIndices: [],
                          isSameAssetMultipleAngles: false,
                          userConfirmed: true,
                        }])}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus size={14} strokeWidth={1.3} /> أضف عنصراً
                      </button>
                    </div>

                    {/* Low confidence items */}
                    {lowConfidenceItems.length > 0 && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <AlertTriangle size={14} />
                          عناصر تحتاج تأكيدك ({lowConfidenceItems.length})
                        </div>
                        {lowConfidenceItems.map(item => (
                          <ConfirmationCard
                            key={item.id}
                            item={item}
                            allPhotoUrls={allPhotoUrls}
                            onConfirmSame={() => {
                              setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty: 1, userConfirmed: true } : i));
                            }}
                            onConfirmMultiple={(qty) => {
                              setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty, userConfirmed: true } : i));
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Medium confidence items */}
                    {medConfidenceItems.length > 0 && (
                      <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                          <AlertTriangle size={14} />
                          عناصر يُنصح بتأكيدها ({medConfidenceItems.length})
                        </div>
                        {medConfidenceItems.map(item => (
                          <ConfirmationCard
                            key={item.id}
                            item={item}
                            allPhotoUrls={allPhotoUrls}
                            onConfirmSame={() => {
                              setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty: 1, userConfirmed: true } : i));
                            }}
                            onConfirmMultiple={(qty) => {
                              setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty, userConfirmed: true } : i));
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* All inventory items */}
                    <div className="space-y-2">
                      {inventory.map((item) => (
                        <div key={item.id} className={cn(
                          "p-3 rounded-xl border transition-all",
                          item.included ? "border-border/50 bg-card" : "border-border/30 bg-muted/30 opacity-60"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              {editingItemId === item.id ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => setInventory(inv => inv.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                                  onBlur={() => setEditingItemId(null)}
                                  onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                  autoFocus
                                  className="text-sm bg-transparent border-b border-primary/30 outline-none w-full"
                                />
                              ) : (
                                <div className="text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingItemId(item.id)}>
                                  {item.name}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">{item.category}</span>
                                <span className="text-xs text-muted-foreground">— {item.condition}</span>
                                {getConfidenceBadge(item.confidence)}
                                {item.isSameAssetMultipleAngles && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">زوايا متعددة</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 mr-3">
                              <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1">
                                <button onClick={() => setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><Minus size={12} /></button>
                                <input type="number" min="1" value={item.qty} onChange={(e) => { const val = Math.max(1, parseInt(e.target.value) || 1); setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty: val } : i)); }} className="w-8 text-center text-xs bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                <button onClick={() => setInventory(inv => inv.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><Plus size={12} /></button>
                              </div>
                              <button onClick={() => setInventory(inv => inv.map(i => i.id === item.id ? { ...i, included: !i.included } : i))} className={cn("text-xs px-2.5 py-1 rounded-md transition-all active:scale-[0.97]", item.included ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{item.included ? "مشمول" : "مستثنى"}</button>
                              <button onClick={() => setInventory(inv => inv.filter(i => i.id !== item.id))} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} strokeWidth={1.3} /></button>
                            </div>
                          </div>
                          {item.photoIndices.length > 0 && allPhotoUrls.length > 0 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                              {item.photoIndices.filter(idx => idx < allPhotoUrls.length).slice(0, 6).map((idx) => (
                                <img key={idx} src={allPhotoUrls[idx]} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border border-border/30" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="border-t border-border/50 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={16} strokeWidth={1.5} className="text-primary" />
                      <h3 className="font-medium text-sm">المستندات المطلوبة</h3>
                      <span className="text-[10px] text-muted-foreground">({primaryDealLabel})</span>
                    </div>
                    <div className="space-y-2">
                      {dynamicDocTypes.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50">
                          <div className="flex items-center gap-2">
                            <FileText size={14} strokeWidth={1.3} className="text-muted-foreground" />
                            <div>
                              <span className="text-xs">{doc}</span>
                              {uploadedDocs[doc]?.length > 0 && (
                                <span className="text-[10px] text-success mr-2">✓ {uploadedDocs[doc].length} ملف</span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => { setActiveDocType(doc); docInputRef.current?.click(); }} className="flex items-center gap-1 text-xs text-primary hover:underline active:scale-[0.97]">
                            <Upload size={12} strokeWidth={1.3} /> رفع
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STEP 3: Disclosure + Review & Publish */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Disclosure Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={16} strokeWidth={1.5} className="text-primary" />
                  <h2 className="font-medium text-sm">بيانات الإفصاح</h2>
                </div>
                <p className="text-xs text-muted-foreground">أكمل بيانات الإفصاح لتعزيز ثقة المشترين — مقبل يعبّئ ما يقدر تلقائياً</p>

                {dealStructure.requiredDisclosures.length > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-3">
                    <div className="text-xs font-medium text-warning mb-1.5 flex items-center gap-1">
                      <Shield size={12} /> الإفصاحات المطلوبة
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dealStructure.requiredDisclosures.map((d, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-warning/10 text-warning">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <FormField label="نوع النشاط" placeholder="مثال: مطعم وجبات سريعة" value={disclosure.business_activity} onChange={v => setDisclosure(p => ({ ...p, business_activity: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="المدينة" placeholder="الرياض" value={disclosure.city} onChange={v => setDisclosure(p => ({ ...p, city: v }))} />
                    <FormField label="الحي" placeholder="حي النسيم" value={disclosure.district} onChange={v => setDisclosure(p => ({ ...p, district: v }))} />
                  </div>
                  <FormField label="السعر المطلوب" placeholder="180000" suffix="ر.س" value={disclosure.price} onChange={v => setDisclosure(p => ({ ...p, price: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="الإيجار السنوي" placeholder="45000" suffix="ر.س" value={disclosure.annual_rent} onChange={v => setDisclosure(p => ({ ...p, annual_rent: v }))} />
                    <FormField label="مدة العقد" placeholder="3 سنوات" value={disclosure.lease_duration} onChange={v => setDisclosure(p => ({ ...p, lease_duration: v }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="الفترة المدفوعة" placeholder="1.5 سنة" value={disclosure.lease_paid_period} onChange={v => setDisclosure(p => ({ ...p, lease_paid_period: v }))} />
                    <FormField label="المتبقي من العقد" placeholder="1.5 سنة" value={disclosure.lease_remaining} onChange={v => setDisclosure(p => ({ ...p, lease_remaining: v }))} />
                  </div>
                  <FormField label="الالتزامات المالية" placeholder="لا توجد" value={disclosure.liabilities} onChange={v => setDisclosure(p => ({ ...p, liabilities: v }))} />
                  <FormField label="رواتب متأخرة" placeholder="لا يوجد" value={disclosure.overdue_salaries} onChange={v => setDisclosure(p => ({ ...p, overdue_salaries: v }))} />
                  <FormField label="إيجار متأخر" placeholder="لا يوجد" value={disclosure.overdue_rent} onChange={v => setDisclosure(p => ({ ...p, overdue_rent: v }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="رخصة البلدية" options={["سارية", "منتهية", "غير متوفرة"]} value={disclosure.municipality_license} onChange={v => setDisclosure(p => ({ ...p, municipality_license: v }))} />
                    <SelectField label="الدفاع المدني" options={["سارية", "منتهية", "غير متوفرة"]} value={disclosure.civil_defense_license} onChange={v => setDisclosure(p => ({ ...p, civil_defense_license: v }))} />
                  </div>
                  <SelectField label="كاميرات مراقبة" options={["متوفرة ومطابقة", "متوفرة غير مطابقة", "غير متوفرة"]} value={disclosure.surveillance_cameras} onChange={v => setDisclosure(p => ({ ...p, surveillance_cameras: v }))} />
                </div>
              </div>

              {/* Review & Publish Section */}
              <div className="border-t border-border/50 pt-6 space-y-5">
                <div className="flex items-center gap-3">
                  <AiStar size={24} />
                  <div>
                    <h2 className="font-medium text-sm">ملخص الإعلان</h2>
                    <p className="text-[10px] text-muted-foreground">راجع البيانات قبل النشر</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-medium text-primary mb-1">هيكل الصفقة</div>
                  {dealStructure.selectedTypes.map((typeId, idx) => {
                    const dt = DEAL_TYPE_MAP[typeId];
                    if (!dt) return null;
                    return (
                      <div key={typeId} className="flex items-center gap-2 text-xs">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-medium",
                          typeId === dealStructure.primaryType ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {typeId === dealStructure.primaryType ? "رئيسي" : `بديل ${idx}`}
                        </span>
                        <span>{dt.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-accent/30 rounded-xl p-5">
                  <p className="text-sm leading-relaxed text-foreground">
                    {disclosure.business_activity || "مشروع"} في {disclosure.district || "—"}, {disclosure.city || "—"}.
                    {` هيكل الصفقة: ${primaryDealLabel}.`}
                    {" "}عدد الأصول المؤكّدة: {inventory.filter(i => i.included).length} عنصر ({inventory.filter(i => i.included).reduce((s, i) => s + i.qty, 0)} قطعة).
                    {disclosure.annual_rent && ` الإيجار السنوي ${disclosure.annual_rent} ريال.`}
                    {disclosure.lease_remaining && ` متبقي من العقد ${disclosure.lease_remaining}.`}
                    {disclosure.price && ` السعر المطلوب ${Number(disclosure.price).toLocaleString()} ريال.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${disclosureScore}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">إفصاح {disclosureScore}%</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{totalPhotos}</div>
                    <div className="text-[10px] text-muted-foreground">صورة</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{inventory.filter(i => i.included).length}</div>
                    <div className="text-[10px] text-muted-foreground">أصل مشمول</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-medium text-foreground">{Object.values(uploadedDocs).flat().length}</div>
                    <div className="text-[10px] text-muted-foreground">مستند</div>
                  </div>
                </div>
                <Button
                  onClick={handlePublish}
                  disabled={saving || loading}
                  className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={1.5} />}
                  نشر الإعلان
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 && showDealStructure} className="rounded-xl active:scale-[0.98]">
            <ArrowRight size={16} strokeWidth={1.5} /> السابق
          </Button>
          {currentStep < steps.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={(currentStep === 0 && !dealStructure.isValid) || saving || (currentStep === 1 && analyzing)}
              className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
            >
              التالي
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Confirmation Card for low/medium confidence items ──────
const ConfirmationCard = ({
  item,
  allPhotoUrls,
  onConfirmSame,
  onConfirmMultiple,
}: {
  item: InventoryItem;
  allPhotoUrls: string[];
  onConfirmSame: () => void;
  onConfirmMultiple: (qty: number) => void;
}) => {
  const [showQtyInput, setShowQtyInput] = useState(false);
  const [tempQty, setTempQty] = useState(item.qty);

  return (
    <div className="bg-card rounded-lg p-3 border border-border/50">
      <div className="text-sm font-medium mb-1">{item.name}</div>
      <div className="text-[11px] text-muted-foreground mb-2">{item.detectionNote}</div>
      {item.photoIndices.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {item.photoIndices.filter(idx => idx < allPhotoUrls.length).slice(0, 6).map((idx) => (
            <img key={idx} src={allPhotoUrls[idx]} alt="" className="w-14 h-14 rounded-md object-cover shrink-0 border border-border/30" />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-2">هل هذه الصور لنفس الأصل أم لأصول متعددة؟</p>
      {!showQtyInput ? (
        <div className="flex gap-2">
          <button onClick={onConfirmSame} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]">هذا نفس الأصل</button>
          <button onClick={() => setShowQtyInput(true)} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors active:scale-[0.97]">هذه أصول متعددة</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">عدد القطع:</span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1">
            <button onClick={() => setTempQty(q => Math.max(2, q - 1))} className="p-1"><Minus size={12} /></button>
            <input type="number" min="2" value={tempQty} onChange={e => setTempQty(Math.max(2, parseInt(e.target.value) || 2))} className="w-10 text-center text-xs bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <button onClick={() => setTempQty(q => q + 1)} className="p-1"><Plus size={12} /></button>
          </div>
          <button onClick={() => onConfirmMultiple(tempQty)} className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors active:scale-[0.97]">تأكيد</button>
        </div>
      )}
    </div>
  );
};

const FormField = ({ label, placeholder, suffix, value, onChange }: {
  label: string; placeholder: string; suffix?: string; value: string; onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
      />
      {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  </div>
);

const SelectField = ({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
    >
      <option value="">اختر...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default CreateListingPage;
