import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import PhoneVerificationFlow from "@/components/PhoneVerificationFlow";
import { Shield } from "lucide-react";

interface VerificationGateProps {
  children: React.ReactNode;
  /** Message shown when blocked */
  message?: string;
}

/**
 * Wraps content that requires phone verification.
 * Shows a verification flow instead of children if user is not verified.
 */
const VerificationGate = ({
  children,
  message = "يجب توثيق رقم جوالك قبل المتابعة",
}: VerificationGateProps) => {
  const { profile } = useAuthContext();
  const [verified, setVerified] = useState(false);

  const isPhoneVerified = !!(profile as any)?.phone_verified || verified;

  if (isPhoneVerified) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="rounded-2xl bg-card border border-border/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-warning">
          <Shield size={20} />
          <h2 className="text-sm font-semibold text-foreground">{message}</h2>
        </div>
        <PhoneVerificationFlow
          initialPhone={profile?.phone || ""}
          onVerified={() => setVerified(true)}
        />
      </div>
    </div>
  );
};

export default VerificationGate;
