import { Shield, ShieldCheck, ShieldAlert, ShieldX, Award, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  score: number;
  verificationLevel?: string;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showBadges?: boolean;
  badges?: string[];
  className?: string;
}

// Returns a stable level key (not a translated label) so callers can translate at render time.
export const getTrustLevel = (score: number) => {
  if (score >= 85) return { key: "veryTrusted", color: "text-primary", bg: "bg-primary/10", Icon: ShieldCheck };
  if (score >= 70) return { key: "trusted", color: "text-emerald-600", bg: "bg-emerald-600/10", Icon: ShieldCheck };
  if (score >= 50) return { key: "medium", color: "text-muted-foreground", bg: "bg-muted/50", Icon: Shield };
  return { key: "low", color: "text-foreground/50", bg: "bg-muted/30", Icon: ShieldAlert };
};

export const SELLER_BADGE_KEYS: Record<string, { tKey: string; icon: typeof Award }> = {
  trusted_seller: { tKey: "trustedSeller", icon: ShieldCheck },
  commission_paid: { tKey: "commissionPaid", icon: Award },
  complete_data: { tKey: "completeData", icon: Star },
  successful_deals: { tKey: "successfulDeals", icon: Award },
};

export function getSellerBadges(profile: {
  trust_score: number;
  completed_deals: number;
  is_verified: boolean;
  verification_level: string;
}, commissionsPaid?: number, commissionsTotal?: number): string[] {
  const badges: string[] = [];
  if (profile.trust_score >= 70) badges.push("trusted_seller");
  if (commissionsPaid !== undefined && commissionsTotal !== undefined && commissionsTotal > 0 && commissionsPaid === commissionsTotal) {
    badges.push("commission_paid");
  }
  if (profile.is_verified && profile.verification_level === "full") badges.push("complete_data");
  if (profile.completed_deals >= 3) badges.push("successful_deals");
  return badges;
}

const sizeMap = {
  sm: { icon: 12, text: "text-[10px]", px: "px-1.5 py-0.5", gap: "gap-1", badge: "text-[9px] px-1 py-0.5" },
  md: { icon: 14, text: "text-xs", px: "px-2 py-1", gap: "gap-1.5", badge: "text-[10px] px-1.5 py-0.5" },
  lg: { icon: 16, text: "text-sm", px: "px-3 py-1.5", gap: "gap-2", badge: "text-xs px-2 py-1" },
};

const TrustBadge = ({
  score,
  verificationLevel = "none",
  size = "sm",
  showScore = false,
  showBadges = false,
  badges = [],
  className,
}: TrustBadgeProps) => {
  const { t } = useTranslation();
  const trust = getTrustLevel(score);
  const s = sizeMap[size];
  const trustLabel = t(`trustBadge.level.${trust.key}`);
  const verificationLabel =
    verificationLevel !== "none"
      ? t(`trustBadge.verification.${verificationLevel === "full" || verificationLevel === "basic" || verificationLevel === "phone" ? verificationLevel : "none"}`)
      : "";

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("inline-flex items-center rounded-lg", s.gap, s.px, trust.bg)}>
        <trust.Icon size={s.icon} className={trust.color} strokeWidth={1.5} />
        <span className={cn(s.text, trust.color, "font-medium")}>{trustLabel}</span>
        {showScore && <span className={cn(s.text, "text-muted-foreground")}>({score}%)</span>}
        {verificationLevel !== "none" && (
          <span className={cn(s.text, "text-muted-foreground border-r border-border/50 pr-1.5 mr-0.5")}>
            {verificationLabel}
          </span>
        )}
      </div>
      {showBadges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map(badgeKey => {
            const badge = SELLER_BADGE_KEYS[badgeKey];
            if (!badge) return null;
            return (
              <span
                key={badgeKey}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md bg-primary/5 text-primary border border-primary/10",
                  s.badge
                )}
              >
                <badge.icon size={10} strokeWidth={1.5} />
                {t(`trustBadge.sellerBadges.${badge.tKey}`)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrustBadge;
