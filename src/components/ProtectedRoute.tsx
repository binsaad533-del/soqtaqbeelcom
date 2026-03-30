import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, requireAuth = true }: Props) => {
  const { user, role, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    const from = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?redirect=auth_required&from=${from}`} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
