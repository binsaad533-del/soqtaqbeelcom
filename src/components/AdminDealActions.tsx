import { useState } from "react";
import { ShieldAlert, Play, Trash2, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminDealActionsProps {
  deal: {
    id: string;
    status: string;
    buyer_id?: string | null;
    seller_id?: string | null;
    listing_id: string;
  };
  onUpdate: () => void;
}

type ActionType = "suspend" | "activate" | "delete" | null;

const AdminDealActions = ({ deal, onUpdate }: AdminDealActionsProps) => {
  const [action, setAction] = useState<ActionType>(null);
  const [reason, setReason] = useState("");
  const [sendNotif, setSendNotif] = useState(true);
  const [loading, setLoading] = useState(false);

  const isSuspended = deal.status === "suspended";
  const isCancelled = deal.status === "cancelled";

  const notify = async (title: string, body: string) => {
    if (!sendNotif) return;
    const userIds = [deal.buyer_id, deal.seller_id].filter(Boolean) as string[];
    for (const uid of userIds) {
      await supabase.from("notifications").insert({
        user_id: uid,
        title,
        body,
        type: "warning",
        reference_type: "deal",
        reference_id: deal.id,
      });
    }
  };

  const handleSuspend = async () => {
    setLoading(true);
    const { error } = await supabase.from("deals").update({ status: "suspended" }).eq("id", deal.id);
    if (error) { toast.error("فشل تعليق الصفقة"); setLoading(false); return; }
    // Hide the associated listing from marketplace
    await supabase.from("listings").update({ status: "suspended" }).eq("id", deal.listing_id);
    await notify("⚠️ تم تعليق صفقتك", reason || "تم تعليق الصفقة من قبل إدارة المنصة.");
    await supabase.from("audit_logs").insert({
      action: "deal_suspended",
      resource_type: "deal",
      resource_id: deal.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      details: { reason },
    });
    toast.success("تم تعليق الصفقة");
    setAction(null);
    setReason("");
    setLoading(false);
    onUpdate();
  };

  const handleActivate = async () => {
    setLoading(true);
    const { error } = await supabase.from("deals").update({ status: "negotiating" }).eq("id", deal.id);
    if (error) { toast.error("فشل تنشيط الصفقة"); setLoading(false); return; }
    // Restore the listing to published
    await supabase.from("listings").update({ status: "published" }).eq("id", deal.listing_id);
    await notify("✅ تم تنشيط صفقتك", reason || "تم إعادة تنشيط الصفقة من قبل إدارة المنصة.");
    await supabase.from("audit_logs").insert({
      action: "deal_activated",
      resource_type: "deal",
      resource_id: deal.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      details: { reason },
    });
    toast.success("تم تنشيط الصفقة");
    setAction(null);
    setReason("");
    setLoading(false);
    onUpdate();
  };

  const handleDelete = async () => {
    setLoading(true);
    // Cancel the deal and restore the listing
    const { error } = await supabase.from("deals").update({ status: "cancelled" }).eq("id", deal.id);
    if (error) { toast.error("فشل حذف الصفقة"); setLoading(false); return; }
    await supabase.from("listings").update({ status: "published" }).eq("id", deal.listing_id);
    await supabase.from("listing_offers").update({ status: "pending" }).eq("listing_id", deal.listing_id).eq("status", "accepted");
    await notify("🚫 تم إلغاء صفقتك", reason || "تم إلغاء الصفقة من قبل إدارة المنصة.");
    await supabase.from("audit_logs").insert({
      action: "deal_deleted_by_admin",
      resource_type: "deal",
      resource_id: deal.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      details: { reason },
    });
    toast.success("تم إلغاء الصفقة وإعادة الإعلان للعرض");
    setAction(null);
    setReason("");
    setLoading(false);
    onUpdate();
  };

  if (isCancelled) return null;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/20">
      <h3 className="font-semibold text-xs mb-3 flex items-center gap-2 text-destructive">
        <ShieldAlert size={14} strokeWidth={1.5} />
        إجراءات إدارية
      </h3>

      {!action && (
        <div className="flex flex-col gap-2">
          {!isSuspended ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs border-warning/30 text-warning hover:bg-warning/5"
              onClick={() => setAction("suspend")}
            >
              <ShieldAlert size={13} strokeWidth={1.5} />
              تعليق الصفقة
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs border-success/30 text-success hover:bg-success/5"
              onClick={() => setAction("activate")}
            >
              <Play size={13} strokeWidth={1.5} />
              إعادة تنشيط الصفقة
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => setAction("delete")}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            إلغاء وحذف الصفقة
          </Button>
        </div>
      )}

      {action && (
        <div className="space-y-3">
          <div className={cn(
            "text-[11px] font-medium px-2 py-1 rounded-lg",
            action === "suspend" ? "bg-warning/10 text-warning" :
            action === "activate" ? "bg-success/10 text-success" :
            "bg-destructive/10 text-destructive"
          )}>
            {action === "suspend" ? "تعليق الصفقة" :
             action === "activate" ? "إعادة تنشيط الصفقة" :
             "إلغاء وحذف الصفقة"}
          </div>

          <Textarea
            placeholder="سبب الإجراء (اختياري — سيُرسل كإشعار لأطراف الصفقة)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="text-xs min-h-[60px] rounded-xl"
          />

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={sendNotif}
              onChange={e => setSendNotif(e.target.checked)}
              className="rounded"
            />
            <Bell size={12} strokeWidth={1.5} />
            إرسال إشعار لأطراف الصفقة
          </label>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs rounded-xl"
              onClick={() => { setAction(null); setReason(""); }}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className={cn(
                "flex-1 text-xs rounded-xl",
                action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" :
                action === "suspend" ? "bg-warning text-warning-foreground hover:bg-warning/90" :
                "bg-success text-success-foreground hover:bg-success/90"
              )}
              onClick={action === "suspend" ? handleSuspend : action === "activate" ? handleActivate : handleDelete}
              disabled={loading}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : "تأكيد"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDealActions;
