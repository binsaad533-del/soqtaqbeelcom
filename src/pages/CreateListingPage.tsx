import { useState } from "react";
import { Check, Upload, Camera, FileText, ClipboardList, Eye, ArrowLeft, ArrowRight, Plus, X, Trash2 } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const mockInventory = [
  { id: "1", name: "شواية صناعية", qty: 2, condition: "جيدة", category: "معدات مطبخ", included: true },
  { id: "2", name: "ثلاجة عرض", qty: 3, condition: "جيدة", category: "تبريد", included: true },
  { id: "3", name: "طاولة طعام مع كراسي", qty: 8, condition: "متوسطة", category: "أثاث", included: true },
  { id: "4", name: "مقلاة صناعية", qty: 1, condition: "جيدة", category: "معدات مطبخ", included: true },
  { id: "5", name: "جهاز كاشير", qty: 1, condition: "جيدة", category: "أجهزة", included: true },
  { id: "6", name: "لوحة إعلانية خارجية", qty: 1, condition: "جيدة", category: "ديكور", included: true },
  { id: "7", name: "مكيف سبليت", qty: 2, condition: "متوسطة", category: "تكييف", included: true },
];

const CreateListingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDealType, setSelectedDealType] = useState("");
  const [photos, setPhotos] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [inventory, setInventory] = useState(mockInventory);

  const handleNext = () => {
    if (currentStep === 2 && !analyzed) {
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        setAnalyzed(true);
      }, 3000);
      return;
    }
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
  };

  const handleBack = () => setCurrentStep(Math.max(0, currentStep - 1));

  const totalPhotos = Object.values(photos).reduce((a, b) => a + b, 0);

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <h1 className="text-2xl font-medium mb-2">إضافة فرصة تقبّل</h1>
        <p className="text-sm text-muted-foreground mb-8">أنشئ إعلان تقبّل احترافي بمساعدة الذكاء الاصطناعي</p>

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
                  <div key={group.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{group.label}</div>
                      <div className="text-xs text-muted-foreground">{group.desc} — {group.min} صور على الأقل</div>
                    </div>
                    <button
                      onClick={() => setPhotos(p => ({ ...p, [group.id]: (p[group.id] || 0) + 2 }))}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all active:scale-[0.97]",
                        (photos[group.id] || 0) >= group.min
                          ? "bg-success/10 text-success"
                          : "bg-accent text-accent-foreground"
                      )}
                    >
                      <Upload size={14} strokeWidth={1.3} />
                      {(photos[group.id] || 0) > 0 ? `${photos[group.id]} صورة` : "رفع"}
                    </button>
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
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">تم اكتشاف {mockInventory.length} عنصر من الصور. راجع الجرد في الخطوة التالية.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {mockInventory.slice(0, 4).map(item => (
                      <span key={item.id} className="text-xs bg-accent/60 text-accent-foreground px-3 py-1 rounded-lg">{item.name}</span>
                    ))}
                    <span className="text-xs text-muted-foreground px-2 py-1">+{mockInventory.length - 4} عناصر أخرى</span>
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
                <button className="flex items-center gap-1 text-xs text-primary hover:underline">
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
              {[
                "عقد الإيجار",
                "السجل التجاري",
                "رخصة البلدية",
                "رخصة الدفاع المدني",
                "فواتير شراء المعدات",
                "سجلات الصيانة",
                "مستندات أخرى",
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2">
                    <FileText size={16} strokeWidth={1.3} className="text-muted-foreground" />
                    <span className="text-sm">{doc}</span>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-primary hover:underline active:scale-[0.97]">
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
                <FormField label="نوع النشاط" placeholder="مثال: مطعم وجبات سريعة" />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="المدينة" placeholder="الرياض" />
                  <FormField label="الحي" placeholder="حي النسيم" />
                </div>
                <FormField label="السعر المطلوب" placeholder="180000" suffix="ر.س" />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="الإيجار السنوي" placeholder="45000" suffix="ر.س" />
                  <FormField label="مدة العقد" placeholder="3 سنوات" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="الفترة المدفوعة" placeholder="1.5 سنة" />
                  <FormField label="المتبقي من العقد" placeholder="1.5 سنة" />
                </div>
                <FormField label="الالتزامات المالية" placeholder="لا توجد" />
                <FormField label="رواتب متأخرة" placeholder="لا يوجد" />
                <FormField label="إيجار متأخر" placeholder="لا يوجد" />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="رخصة البلدية" options={["سارية", "منتهية", "غير متوفرة"]} />
                  <SelectField label="الدفاع المدني" options={["سارية", "منتهية", "غير متوفرة"]} />
                </div>
                <SelectField label="كاميرات مراقبة" options={["متوفرة ومطابقة", "متوفرة غير مطابقة", "غير متوفرة"]} />
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
                  <p className="text-xs text-muted-foreground">ملخص تم إنشاؤه بالذكاء الاصطناعي — راجعه قبل النشر</p>
                </div>
              </div>
              <div className="bg-accent/30 rounded-xl p-5">
                <p className="text-sm leading-relaxed text-foreground">
                  مطعم شاورما مجهّز بالكامل في موقع تجاري نشط بحي النسيم، الرياض. يشمل التقبّل جميع المعدات والأجهزة والديكور والاسم التجاري والسجل التجاري. عدد الأصول المؤكّدة: 7 عناصر. الإيجار السنوي 45,000 ريال مع متبقي عقد 1.5 سنة. رخصة البلدية والدفاع المدني ساريتان. السعر المطلوب 180,000 ريال.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary" style={{ width: "92%" }} />
                </div>
                <span className="text-xs text-muted-foreground">إفصاح 92%</span>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                <Check size={16} strokeWidth={1.5} />
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
              disabled={currentStep === 0 && !selectedDealType}
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

const FormField = ({ label, placeholder, suffix }: { label: string; placeholder: string; suffix?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all"
      />
      {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  </div>
);

const SelectField = ({ label, options }: { label: string; options: string[] }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <select className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all">
      <option value="">اختر...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default CreateListingPage;
