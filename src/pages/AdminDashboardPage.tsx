import { Link } from "react-router-dom";
import { BarChart3, AlertCircle, Check, Clock, FileText, Eye, ChevronLeft, Users } from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";

const adminStats = [
  { label: "إعلانات نشطة", value: "847", icon: FileText },
  { label: "إفصاح مكتمل", value: "94%", icon: Check },
  { label: "تفاوضات جارية", value: "156", icon: Users },
  { label: "تحليلات AI قيد المعالجة", value: "12", icon: Clock },
];

const recentListings = [
  { id: "1", title: "مطعم شاورما — النسيم", quality: "ممتاز", disclosure: 92, aiStatus: "مكتمل" },
  { id: "2", title: "كافيه مختص — الروضة", quality: "جيد", disclosure: 87, aiStatus: "مكتمل" },
  { id: "3", title: "صالون رجالي — الفيصلية", quality: "متوسط", disclosure: 78, aiStatus: "قيد التحليل" },
  { id: "4", title: "ورشة سيارات — الصفا", quality: "ضعيف", disclosure: 68, aiStatus: "مكتمل" },
  { id: "5", title: "بقالة — الملقا", quality: "ممتاز", disclosure: 95, aiStatus: "مكتمل" },
];

const warnings = [
  "3 إعلانات بنسبة إفصاح أقل من 70%",
  "12 تحليل ذكاء اصطناعي قيد المعالجة",
  "إعلان واحد بدون صور كافية",
  "2 تفاوض متوقف منذ أكثر من 7 أيام",
];

const AdminDashboardPage = () => {
  return (
    <div className="py-8">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium">لوحة الإدارة</h1>
            <p className="text-sm text-muted-foreground">نظرة شاملة على نشاط المنصة</p>
          </div>
          <AiStar size={28} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {adminStats.map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} strokeWidth={1.3} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-xl font-medium">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Listings Table */}
          <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-soft">
            <h2 className="font-medium text-sm mb-4">أحدث الإعلانات</h2>
            <div className="space-y-2">
              {recentListings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-sm">{listing.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">إفصاح {listing.disclosure}%</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-md",
                      listing.quality === "ممتاز" ? "bg-success/10 text-success" :
                      listing.quality === "جيد" ? "bg-accent text-accent-foreground" :
                      listing.quality === "متوسط" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    )}>
                      {listing.quality}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-md",
                      listing.aiStatus === "مكتمل" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}>
                      {listing.aiStatus}
                    </span>
                    <ChevronLeft size={14} strokeWidth={1.3} className="text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Warnings */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
                <AlertCircle size={16} strokeWidth={1.3} className="text-warning" />
                تنبيهات النظام
              </h2>
              <ul className="space-y-2">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 p-2 rounded-lg bg-warning/5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-warning/60 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h2 className="font-medium text-sm mb-3 flex items-center gap-2">
                <BarChart3 size={16} strokeWidth={1.3} className="text-primary/70" />
                ملخص النشاط
              </h2>
              <div className="space-y-3">
                <StatRow label="إعلانات جديدة اليوم" value="14" />
                <StatRow label="تفاوضات بدأت اليوم" value="8" />
                <StatRow label="اتفاقيات مكتملة هذا الأسبوع" value="23" />
                <StatRow label="مستندات تم تحليلها" value="67" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default AdminDashboardPage;
