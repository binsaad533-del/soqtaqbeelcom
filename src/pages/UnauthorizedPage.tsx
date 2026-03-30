import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const UnauthorizedPage = () => {
  useSEO({ title: "غير مصرّح", description: "ليس لديك صلاحية للوصول لهذه الصفحة" });
  return (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <ShieldX size={48} strokeWidth={1} className="mx-auto text-destructive/50 mb-4" />
      <h1 className="text-xl font-medium mb-2">غير مصرّح</h1>
      <p className="text-sm text-muted-foreground mb-6">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      <Link
        to="/dashboard"
        className="px-6 py-2.5 rounded-xl text-sm text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        العودة للوحة التحكم
      </Link>
    </div>
  </div>
);

export default UnauthorizedPage;
