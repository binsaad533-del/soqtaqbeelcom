import { Link, useParams } from "react-router-dom";
import { MapPin, FileText, ShieldCheck, AlertTriangle, TrendingUp, Lightbulb, MessageCircle, ChevronDown, ChevronUp, Building2, BarChart3 } from "lucide-react";
import AiStar from "@/components/AiStar";
import { Button } from "@/components/ui/button";
import DealCheckPanel from "@/components/DealCheckPanel";
import { useState } from "react";

const ListingDetailsPage = () => {
  const { id } = useParams();
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  // Mock listing data
  const listing = {
    id,
    title: "مطعم شاورما مجهّز بالكامل",
    category: "مطاعم",
    city: "الرياض",
    district: "حي النسيم",
    price: 180000,
    dealType: "تقبّل كامل",
    disclosureScore: 92,
    rent: 45000,
    leaseDuration: "3 سنوات",
    remainingLease: "1.5 سنة",
    licenseStatus: "سارية",
    civilDefense: "سارية",
    cameras: "متوفرة",
    liabilities: "لا توجد التزامات معلنة",
    summary: "مطعم شاورما مجهّز بالكامل في موقع تجاري نشط بحي النسيم، الرياض. يشمل التقبّل جميع المعدات والأجهزة والديكور والاسم التجاري والسجل التجاري. المساحة 85 متر مربع. الإيجار السنوي 45,000 ريال مع متبقي عقد إيجار 1.5 سنة.",
    included: ["معدات المطبخ كاملة", "شوايات صناعية (2)", "ثلاجات عرض (3)", "طاولات وكراسي (8 طاولات)", "واجهة المحل والديكور", "السجل التجاري", "الاسم التجاري"],
    excluded: ["المخزون الغذائي الحالي", "حسابات التواصل الاجتماعي"],
    inventory: [
      { name: "شواية صناعية", qty: 2, condition: "جيدة" },
      { name: "ثلاجة عرض", qty: 3, condition: "جيدة" },
      { name: "طاولة طعام مع كراسي", qty: 8, condition: "متوسطة" },
      { name: "مقلاة صناعية", qty: 1, condition: "جيدة" },
      { name: "جهاز كاشير", qty: 1, condition: "جيدة" },
      { name: "لوحة إعلانية خارجية", qty: 1, condition: "جيدة" },
    ],
    documents: [
      { name: "عقد الإيجار", status: "مرفق" },
      { name: "السجل التجاري", status: "مرفق" },
      { name: "رخصة البلدية", status: "مرفق" },
      { name: "رخصة الدفاع المدني", status: "مرفق" },
      { name: "فواتير شراء المعدات", status: "غير مرفق" },
    ],
  };

  const aiPanel = {
    marketView: "قطاع المطاعم السريعة في السعودية يشهد نمواً مستمراً مع تزايد الطلب على الوجبات الجاهزة. المنافسة عالية لكن الطلب يستوعب لاعبين جدد خصوصاً في الأحياء السكنية الكثيفة.",
    cityView: "الرياض تمثل أكبر سوق للمطاعم في المملكة مع كثافة سكانية عالية وقوة شرائية جيدة. النشاط مناسب جداً للمدينة.",
    districtView: "حي النسيم من الأحياء ذات الكثافة السكانية المتوسطة إلى العالية مع حركة تجارية نشطة. الموقع مناسب لمطعم شاورما مع وجود عملاء محتملين من السكان والمارة.",
    opinion: "فرصة واعدة",
    opinionDetail: "المطعم مجهّز بالكامل مع إفصاح عالي وموقع جيد. السعر المطلوب معقول مقارنة بقيمة الأصول والموقع. ينصح بالتحقق من سبب البيع والتفاوض على فترة انتقالية.",
    risks: [
      "متبقي عقد الإيجار 1.5 سنة فقط — يحتاج تجديد",
      "فواتير شراء المعدات غير مرفقة",
      "حالة بعض الطاولات والكراسي متوسطة",
      "لا يوجد توضيح لسبب البيع",
    ],
    opportunities: [
      "موقع تجاري نشط مع حركة مرور جيدة",
      "معدات مطبخ كاملة وبحالة جيدة",
      "إفصاح عالي يعزز الثقة",
      "إمكانية تطوير الخدمة وتوسيع القائمة",
      "سعر معقول مقارنة بتكلفة التأسيس من الصفر",
    ],
    suggestions: [
      "تفاوض على تجديد عقد الإيجار قبل إتمام الصفقة",
      "اطلب فواتير شراء المعدات للتأكد من ملكيتها",
      "قيّم حالة الأثاث ميدانياً واحسب تكلفة الاستبدال",
      "اسأل عن سبب البيع واطلب فترة انتقالية مع التدريب",
    ],
  };

  return (
    <div className="py-8">
      <div className="container">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/marketplace" className="hover:text-foreground transition-colors">السوق</Link>
          <span>/</span>
          <span className="text-foreground">{listing.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] bg-card rounded-xl gradient-hero flex items-center justify-center shadow-soft">
                  <Building2 size={24} strokeWidth={1} className="text-muted-foreground/20" />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <AiStar size={20} animate={false} />
                <h2 className="font-medium">ملخص الفرصة</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.summary}</p>
            </div>

            {/* Included / Excluded */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-5 shadow-soft">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} strokeWidth={1.3} className="text-success" />
                  يشمل التقبّل
                </h3>
                <ul className="space-y-2">
                  {listing.included.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-soft">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} strokeWidth={1.3} className="text-warning" />
                  لا يشمل التقبّل
                </h3>
                <ul className="space-y-2">
                  {listing.excluded.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-card rounded-2xl p-6 shadow-soft">
              <h3 className="font-medium mb-4">جرد الأصول المؤكّد</h3>
              <div className="space-y-2">
                {listing.inventory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.qty} وحدة</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${item.condition === "جيدة" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {item.condition}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-card rounded-2xl p-6 shadow-soft">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <FileText size={16} strokeWidth={1.3} />
                المستندات الداعمة
              </h3>
              <div className="space-y-2">
                {listing.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm">{doc.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${doc.status === "مرفق" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Deal Check Panel */}
            <DealCheckPanel listing={listing} />

            {/* AI Deal Intelligence Panel (Static) */}
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <button
                onClick={() => setAiPanelOpen(!aiPanelOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AiStar size={24} />
                  <div className="text-start">
                    <h3 className="font-medium">تحليل ذكاء الصفقة</h3>
                    <p className="text-xs text-muted-foreground">تحليل تجاري شامل مدعوم بالذكاء الاصطناعي</p>
                  </div>
                </div>
                {aiPanelOpen ? <ChevronUp size={18} strokeWidth={1.3} /> : <ChevronDown size={18} strokeWidth={1.3} />}
              </button>

              {aiPanelOpen && (
                <div className="px-6 pb-6 space-y-6">
                  <div className="bg-accent/40 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">رأي الذكاء الاصطناعي</div>
                    <div className="text-lg font-medium gradient-text mb-2">{aiPanel.opinion}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiPanel.opinionDetail}</p>
                  </div>
                  <AiSection icon={BarChart3} title="نظرة عامة على السوق" content={aiPanel.marketView} />
                  <AiSection icon={MapPin} title={`السوق في ${listing.city}`} content={aiPanel.cityView} />
                  <AiSection icon={MapPin} title={`الموقع: ${listing.district}`} content={aiPanel.districtView} />
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} strokeWidth={1.3} className="text-destructive/70" />
                      المخاطر
                    </h4>
                    <ul className="space-y-2">
                      {aiPanel.risks.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive/50 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <TrendingUp size={16} strokeWidth={1.3} className="text-success" />
                      الفرص
                    </h4>
                    <ul className="space-y-2">
                      {aiPanel.opportunities.map((o, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success/60 shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Lightbulb size={16} strokeWidth={1.3} className="text-warning" />
                      توصيات
                    </h4>
                    <ul className="space-y-2">
                      {aiPanel.suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 shadow-soft sticky top-20">
              <h2 className="text-xl font-medium mb-1">{listing.title}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <MapPin size={14} strokeWidth={1.3} />
                {listing.city} — {listing.district}
              </div>

              <div className="text-2xl font-medium gradient-text mb-6">
                {listing.price.toLocaleString("en-US")} <span className="text-sm">ر.س</span>
              </div>

              <div className="space-y-3 mb-6">
                <InfoRow label="نوع الصفقة" value={listing.dealType} />
                <InfoRow label="الإيجار السنوي" value={`${listing.rent.toLocaleString("en-US")} ر.س`} />
                <InfoRow label="مدة العقد" value={listing.leaseDuration} />
                <InfoRow label="المتبقي" value={listing.remainingLease} />
                <InfoRow label="رخصة البلدية" value={listing.licenseStatus} />
                <InfoRow label="الدفاع المدني" value={listing.civilDefense} />
                <InfoRow label="كاميرات المراقبة" value={listing.cameras} />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${listing.disclosureScore}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">إفصاح {listing.disclosureScore}%</span>
              </div>

              <Button asChild className="w-full gradient-primary text-primary-foreground rounded-xl active:scale-[0.98]">
                <Link to={`/negotiate/${listing.id}`}>
                  <MessageCircle size={16} strokeWidth={1.5} />
                  ابدأ التفاوض
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const AiSection = ({ icon: Icon, title, content }: { icon: any; title: string; content: string }) => (
  <div>
    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
      <Icon size={16} strokeWidth={1.3} className="text-primary/70" />
      {title}
    </h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
  </div>
);

export default ListingDetailsPage;
