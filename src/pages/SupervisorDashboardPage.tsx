import { useAuthContext } from "@/contexts/AuthContext";
import {
  FileText, MessageCircle, AlertCircle, ChevronLeft, Clock, Check,
  Search, FolderOpen, ArrowUp, Bell
} from "lucide-react";
import AiStar from "@/components/AiStar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = [
  { label: "المهام", icon: FolderOpen },
  { label: "الإعلانات", icon: FileText },
  { label: "التفاوضات", icon: MessageCircle },
  { label: "الشكاوى", icon: AlertCircle },
];

const assignedCases = [
  { id: "1", title: "مراجعة إعلان مطعم الشاورما", type: "مراجعة", status: "قيد المعالجة", priority: "عالية", date: "2026-03-22" },
  { id: "2", title: "شكوى عميل بخصوص صور مفقودة", type: "شكوى", status: "مفتوح", priority: "متوسطة", date: "2026-03-21" },
  { id: "3", title: "متابعة تفاوض كافيه الروضة", type: "تفاوض", status: "بانتظار الرد", priority: "عالية", date: "2026-03-20" },
  { id: "4", title: "التحقق من مستندات ترخيص", type: "مستندات", status: "مكتمل", priority: "منخفضة", date: "2026-03-19" },
];

const stats = [
  { label: "مهام مسندة", value: "12", icon: FolderOpen },
  { label: "مفتوحة", value: "5", icon: Clock, color: "warning" },
  { label: "مكتملة", value: "7", icon: Check, color: "success" },
  { label: "بانتظار العميل", value: "3", icon: AlertCircle },
];

const SupervisorDashboardPage = () => {
  const { profile, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="py-6">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">لوحة المشرف</h1>
            <p className="text-xs text-muted-foreground mt-1">
              مرحباً {profile?.full_name || "المشرف"} — إليك مهامك المسندة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Bell size={18} strokeWidth={1.3} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
            </button>
            <AiStar size={24} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-soft">
              <div className="flex items-center gap-1.5 mb-2">
                <stat.icon size={14} strokeWidth={1.3} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
              <span className={cn("text-lg font-medium", stat.color ? `text-${stat.color}` : "")}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
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

        {/* Cases List */}
        <div className="bg-card rounded-2xl p-5 shadow-soft space-y-2">
          {assignedCases
            .filter((c) => {
              if (activeTab === 0) return true;
              if (activeTab === 1) return c.type === "مراجعة" || c.type === "مستندات";
              if (activeTab === 2) return c.type === "تفاوض";
              if (activeTab === 3) return c.type === "شكوى";
              return true;
            })
            .map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/20 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="text-sm">{c.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground">{c.type}</span>
                  <span className="text-[10px] text-muted-foreground">{c.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                  c.priority === "عالية" ? "bg-destructive/10 text-destructive" :
                  c.priority === "متوسطة" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                )}>{c.priority}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-md",
                  c.status === "مكتمل" ? "bg-success/10 text-success" :
                  c.status === "مفتوح" ? "bg-warning/10 text-warning" :
                  c.status === "قيد المعالجة" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                )}>{c.status}</span>
                {c.status !== "مكتمل" && (
                  <button className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="تصعيد">
                    <ArrowUp size={14} strokeWidth={1.3} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border/50">
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

export default SupervisorDashboardPage;
