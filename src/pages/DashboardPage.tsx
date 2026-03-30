import { Link } from "react-router-dom";
import { FileText, Image, MessageCircle, AlertCircle, Check, Clock, ChevronLeft } from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";

const tabs = ["إعلاناتي", "المسودات", "التفاوضات", "الاتفاقيات"];

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

import { useState } from "react";

const DashboardPage = () => {
  useSEO({ title: "لوحة التحكم", description: "أدِر إعلاناتك وصفقاتك من لوحة تحكم سوق تقبيل", canonical: "/dashboard" });
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="py-8">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground">مرحباً بك — إليك ملخص نشاطك</p>
          </div>
          <AiStar size={28} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "إعلاناتي", value: "2", icon: FileText },
            { label: "صور مرفوعة", value: "24", icon: Image },
            { label: "تفاوضات نشطة", value: "1", icon: MessageCircle },
            { label: "تنبيهات", value: "3", icon: AlertCircle },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={16} strokeWidth={1.3} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-xl font-medium">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl p-5 shadow-soft mb-8">
          <h2 className="font-medium text-sm mb-3">التنبيهات</h2>
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <div key={i} className={cn(
                "flex items-start gap-2 p-3 rounded-xl text-sm",
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
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all active:scale-[0.97]",
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
                  <div className="font-medium text-sm">{listing.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{listing.city} — إفصاح {listing.disclosure}%</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-md",
                    listing.status === "نشط" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  )}>
                    {listing.status}
                  </span>
                  <ChevronLeft size={16} strokeWidth={1.3} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
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
                  <div className="font-medium text-sm">{neg.listing}</div>
                  <div className="text-xs text-muted-foreground mt-1">{neg.lastMessage}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{neg.time}</span>
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
                <div className="font-medium text-sm">مطعم شاورما مجهّز بالكامل</div>
                <div className="text-xs text-muted-foreground mt-1">بانتظار التأكيد</div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} strokeWidth={1.3} className="text-warning" />
                <ChevronLeft size={16} strokeWidth={1.3} className="text-muted-foreground" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
