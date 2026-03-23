import { useState, useCallback, useRef } from "react";
import { Check, Upload, Camera, FileText, ClipboardList, Eye, ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useListings } from "@/hooks/useListings";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const steps = [
  { label: "نوع التقبّل", icon: ClipboardList },
  { label: "صور المشروع", icon: Camera },
  { label: "تحليل الصور", icon: Eye },
  { label: "مراجعة الجرد", icon: ClipboardList },
  { label: "المستندات", icon: FileText },
  { label: "بيانات الإفصاح", icon: ClipboardList },
  { label: "المراجعة والنشر", icon: Check },
];

const dealTypes = [
  { id: "full", label: "تقبّل كامل", desc: "نقل الأعمال بالكامل مع جميع الأصول والسجل" },
  { id: "assets", label: "أصول فقط", desc: "بيع المعدات والأثاث والأجهزة فقط" },
  { id: "assets-cr", label: "أصول + سجل تجاري", desc: "الأصول مع نقل السجل التجاري" },
  { id: "assets-name", label: "أصول + اسم تجاري", desc: "الأصول مع الاسم التجاري والعلامة" },
  { id: "assets-cr-no-name", label: "أصول + سجل بدون الاسم", desc: "الأصول والسجل لكن بدون نقل الاسم التجاري" },
];

const photoGroups = [
  { id: "interior", label: "صور داخلية للمحل", desc: "صور واضحة للمساحة الداخلية من زوايا مختلفة", min: 3 },
  { id: "exterior", label: "واجهة المحل", desc: "صور للمدخل والواجهة الخارجية", min: 2 },
  { id: "building", label: "المبنى", desc: "صور عامة للمبنى من الخارج", min: 1 },
  { id: "street", label: "الشارع المحيط", desc: "صور للشارع والمحيط التجاري", min: 1 },
  { id: "signage", label: "اللوحة / اللافتة", desc: "صورة واضحة للافتة المحل", min: 1 },
  { id: "equipment", label: "المعدات والأجهزة", desc: "صور قريبة للمعدات والأثاث والأجهزة", min: 4 },
];

const docTypes = [
  "عقد الإيجار",
  "السجل التجاري",
  "رخصة البلدية",
  "رخصة الدفاع المدني",
  "فواتير شراء المعدات",
  "سجلات الصيانة",
  "مستندات أخرى",
];

interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  condition: string;
  category: string;
  included: boolean;
}

const CreateListingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDealType, setSelectedDealType] = useState("");
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [listingId, setListingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Disclosure fields
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

  // Create draft listing on first step completion
  const ensureListing = useCallback(async () => {
    if (listingId) return listingId;
    const { data, error } = await createListing({ deal_type: selectedDealType, status: "draft" });
    if (error || !data) {
      toast.error("حدث خطأ أثناء حفظ المسودة");
      return null;
    }
    const id = (data as any).id;
    setListingId(id);
    return id;
  }, [listingId, selectedDealType, createListing]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activePhotoGroup) return;
    const id = await ensureListing();
    if (!id) return;
    setSaving(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(id, file, `photos/${activePhotoGroup}`);
      if (url) urls.push(url);
    }
    setPhotos(prev => ({
      ...prev,
      [activePhotoGroup]: [...(prev[activePhotoGroup] || []), ...urls],
    }));
    // Save to DB
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
    setAnalyzing(true);
    // AI analysis simulation - in production this calls the AI edge function
    setTimeout(() => {
      setInventory([
        { id: "1", name: "شواية صناعية", qty: 2, condition: "جيدة", category: "معدات مطبخ", included: true },
        { id: "2", name: "ثلاجة عرض", qty: 3, condition: "جيدة", category: "تبريد", included: true },
        { id: "3", name: "طاولة طعام مع كراسي", qty: 8, condition: "متوسطة", category: "أثاث", included: true },
        { id: "4", name: "مقلاة صناعية", qty: 1, condition: "جيدة", category: "معدات مطبخ", included: true },
        { id: "5", name: "جهاز كاشير", qty: 1, condition: "جيدة", category: "أجهزة", included: true },
        { id: "6", name: "لوحة إعلانية خارجية", qty: 1, condition: "جيدة", category: "ديكور", included: true },
        { id: "7", name: "مكيف سبليت", qty: 2, condition: "متوسطة", category: "تكييف", included: true },
      ]);
      setAnalyzing(false);
      setAnalyzed(true);
    }, 3000);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      await ensureListing();
    }
    if (currentStep === 2 && !analyzed) {
      handleAnalyze();
      return;
    }
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
  };

  const handleBack = () => setCurrentStep(Math.max(0, currentStep - 1));

  const handlePublish = async () => {
    const id = listingId;
    if (!id) return;
    setSaving(true);

    // Calculate disclosure score
    const fields = Object.values(disclosure);
    const filled = fields.filter(v => v.trim() !== "").length;
    const score = Math.round((filled / fields.length) * 100);

    await updateListing(id, {
      ...disclosure,
      price: disclosure.price ? Number(disclosure.price) : null,
      annual_rent: disclosure.annual_rent ? Number(disclosure.annual_rent) : null,
      disclosure_score: score,
      inventory: inventory.filter(i => i.included),
      status: "published",
      published_at: new Date().toISOString(),
      title: `${disclosure.business_activity || "مشروع"} — ${disclosure.district || ""}, ${disclosure.city || ""}`,
    } as any);

    setSaving(false);
    toast.success("تم نشر الإعلان بنجاح!");
    navigate("/dashboard");
  };

  const totalPhotos = Object.values(photos).reduce((a, b) => a + b.length, 0);

  const disclosureScore = (() => {
    const fields = Object.values(disclosure);
    const filled = fields.filter(v => v.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <h1 className="text-2xl font-medium mb-2">إضافة فرصة تقبّل</h1>
        <p className="text-sm text-muted-foreground mb-8">أنشئ إعلان تقبّل احترافي بمساعدة الذكاء الاصطناعي</p>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={handleDocUpload} />

        {/* Steps indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all",
                i === currentStep ? "bg-primary/10 text-primary" :
                i < currentStep ? "bg-success/10 text-success" : "text-muted-foreground"
              )}>
                {i < currentStep ? <Check size={12} strokeWidth={1.5} /> : <step.icon size={12} strokeWidth={1.5} />}
                {step.label}
              </div>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="flex items-center gap-2 text-xs text-primary mb-4">
            <Loader2 size={14} className="animate-spin" />
            جاري الحفظ...
          </div>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8 min-h-[400px]">
          {/* Step 0: Deal Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="font-medium mb-1">اختر نوع التقبّل</h2>
              <p className="text-sm text-muted-foreground mb-4">حدد ما ترغب في عرضه للمشتري</p>
              <div className="space-y-3">
                {dealTypes.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setSelectedDealType(dt.id)}
                    className={cn(
                      "w-full text-start p-4 rounded-xl border transition-all active:scale-[0.99]",
                      selectedDealType === dt.id
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    <div className="font-medium text-sm mb-0.5">{dt.label}</div>
                    <div className="text-xs text-muted-foreground">{dt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Photos */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-medium mb-1">صور المشروع</h2>
                <p className="text-sm text-muted-foreground mb-1">صور شاملة ومنظّمة تعزز جودة الإعلان وثقة المشتري</p>
                <div className="flex items-center gap-2 mt-3 mb-5">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${Math.min(100, (totalPhotos / 12) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{totalPhotos} صورة</span>
                </div>
              </div>
              <div className="space-y-4">
                {photoGroups.map((group) => (
                  <div key={group.id} className="p-4 rounded-xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{group.label}</div>
                        <div className="text-xs text-muted-foreground">{group.desc} — {group.min} صور على الأقل</div>
                      </div>
                      <button
                        onClick={() => {
                          setActivePhotoGroup(group.id);
                          fileInputRef.current?.click();
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-[0.97]",
                          (photos[group.id]?.length || 0) >= group.min
                            ? "bg-success/10 text-success"
                            : "bg-accent text-accent-foreground"
                        )}
                      >
                        <Upload size={14} strokeWidth={1.3} />
                        {(photos[group.id]?.length || 0) > 0 ? `${photos[group.id].length} صورة` : "رفع"}
                      </button>
                    </div>
                    {/* Photo thumbnails */}
                    {photos[group.id]?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {photos[group.id].map((url, i) => (
                          <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border/30" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: AI Analysis */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {analyzing ? (
                <>
                  <AiStar size={56} className="mb-6" />
                  <h2 className="font-medium mb-2">الذكاء الاصطناعي يحلّل الصور...</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">جاري اكتشاف الأصول والمعدات من الصور المرفوعة وبناء جرد أولي</p>
                  <div className="mt-6 h-1 w-48 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary animate-pulse" style={{ width: "60%" }} />
                  </div>
                </>
              ) : analyzed ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <Check size={24} strokeWidth={1.3} className="text-success" />
                  </div>
                  <h2 className="font-medium mb-2">اكتمل التحليل</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">تم اكتشاف {inventory.length} عنصر من الصور. راجع الجرد في الخطوة التالية.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {inventory.slice(0, 4).map(item => (
                      <span key={item.id} className="text-xs bg-accent/60 text-accent-foreground px-3 py-1 rounded-lg">{item.name}</span>
                    ))}
                    {inventory.length > 4 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">+{inventory.length - 4} عناصر أخرى</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AiStar size={48} className="mb-6" />
                  <h2 className="font-medium mb-2">تحليل الصور بالذكاء الاصطناعي</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">سيقوم الذكاء الاصطناعي بتحليل صورك واكتشاف الأصول والمعدات تلقائياً</p>
                </>
              )}
            </div>
          )}

          {/* Step 3: Inventory Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-medium">مراجعة الجرد</h2>
                  <p className="text-xs text-muted-foreground">{inventory.filter(i => i.included).length} عنصر مشمول — {inventory.filter(i => !i.included).length} مستثنى</p>
                </div>
                <button
                  onClick={() => setInventory(prev => [...prev, { id: String(Date.now()), name: "عنصر جديد", qty: 1, condition: "جيدة", category: "أخرى", included: true }])}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus size={14} strokeWidth={1.3} />
                  أضف عنصراً
                </button>
              </div>
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      item.included ? "border-border/50 bg-card" : "border-border/30 bg-muted/30 opacity-60"
                    )}
                  >
                    <div className="flex-1">
                      <div className="text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.category} — {item.qty} وحدة — {item.condition}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInventory(inv => inv.map(i => i.id === item.id ? { ...i, included: !i.included } : i))}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-md transition-all active:scale-[0.97]",
                          item.included ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.included ? "مشمول" : "مستثنى"}
                      </button>
                      <button
                        onClick={() => setInventory(inv => inv.filter(i => i.id !== item.id))}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="font-medium mb-1">المستندات الداعمة</h2>
              <p className="text-sm text-muted-foreground mb-4">ارفع المستندات التي تدعم الإعلان — الذكاء الاصطناعي سيستخرج البيانات تلقائياً</p>
              {docTypes.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2">
                    <FileText size={16} strokeWidth={1.3} className="text-muted-foreground" />
                    <div>
                      <span className="text-sm">{doc}</span>
                      {uploadedDocs[doc]?.length > 0 && (
                        <span className="text-[10px] text-success mr-2">✓ {uploadedDocs[doc].length} ملف</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveDocType(doc);
                      docInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline active:scale-[0.97]"
                  >
                    <Upload size={14} strokeWidth={1.3} />
                    رفع
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Step 5: Disclosure */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="font-medium mb-1">بيانات الإفصاح</h2>
              <p className="text-sm text-muted-foreground mb-4">أكمل بيانات الإفصاح لتعزيز ثقة المشترين</p>
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
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-4">
                <AiStar size={28} />
                <div>
                  <h2 className="font-medium">ملخص الإعلان</h2>
                  <p className="text-xs text-muted-foreground">راجع البيانات قبل النشر</p>
                </div>
              </div>
              <div className="bg-accent/30 rounded-xl p-5">
                <p className="text-sm leading-relaxed text-foreground">
                  {disclosure.business_activity || "مشروع"} في {disclosure.district || "—"}, {disclosure.city || "—"}.
                  {selectedDealType === "full" ? " يشمل التقبّل جميع المعدات والأجهزة والديكور." : ` نوع التقبّل: ${dealTypes.find(d => d.id === selectedDealType)?.label || selectedDealType}.`}
                  {" "}عدد الأصول المؤكّدة: {inventory.filter(i => i.included).length} عنصر.
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

              {/* Summary cards */}
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
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="rounded-xl active:scale-[0.98]"
          >
            <ArrowRight size={16} strokeWidth={1.5} />
            السابق
          </Button>
          {currentStep < steps.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={(currentStep === 0 && !selectedDealType) || saving}
              className="gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]"
            >
              {currentStep === 2 && !analyzed ? "ابدأ التحليل" : "التالي"}
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
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
