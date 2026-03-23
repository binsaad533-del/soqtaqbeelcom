import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { startSessionTimeout, logAudit } from "@/lib/security";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const SessionGuard = () => {
  const { user, signOut } = useAuthContext();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!user) return;

    const cleanup = startSessionTimeout(
      () => setShowWarning(true),
      async () => {
        await logAudit("session_timeout", "auth", user.id);
        await signOut();
      }
    );

    // Log login
    logAudit("login", "auth", user.id);

    return cleanup;
  }, [user, signOut]);

  if (!user) return null;

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="text-warning" size={20} />
            <DialogTitle>انتهاء الجلسة قريباً</DialogTitle>
          </div>
          <DialogDescription>
            سيتم تسجيل خروجك تلقائياً خلال دقيقتين بسبب عدم النشاط
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => setShowWarning(false)} className="w-full">
          أنا هنا — تمديد الجلسة
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SessionGuard;
