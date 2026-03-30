import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  size?: "sm" | "md";
  className?: string;
}

// Cache verified seller IDs in memory to avoid repeated queries
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
        .from("seller_verifications")
        .select("user_id")
        .in("user_id", uncached)
        .eq("verification_status", "approved");

      const approvedIds = new Set((data || []).map((r: any) => r.user_id));
      uncached.forEach(id => verifiedCache.set(id, approvedIds.has(id)));
      const combined = new Set([...alreadyVerified, ...approvedIds]);
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
        .from("seller_verifications")
        .select("id")
        .eq("user_id", userId)
        .eq("verification_status", "approved")
        .limit(1)
        .maybeSingle();
      const result = !!data;
      verifiedCache.set(userId, result);
      setIsVerified(result);
    })();
  }, [userId]);

  if (!isVerified) return null;

  const iconSize = size === "sm" ? 12 : 16;

  return (
    <span
      title="بائع موثق ✓"
      className={cn("inline-flex items-center text-primary", className)}
    >
      <BadgeCheck size={iconSize} className="fill-primary text-primary-foreground" />
    </span>
  );
};

export default VerifiedSellerBadge;
