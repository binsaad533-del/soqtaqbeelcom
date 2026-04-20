import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  size?: "sm" | "md";
  className?: string;
}

// Cache phone-verified user IDs in memory to avoid repeated queries.
// Source of truth: profiles.phone_verified (set by the OTP verification flow).
const verifiedCache = new Map<string, boolean>();

export function useVerifiedSellers(userIds: string[]) {
  const [verified, setVerified] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userIds.length === 0) return;
    const uncached = userIds.filter(id => !verifiedCache.has(id));
    const alreadyVerified = new Set(userIds.filter(id => verifiedCache.get(id) === true));

    if (uncached.length === 0) {
      setVerified(alreadyVerified);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, phone_verified")
        .in("user_id", uncached);

      const verifiedIds = new Set(
        (data || []).filter((r: any) => r.phone_verified === true).map((r: any) => r.user_id)
      );
      uncached.forEach(id => verifiedCache.set(id, verifiedIds.has(id)));
      const combined = new Set([...alreadyVerified, ...verifiedIds]);
      setVerified(combined);
    })();
  }, [userIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return verified;
}

const VerifiedSellerBadge = ({ userId, size = "sm", className }: Props) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(verifiedCache.get(userId) ?? null);

  useEffect(() => {
    if (verifiedCache.has(userId)) {
      setIsVerified(verifiedCache.get(userId)!);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("user_id", userId)
        .maybeSingle();
      const result = data?.phone_verified === true;
      verifiedCache.set(userId, result);
      setIsVerified(result);
    })();
  }, [userId]);

  if (!isVerified) return null;

  const iconSize = size === "sm" ? 12 : 16;

  return (
    <span
      title="جوال موثّق ✓"
      className={cn("inline-flex items-center text-primary", className)}
    >
      <Phone size={iconSize} className="text-primary" />
    </span>
  );
};

export default VerifiedSellerBadge;
