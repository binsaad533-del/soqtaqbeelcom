import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  FileText, Users, MessageCircle, AlertCircle, Shield, Settings,
  BarChart3, Eye, ChevronLeft, Clock, Check, XCircle, Search,
  UserCheck, UserX, FolderOpen, Activity, Bell
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = [
  { label: "نظرة عامة", icon: BarChart3 },
  { label: "المستخدمون", icon: Users },
  { label: "الإعلانات", icon: FileText },
  { label: "الصفقات", icon: MessageCircle },
  { label: "الشكاوى", icon: AlertCircle },
  { label: "المشرفون", icon: Shield },
  { label: "الإعدادات", icon: Settings },
];

// Mock data
const stats = [
  { label: "إجمالي المستخدمين", value: "1,247", icon: Users, trend: "+12%" },
  { label: "إعلانات نشطة", value: "847", icon: FileText, trend: "+8%" },
  { label: "صفقات جارية", value: "156", icon: MessageCircle, trend: "+23%" },
  { label: "معدل الإتمام", value: "78%", icon: Check, trend: "+5%" },
  { label: "شكاوى مفتوحة", value: "7", icon: AlertCircle, trend: "-3" },
  { label: "تحليلات AI نشطة", value: "34", icon: Activity, trend: "" },
];

const recentUsers = [
  { id: "1", name: "أحمد محمد", email: "ahmed@email.com", role: "عميل", status: "نشط", date: "2026-03-22" },
  { id: "2", name: "سارة الخالد", email: "sara@email.com", role: "عميل", status: "نشط", date: "2026-03-21" },
  { id: "3", name: "خالد العتيبي", email: "khalid@email.com", role: "عميل", status: "معلّق", date: "2026-03-20" },
  { id: "4", name: "نورة القحطاني", email: "noura@email.com", role: "عميل", status: "نشط", date: "2026-03-19" },
];

const recentListings = [
  { id: "1", title: "مطعم شاورما — النسيم", quality: "ممتاز", disclosure: 92, status: "نشط" },
  { id: "2", title: "كافيه مختص — الروضة", quality: "جيد", disclosure: 87, status: "قيد المراجعة" },
  { id: "3", title: "صالون رجالي — الفيصلية", quality: "متوسط", disclosure: 78, status: "نشط" },
  { id: "4", title: "ورشة سيارات — الصفا", quality: "ضعيف", disclosure: 68, status: "مرفوض" },
];

const complaints = [
  { id: "1", title: "مشكلة في رفع الصور", user: "أحمد محمد", priority: "عالية", status: "مفتوحة", date: "2026-03-22" },
  { id: "2", title: "خطأ في بيانات الإعلان", user: "سارة الخالد", priority: "متوسطة", status: "قيد المعالجة", date: "2026-03-21" },
  { id: "3", title: "استفسار عن التفاوض", user: "خالد العتيبي", priority: "منخفضة", status: "محلولة", date: "2026-03-20" },
];

const supervisors = [
  { id: "1", name: "محمد الحربي", email: "m.harbi@email.com", cases: 23, open: 5, closed: 18, delayed: 2 },
  { id: "2", name: "فهد السعيد", email: "f.saeed@email.com", cases: 19, open: 3, closed: 16, delayed: 0 },
];

const OwnerDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="py-6">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">لوحة إدارة المنصة</h1>
            <p className="text-xs text-muted-foreground mt-1">
              مرحباً {profile?.full_name || "مالك المنصة"} — تحكم كامل في المنصة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Bell size={18} strokeWidth={1.3} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <AiStar size={24} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all active:scale-[0.97]",
                activeTab === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon size={14} strokeWidth={1.3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.map((stat, i) => (
                <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
                  <div className="flex items-center gap-1.5 mb-2">
                    <stat.icon size={14} strokeWidth={1.3} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-medium">{stat.value}</span>
                    {stat.trend && (
                      <span className={cn("text-[10px]", stat.trend.startsWith("+") ? "text-success" : "text-destructive")}>
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Listings */}
              <div className="bg-card rounded-2xl p-5 shadow-soft">
                <h2 className="text-sm font-medium mb-3">أحدث الإعلانات</h2>
                <div className="space-y-2">
                  {recentListings.map((l) => (
                    <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="text-sm">{l.title}</div>
                        <div className="text-[11px] text-muted-foreground">إفصاح {l.disclosure}%</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                          l.quality === "ممتاز" ? "bg-success/10 text-success" :
                          l.quality === "جيد" ? "bg-accent text-accent-foreground" :
                          l.quality === "متوسط" ? "bg-warning/10 text-warning" :
                          "bg-destructive/10 text-destructive"
                        )}>{l.quality}</span>
                        <ChevronLeft size={14} strokeWidth={1.3} className="text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Complaints */}
              <div className="bg-card rounded-2xl p-5 shadow-soft">
                <h2 className="text-sm font-medium mb-3">الشكاوى الأخيرة</h2>
                <div className="space-y-2">
                  {complaints.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="text-sm">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">{c.user} — {c.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                          c.status === "مفتوحة" ? "bg-warning/10 text-warning" :
                          c.status === "قيد المعالجة" ? "bg-primary/10 text-primary" :
                          "bg-success/10 text-success"
                        )}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Supervisor Performance */}
            <div className="bg-card rounded-2xl p-5 shadow-soft">
              <h2 className="text-sm font-medium mb-3">أداء المشرفين</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {supervisors.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.email}</div>
                      </div>
                      <Shield size={16} strokeWidth={1.3} className="text-primary/50" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-sm font-medium">{s.cases}</div>
                        <div className="text-[10px] text-muted-foreground">إجمالي</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-warning">{s.open}</div>
                        <div className="text-[10px] text-muted-foreground">مفتوح</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-success">{s.closed}</div>
                        <div className="text-[10px] text-muted-foreground">مغلق</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-destructive">{s.delayed}</div>
                        <div className="text-[10px] text-muted-foreground">متأخر</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="البحث عن مستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2.5 bg-card rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-right p-3 text-xs text-muted-foreground font-normal">الاسم</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-normal">البريد</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-normal">الدور</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-normal">الحالة</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-normal">تاريخ التسجيل</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3">{u.name}</td>
                        <td className="p-3 text-muted-foreground text-xs" dir="ltr">{u.email}</td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground">{u.role}</span>
                        </td>
                        <td className="p-3">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                            u.status === "نشط" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          )}>{u.status}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{u.date}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                              <Eye size={14} strokeWidth={1.3} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success transition-colors">
                              <UserCheck size={14} strokeWidth={1.3} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <UserX size={14} strokeWidth={1.3} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} strokeWidth={1.3} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="البحث في الإعلانات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-4 py-2.5 bg-card rounded-xl text-sm border border-border/50 focus:border-primary/50 focus:outline-none"
                  dir="rtl"
                />
              </div>
              <div className="flex gap-1">
                {["الكل", "نشط", "قيد المراجعة", "مرفوض"].map((f) => (
                  <button key={f} className="px-3 py-2 text-[11px] rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors">{f}</button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-soft space-y-2">
              {recentListings.map((l) => (
                <Link key={l.id} to={`/listing/${l.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="text-sm">{l.title}</div>
                    <div className="text-[11px] text-muted-foreground">إفصاح {l.disclosure}%</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                      l.status === "نشط" ? "bg-success/10 text-success" :
                      l.status === "قيد المراجعة" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    )}>{l.status}</span>
                    <ChevronLeft size={14} strokeWidth={1.3} className="text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === 3 && (
          <div className="bg-card rounded-2xl p-5 shadow-soft">
            <h2 className="text-sm font-medium mb-4">الصفقات والتفاوضات</h2>
            <div className="space-y-2">
              {[
                { title: "مطعم شاورما — تفاوض نشط", buyer: "أحمد محمد", seller: "سارة الخالد", stage: "قيد التفاوض", progress: 65 },
                { title: "كافيه مختص — بانتظار الموافقة", buyer: "خالد العتيبي", seller: "نورة القحطاني", stage: "بانتظار الموافقة", progress: 90 },
                { title: "صالون رجالي — مكتمل", buyer: "فهد السعيد", seller: "محمد الحربي", stage: "مكتمل", progress: 100 },
              ].map((deal, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{deal.title}</div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                      deal.stage === "مكتمل" ? "bg-success/10 text-success" :
                      deal.stage === "بانتظار الموافقة" ? "bg-warning/10 text-warning" :
                      "bg-primary/10 text-primary"
                    )}>{deal.stage}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                    <span>المشتري: {deal.buyer}</span>
                    <span>البائع: {deal.seller}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${deal.progress}%`,
                        background: deal.progress === 100 ? "hsl(var(--success))" : "var(--gradient-primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 4 && (
          <div className="bg-card rounded-2xl p-5 shadow-soft">
            <h2 className="text-sm font-medium mb-4">الشكاوى والدعم</h2>
            <div className="space-y-2">
              {complaints.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                        c.priority === "عالية" ? "bg-destructive/10 text-destructive" :
                        c.priority === "متوسطة" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      )}>{c.priority}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                        c.status === "مفتوحة" ? "bg-warning/10 text-warning" :
                        c.status === "قيد المعالجة" ? "bg-primary/10 text-primary" :
                        "bg-success/10 text-success"
                      )}>{c.status}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{c.user} — {c.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supervisors Tab */}
        {activeTab === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">إدارة المشرفين</h2>
              <button
                className="px-4 py-2 rounded-xl text-xs text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                + إضافة مشرف
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {supervisors.map((s) => (
                <div key={s.id} className="bg-card rounded-2xl p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground" dir="ltr">{s.email}</div>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                        <Settings size={14} strokeWidth={1.3} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <StatBlock label="إجمالي" value={String(s.cases)} />
                    <StatBlock label="مفتوح" value={String(s.open)} color="warning" />
                    <StatBlock label="مغلق" value={String(s.closed)} color="success" />
                    <StatBlock label="متأخر" value={String(s.delayed)} color="destructive" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 6 && (
          <div className="space-y-4">
            {[
              { title: "الإعدادات العامة", desc: "اسم المنصة، اللغة، المنطقة الزمنية" },
              { title: "إعدادات المصادقة", desc: "طرق تسجيل الدخول، التحقق من الهوية" },
              { title: "إعدادات الإشعارات", desc: "البريد الإلكتروني، الرسائل النصية، التنبيهات" },
              { title: "إعدادات الذكاء الاصطناعي", desc: "نماذج التحليل، دقة الاستخراج، سلوك التفاوض" },
              { title: "إعدادات رفع الملفات", desc: "أنواع الملفات المسموحة، الحجم الأقصى" },
              { title: "التصنيفات", desc: "إدارة فئات الأعمال والتصنيفات الفرعية" },
              { title: "سير العمل", desc: "مراحل الصفقة، منطق الموافقة، التصعيد" },
            ].map((setting, i) => (
              <div key={i} className="bg-card rounded-xl p-4 shadow-soft flex items-center justify-between hover:shadow-soft-lg transition-all cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{setting.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{setting.desc}</div>
                </div>
                <ChevronLeft size={16} strokeWidth={1.3} className="text-muted-foreground" />
              </div>
            ))}

            <div className="pt-4 border-t border-border/50">
              <button
                onClick={signOut}
                className="px-4 py-2 rounded-xl text-xs text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBlock = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="p-2 rounded-lg bg-muted/30">
    <div className={cn("text-sm font-medium", color ? `text-${color}` : "")}>{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default OwnerDashboardPage;
