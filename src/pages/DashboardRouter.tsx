import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import OwnerDashboardPage from "./OwnerDashboardPage";
import SupervisorDashboardPage from "./SupervisorDashboardPage";
import CustomerDashboardPage from "./CustomerDashboardPage";

const DashboardRouter = () => {
  const { role, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  switch (role) {
    case "platform_owner":
      return <OwnerDashboardPage />;
    case "supervisor":
      return <SupervisorDashboardPage />;
    case "financial_manager":
      return <Navigate to="/admin/finance" replace />;
    case "customer":
    default:
      return <CustomerDashboardPage />;
  }
};

export default DashboardRouter;
