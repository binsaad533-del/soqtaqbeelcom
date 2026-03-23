import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck } from "lucide-react";
import { reAuthenticate } from "@/lib/security";
import { useAuthContext } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionLabel?: string;
}

const ReAuthDialog = ({ open, onClose, onSuccess, actionLabel }: Props) => {
  const { user } = useAuthContext();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setError("");
    setLoading(true);

    const success = await reAuthenticate(user.email, password);
    if (success) {
      setPassword("");
      onSuccess();
    } else {
      setError("كلمة المرور غير صحيحة");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <DialogTitle>تأكيد الهوية</DialogTitle>
          </div>
          <DialogDescription>
            {actionLabel
              ? `هذا الإجراء (${actionLabel}) يتطلب إعادة التحقق من هويتك`
              : "يرجى إدخال كلمة المرور لتأكيد هويتك"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 text-right"
              autoFocus
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !password} className="flex-1">
              {loading ? "جاري التحقق..." : "تأكيد"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReAuthDialog;
