import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  FileText, Image, MessageCircle, AlertCircle, Check, Clock,
  ChevronLeft, Bell, User, Upload, FolderOpen, Settings
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = ["إعلاناتي", "المسودات", "التفاوضات", "الاتفاقيات", "الملفات", "الدعم"];

const myListings = [
  { id: "1", title: "مطعم شاورما مجهّز بالكامل", status: "نشط", disclosure: 92, city: "الرياض" },
  { id: "2", title: "كافيه متخصص — جدة", status: "مسودة", disclosure: 45, city: "جدة" },
];

const negotiations = [
  { id: "1", listing: "مطعم شاورما مجهّز بالكامل", lastMessage: "أقترح 150,000 ريال", time: "قبل 2 ساعة", unread: true },
];

const notifications = [
  { text: "تم اكتمال تحليل الصور لإعلان كافيه جدة", type: "success" as const },
  { text: "مستند رخصة البلدية مطلوب لإكمال الإفصاح", type: "warning" as const },
  { text: "عرض تفاوض جديد على مطعم شاورما", type: "info" as const },
];

const CustomerDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="py-6">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">لوحة التحكم</h1>
            <p className="text-xs text-muted-foreground mt-1">
              مرحباً {profile?.full_name || "بك"} — إليك ملخص نشاطك
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Bell size={18} strokeWidth={1.3} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <Link to="/dashboard/profile" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Settings size={18} strokeWidth={1.3} />
            </Link>
            <AiStar size={24} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إعلاناتي", value: "2", icon: FileText },
            { label: "صور مرفوعة", value: "24", icon: Image },
            { label: "تفاوضات نشطة", value: "1", icon: MessageCircle },
            { label: "تنبيهات", value: "3", icon: AlertCircle },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-1.5 mb-2">
                <stat.icon size={14} strokeWidth={1.3} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-lg font-medium">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl p-5 shadow-soft mb-6">
          <h2 className="text-sm font-medium mb-3">التنبيهات</h2>
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <div key={i} className={cn(
                "flex items-start gap-2 p-3 rounded-xl text-xs",
                n.type === "success" ? "bg-success/5" : n.type === "warning" ? "bg-warning/5" : "bg-accent/30"
              )}>
                <span className={cn(
                  "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                  n.type === "success" ? "bg-success" : n.type === "warning" ? "bg-warning" : "bg-primary"
                )} />
                <span className="text-muted-foreground">{n.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all active:scale-[0.97]",
                activeTab === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Listings Tab */}
        {activeTab <= 1 && (
          <div className="space-y-3">
            {myListings
              .filter(l => activeTab === 0 ? l.status === "نشط" : l.status === "مسودة")
              .map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="flex items-center justify-between p-4 bg-card rounded-xl shadow-soft hover:shadow-soft-lg transition-all"
              >
                <div>
                  <div className="text-sm">{listing.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{listing.city} — إفصاح {listing.disclosure}%</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md",
                    listing.status === "نشط" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  )}>{listing.status}</span>
                  <ChevronLeft size={14} strokeWidth={1.3} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
            {activeTab === 0 && (
              <Link
                to="/create-listing"
                className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors text-sm"
              >
                + إضافة إعلان جديد
              </Link>
            )}
          </div>
        )}

        {/* Negotiations Tab */}
        {activeTab === 2 && (
          <div className="space-y-3">
            {negotiations.map((neg) => (
              <Link
                key={neg.id}
                to={`/negotiate/${neg.id}`}
                className="flex items-center justify-between p-4 bg-card rounded-xl shadow-soft hover:shadow-soft-lg transition-all"
              >
                <div>
                  <div className="text-sm">{neg.listing}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{neg.lastMessage}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{neg.time}</span>
                  {neg.unread && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Agreements Tab */}
        {activeTab === 3 && (
          <div className="space-y-3">
            <Link
              to="/agreement/1"
              className="flex items-center justify-between p-4 bg-card rounded-xl shadow-soft hover:shadow-soft-lg transition-all"
            >
              <div>
                <div className="text-sm">مطعم شاورما مجهّز بالكامل</div>
                <div className="text-[11px] text-muted-foreground mt-1">بانتظار التأكيد</div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} strokeWidth={1.3} className="text-warning" />
                <ChevronLeft size={14} strokeWidth={1.3} className="text-muted-foreground" />
              </div>
            </Link>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 4 && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 p-8 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors cursor-pointer">
              <Upload size={18} strokeWidth={1.3} />
              <span className="text-sm">رفع ملفات جديدة</span>
            </div>
            {[
              { name: "عقد الإيجار.pdf", type: "عقد", status: "تم التحليل", date: "2026-03-20" },
              { name: "رخصة البلدية.pdf", type: "ترخيص", status: "بانتظار التحليل", date: "2026-03-19" },
              { name: "السجل التجاري.pdf", type: "هوية", status: "تم التحليل", date: "2026-03-18" },
            ].map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card rounded-xl shadow-soft">
                <div className="flex items-center gap-3">
                  <FolderOpen size={16} strokeWidth={1.3} className="text-muted-foreground" />
                  <div>
                    <div className="text-sm">{file.name}</div>
                    <div className="text-[10px] text-muted-foreground">{file.type} — {file.date}</div>
                  </div>
                </div>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                  file.status === "تم التحليل" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>{file.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 5 && (
          <div className="space-y-3">
            <button
              className="w-full px-4 py-3 rounded-xl text-sm text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              + تقديم شكوى أو استفسار جديد
            </button>
            {[
              { title: "استفسار عن مدة التحليل", status: "محلول", date: "2026-03-18" },
            ].map((ticket, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card rounded-xl shadow-soft">
                <div>
                  <div className="text-sm">{ticket.title}</div>
                  <div className="text-[10px] text-muted-foreground">{ticket.date}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-success/10 text-success">{ticket.status}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border/50">
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-xl text-xs text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
