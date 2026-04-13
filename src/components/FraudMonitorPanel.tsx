import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Ban, Eye, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FraudFlag {
  id: string;
  user_id: string;
  listing_id: string | null;
  flag_type: string;
  severity: string;
  details: any;
  status: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
  critical: { label: "حرج", color: "text-destructive bg-destructive/10 border-destructive/20", icon: ShieldAlert },
  high: { label: "عالي", color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20", icon: AlertTriangle },
  medium: { label: "متوسط", color: "text-warning bg-warning/10 border-warning/20", icon: Shield },
  low: { label: "منخفض", color: "text-muted-foreground bg-muted/50 border-border", icon: Shield },
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  duplicate_images: "صور مكررة",
  duplicate_text: "نص مكرر",
  spam_listing: "إعلانات متكررة (سبام)",
  suspicious_account: "حساب مشبوه",
  abnormal_pricing: "تسعير غير منطقي",
  rapid_messaging: "رسائل سريعة",
  new_account_publish: "حساب جديد ينشر",
  multi_account_ip: "حسابات متعددة من نفس IP",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلّق", color: "bg-warning/10 text-warning" },
  reviewed: { label: "تمت المراجعة", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20" },
  dismissed: { label: "مرفوض", color: "bg-muted/50 text-muted-foreground" },
  confirmed: { label: "مؤكد", color: "bg-destructive/10 text-destructive" },
};

interface Props {
  profiles: Array<{ user_id: string; full_name: string | null }>;
}

const FraudMonitorPanel = ({ profiles }: Props) => {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getProfileName = useCallback((userId: string | null) => {
    if (!userId) return "—";
    return profiles.find(p => p.user_id === userId)?.full_name || userId.slice(0, 8);
  }, [profiles]);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fraud_flags")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setFlags((data as FraudFlag[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  const handleAction = async (flagId: string, action: "confirmed" | "dismissed") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("fraud_flags")
      .update({ status: action, reviewed_by: user?.id || null } as any)
      .eq("id", flagId);

    if (error) {
      toast.error("حدث خطأ");
      return;
    }

    if (action === "confirmed") {
      const flag = flags.find(f => f.id === flagId);
      if (flag) {
        // Suspend user account
        await supabase.from("profiles").update({ is_suspended: true, is_active: false, fraud_score: 100 } as any).eq("user_id", flag.user_id);
        // Unpublish their listings
        await supabase.from("listings").update({ status: "draft", deleted_at: new Date().toISOString() } as any).eq("owner_id", flag.user_id).eq("status", "published");
        toast.success("تم تأكيد الاحتيال وتعليق الحساب");
      }
    } else {
      toast.success("تم رفض التنبيه");
    }

    loadFlags();
    setExpandedId(null);
  };

  const filtered = flags.filter(f => {
    if (filterStatus === "pending" && f.status !== "pending") return false;
    if (filterStatus === "resolved" && f.status === "pending") return false;
    if (filterType && f.flag_type !== filterType) return false;
    if (filterSeverity && f.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = getProfileName(f.user_id).toLowerCase();
      return name.includes(q) || f.flag_type.includes(q) || f.listing_id?.includes(q);
    }
    return true;
  });

  const pendingCount = flags.filter(f => f.status === "pending").length;
  const criticalCount = flags.filter(f => f.severity === "critical" && f.status === "pending").length;
  const highCount = flags.filter(f => f.severity === "high" && f.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border/50 p-3">
          <div className="text-xl font-bold text-foreground">{flags.length}</div>
          <div className="text-[10px] text-muted-foreground">إجمالي التنبيهات</div>
        </div>
        <div className="bg-card rounded-xl border border-destructive/20 p-3">
          <div className="text-xl font-bold text-destructive">{pendingCount}</div>
          <div className="text-[10px] text-muted-foreground">معلّقة</div>
        </div>
        <div className="bg-card rounded-xl border border-destructive/30 p-3">
          <div className="text-xl font-bold text-destructive">{criticalCount}</div>
          <div className="text-[10px] text-muted-foreground">حرجة</div>
        </div>
        <div className="bg-card rounded-xl border border-orange-200 p-3">
          <div className="text-xl font-bold text-orange-600">{highCount}</div>
          <div className="text-[10px] text-muted-foreground">عالية</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-8 text-xs h-8" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="text-xs h-8 rounded-lg border border-border bg-background px-2">
          <option value="all">كل الحالات</option>
          <option value="pending">معلّقة</option>
          <option value="resolved">محلولة</option>
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="text-xs h-8 rounded-lg border border-border bg-background px-2">
          <option value="">كل الخطورات</option>
          <option value="critical">حرج</option>
          <option value="high">عالي</option>
          <option value="medium">متوسط</option>
          <option value="low">منخفض</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs h-8 rounded-lg border border-border bg-background px-2">
          <option value="">كل الأنواع</option>
          {Object.entries(FLAG_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Flags list */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <ShieldCheck className="mx-auto mb-2 text-green-500" size={28} />
          <p className="text-xs text-muted-foreground">لا توجد تنبيهات احتيال</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(flag => {
            const sev = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
            const status = STATUS_LABELS[flag.status] || STATUS_LABELS.pending;
            const SevIcon = sev.icon;
            const isExpanded = expandedId === flag.id;

            return (
              <div key={flag.id} className={cn("bg-card rounded-xl border overflow-hidden", sev.color.split(" ")[2])}>
                <button onClick={() => setExpandedId(isExpanded ? null : flag.id)} className="w-full flex items-center gap-2 p-3 text-right">
                  <SevIcon size={15} className={sev.color.split(" ")[0]} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-xs font-medium">{FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", sev.color)}>{sev.label}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", status.color)}>{status.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      المستخدم: {getProfileName(flag.user_id)}
                      {flag.listing_id && ` — إعلان #${flag.listing_id.slice(0, 6)}`}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {new Date(flag.created_at).toLocaleDateString("en-US")}
                  </span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50 p-3 space-y-3">
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[10px] font-medium mb-1">التفاصيل</p>
                      <pre className="text-[9px] text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(flag.details, null, 2)}
                      </pre>
                    </div>

                    {flag.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleAction(flag.id, "confirmed")} className="gap-1 text-[10px] h-7">
                          <Ban size={11} /> تأكيد احتيال
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(flag.id, "dismissed")} className="gap-1 text-[10px] h-7">
                          <Eye size={11} /> رفض (false positive)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FraudMonitorPanel;
