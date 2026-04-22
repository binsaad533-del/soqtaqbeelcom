import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccessRequests, type AccessRequestRecord } from "@/hooks/useAccessRequests";
import { useSEO } from "@/hooks/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  X,
  Clock,
  User,
  FileText,
  ExternalLink,
  Inbox,
  ShieldCheck,
  ShieldX,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import SarSymbol from "@/components/SarSymbol";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

const RequestCard = ({
  request,
  variant,
  onApprove,
  onReject,
  isApproving,
}: {
  request: AccessRequestRecord;
  variant: "pending" | "approved" | "rejected";
  onApprove?: (id: string) => void;
  onReject?: (req: AccessRequestRecord) => void;
  isApproving?: boolean;
}) => {
  const initials = (request.requester_name || "؟")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header: requester */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
              {request.requester_avatar ? (
                <img src={request.requester_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                initials || <User size={16} strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {request.requester_name || "مستخدم"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={10} strokeWidth={1.5} />
                {timeAgo(request.created_at)}
              </p>
            </div>
          </div>

          {variant === "pending" && (
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0">
              قيد المراجعة
            </Badge>
          )}
          {variant === "approved" && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shrink-0">
              معتمد
            </Badge>
          )}
          {variant === "rejected" && (
            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              {request.status === "expired" ? "منتهي" : "مرفوض"}
            </Badge>
          )}
        </div>

        {/* Listing */}
        <Link
          to={`/listing/${request.listing_id}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
        >
          <FileText size={14} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {request.listing_title || "إعلان بدون عنوان"}
            </p>
            {request.listing_price ? (
              <p className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                {Number(request.listing_price).toLocaleString("en-US")} <SarSymbol size={9} />
                {request.listing_city && <span className="text-muted-foreground/60">· {request.listing_city}</span>}
              </p>
            ) : null}
          </div>
          <ExternalLink size={12} className="text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0" />
        </Link>

        {/* Buyer message */}
        {request.request_message && (
          <div className="px-3 py-2 rounded-lg bg-background border border-border/50">
            <p className="text-[10px] text-muted-foreground/70 mb-1">رسالة المشتري:</p>
            <p className="text-xs text-foreground leading-relaxed">"{request.request_message}"</p>
          </div>
        )}

        {/* Rejection reason */}
        {variant === "rejected" && request.rejection_reason && (
          <div className="px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/15">
            <p className="text-[10px] text-destructive/70 mb-1">سبب الرفض:</p>
            <p className="text-xs text-foreground leading-relaxed">{request.rejection_reason}</p>
          </div>
        )}

        {/* Approval expiry */}
        {variant === "approved" && request.access_expires_at && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar size={10} strokeWidth={1.5} />
            ينتهي الوصول في {new Date(request.access_expires_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}

        {/* Actions */}
        {variant === "pending" && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onApprove?.(request.id)}
              disabled={isApproving}
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Check size={14} strokeWidth={2} className="mr-1" />
              موافقة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject?.(request)}
              disabled={isApproving}
              className="flex-1 h-9 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
            >
              <X size={14} strokeWidth={2} className="mr-1" />
              رفض
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="py-16 text-center">
    <Icon size={32} className="mx-auto mb-3 text-muted-foreground/30" strokeWidth={1.25} />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

const SellerAccessRequestsPage = () => {
  const { pending, approved, rejected, isLoading, approve, reject, isApproving, isRejecting } =
    useAccessRequests();

  const [rejectTarget, setRejectTarget] = useState<AccessRequestRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useSEO({
    title: "طلبات الوصول للوثائق | سوق تقبيل",
    description: "إدارة طلبات الوصول للوثائق المحمية على إعلاناتك",
    canonical: "/seller-dashboard/access-requests",
  });

  const handleApprove = async (id: string) => {
    try {
      await approve(id);
      toast.success("تم اعتماد الطلب — يمكن للمشتري الآن الاطلاع على الوثائق");
    } catch (err) {
      console.error("[AccessRequests] approve error", err);
      toast.error("تعذّر اعتماد الطلب — حاول مجدداً");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    try {
      await reject({ requestId: rejectTarget.id, reason: rejectReason });
      toast.success("تم رفض الطلب");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      console.error("[AccessRequests] reject error", err);
      toast.error("تعذّر رفض الطلب — حاول مجدداً");
    }
  };

  const tabsConfig = useMemo(
    () => [
      { key: "pending", label: "قيد المراجعة", count: pending.length, items: pending, variant: "pending" as const },
      { key: "approved", label: "الموافق عليها", count: approved.length, items: approved, variant: "approved" as const },
      { key: "rejected", label: "المرفوضة", count: rejected.length, items: rejected, variant: "rejected" as const },
    ],
    [pending, approved, rejected],
  );

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox size={20} strokeWidth={1.5} className="text-primary" />
              طلبات الوصول للوثائق
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              إدارة طلبات المشترين للاطلاع على الوثائق المحمية في إعلاناتك
            </p>
          </div>
          <Link
            to="/seller-dashboard"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
          >
            <ArrowLeft size={12} /> لوحة البائع
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            {tabsConfig.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1.5">
                {t.label}
                {t.count > 0 && (
                  <span
                    className={`min-w-[18px] h-[18px] rounded-full text-[10px] flex items-center justify-center px-1 font-semibold ${
                      t.key === "pending"
                        ? "bg-amber-500/20 text-amber-700"
                        : t.key === "approved"
                          ? "bg-emerald-500/20 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabsConfig.map((t) => (
            <TabsContent key={t.key} value={t.key} className="space-y-3 mt-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </>
              ) : t.items.length === 0 ? (
                <EmptyState
                  icon={
                    t.key === "pending" ? Inbox : t.key === "approved" ? ShieldCheck : ShieldX
                  }
                  label={
                    t.key === "pending"
                      ? "لا توجد طلبات قيد المراجعة"
                      : t.key === "approved"
                        ? "لا توجد طلبات موافق عليها"
                        : "لا توجد طلبات مرفوضة"
                  }
                />
              ) : (
                t.items.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    variant={t.variant}
                    onApprove={handleApprove}
                    onReject={(req) => setRejectTarget(req)}
                    isApproving={isApproving || isRejecting}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Reject dialog */}
        <Dialog
          open={!!rejectTarget}
          onOpenChange={(o) => {
            if (!o) {
              setRejectTarget(null);
              setRejectReason("");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">رفض طلب الوصول</DialogTitle>
              <DialogDescription className="text-right text-xs">
                يمكنك إضافة سبب موجز للرفض (اختياري) — سيُعرض للمشتري.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="مثال: الإعلان قيد المراجعة، أو الوثائق غير جاهزة بعد..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value.slice(0, 300))}
              rows={4}
              className="text-sm resize-none"
              dir="rtl"
            />
            <p className="text-[10px] text-muted-foreground text-left tabular-nums">
              {rejectReason.length}/300
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={isRejecting}
                className="text-xs"
              >
                <X size={14} strokeWidth={2} className="mr-1" />
                تأكيد الرفض
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SellerAccessRequestsPage;
