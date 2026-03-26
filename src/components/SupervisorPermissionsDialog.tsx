import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PERMISSION_LABELS, type SupervisorPermissions } from "@/hooks/useSupervisorPermissions";
import { Shield, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userId: string;
  currentRole: string;
  existingPermissions?: SupervisorPermissions | null;
  onPromote: (userId: string, permissions: Record<string, boolean>) => Promise<void>;
  onDemote: (userId: string) => Promise<void>;
  onUpdatePermissions: (userId: string, permissions: Record<string, boolean>) => Promise<void>;
}

const PERMISSION_KEYS = ["manage_listings", "manage_deals", "manage_users", "manage_crm", "manage_reports", "manage_security"] as const;

const PERMISSION_ICONS: Record<string, string> = {
  manage_listings: "📋",
  manage_deals: "🤝",
  manage_users: "👥",
  manage_crm: "📞",
  manage_reports: "🚨",
  manage_security: "🔒",
};

export default function SupervisorPermissionsDialog({
  open, onOpenChange, userName, userId, currentRole,
  existingPermissions, onPromote, onDemote, onUpdatePermissions,
}: Props) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const isSupervisor = currentRole === "supervisor";

  useEffect(() => {
    if (existingPermissions) {
      const p: Record<string, boolean> = {};
      PERMISSION_KEYS.forEach(k => { p[k] = (existingPermissions as any)[k] || false; });
      setPermissions(p);
    } else {
      const p: Record<string, boolean> = {};
      PERMISSION_KEYS.forEach(k => { p[k] = true; });
      setPermissions(p);
    }
  }, [existingPermissions, open]);

  const toggleAll = (val: boolean) => {
    const p: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach(k => { p[k] = val; });
    setPermissions(p);
  };

  const allSelected = PERMISSION_KEYS.every(k => permissions[k]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isSupervisor) {
        await onUpdatePermissions(userId, permissions);
      } else {
        await onPromote(userId, permissions);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async () => {
    setSaving(true);
    try {
      await onDemote(userId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield size={18} className="text-primary" />
            {isSupervisor ? "تعديل صلاحيات المشرف" : "ترقية إلى مشرف"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              {userName?.charAt(0) || "?"}
            </div>
            <div>
              <div className="text-sm font-medium">{userName || "—"}</div>
              <div className="text-[11px] text-muted-foreground">
                {isSupervisor ? (
                  <span className="flex items-center gap-1"><UserCheck size={11} className="text-success" /> مشرف حالياً</span>
                ) : "عميل — سيتم ترقيته إلى مشرف"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">الصلاحيات</span>
            <button
              onClick={() => toggleAll(!allSelected)}
              className="text-[11px] text-primary hover:underline"
            >
              {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </button>
          </div>

          <div className="space-y-2">
            {PERMISSION_KEYS.map(key => (
              <div
                key={key}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  permissions[key] ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{PERMISSION_ICONS[key]}</span>
                  <Label htmlFor={key} className="text-sm cursor-pointer">{PERMISSION_LABELS[key]}</Label>
                </div>
                <Switch
                  id={key}
                  checked={permissions[key] || false}
                  onCheckedChange={(checked) => setPermissions(prev => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {isSupervisor && (
            <Button variant="destructive" size="sm" onClick={handleDemote} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              إزالة صلاحيات المشرف
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 flex-1">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
            {isSupervisor ? "حفظ التعديلات" : "ترقية وتعيين الصلاحيات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
