import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useListings, type Listing } from "@/hooks/useListings";
import { useSellerReviews, type SellerReview } from "@/hooks/useSellerReviews";
import { useListingSocial } from "@/hooks/useListingSocial";
import { useAuthContext } from "@/contexts/AuthContext";
import TrustBadge, { getSellerBadges, getVerificationLabel } from "@/components/TrustBadge";
import SellerReviewsSummary from "@/components/SellerReviewsSummary";
import SupervisorPermissionsDialog from "@/components/SupervisorPermissionsDialog";
import { useSupervisorPermissions, type SupervisorPermissions } from "@/hooks/useSupervisorPermissions";
import { useSEO } from "@/hooks/useSEO";
import SarSymbol from "@/components/SarSymbol";
import {
  MapPin, Calendar, Store, Eye, Heart, Loader2,
  Award, UserCheck, ArrowLeft, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t, DEAL_TYPE_LABELS } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SellerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProfile } = useProfiles();
  const { getPublishedListings } = useListings();
  const { getSellerReviews } = useSellerReviews();
  const { getLikesAndViews } = useListingSocial();
  const { user, role } = useAuthContext();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [social, setSocial] = useState<{ likes: Record<string, number>; views: Record<string, number> }>({ likes: {}, views: {} });
  const [loading, setLoading] = useState(true);
  const [commissionStats, setCommissionStats] = useState<{ paid: number; total: number }>({ paid: 0, total: 0 });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [supervisorPerms, setSupervisorPerms] = useState<SupervisorPermissions | null>(null);
  const { promoteToSupervisor, demoteToCustomer, upsertPermissions, getAllPermissions } = useSupervisorPermissions();

  const isOwner = role === "platform_owner";
  const isSupervisor = userRole === "supervisor";
  const isCurrentUser = user?.id === id;

  

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [prof, allListings, revs] = await Promise.all([
          getProfile(id),
          getPublishedListings(),
          getSellerReviews(id),
        ]);
        setProfile(prof);
        setReviews(revs);

        const sellerListings = allListings.filter(l => l.owner_id === id);
        setListings(sellerListings);

        if (sellerListings.length > 0) {
          const ids = sellerListings.map(l => l.id);
          const s = await getLikesAndViews(ids);
          setSocial({ likes: s.likes, views: s.views });
        }

        // Get commission stats for badges
        const { data: commissions } = await supabase
          .from("deal_commissions")
          .select("payment_status")
          .eq("seller_id", id);
        if (commissions) {
          setCommissionStats({
            paid: commissions.filter(c => c.payment_status === "verified").length,
            total: commissions.length,
          });
        }

        // Get user role for admin actions
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", id)
          .maybeSingle();
        setUserRole(roleData?.role || "customer");

        // Get supervisor permissions if applicable
        const allPerms = await getAllPermissions();
        setSupervisorPerms(allPerms.find(p => p.user_id === id) || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useSEO({
    title: profile?.full_name ? `${profile.full_name} — بروفايل البائع` : "بروفايل البائع",
    description: profile?.full_name ? `عرض بروفايل ${profile.full_name} على سوق تقبيل` : undefined,
    canonical: `/seller/${id}`,
  });

  const badges = useMemo(() => {
    if (!profile) return [];
    return getSellerBadges(profile, commissionStats.paid, commissionStats.total);
  }, [profile, commissionStats]);

  const totalViews = useMemo(() => Object.values(social.views).reduce((s, v) => s + v, 0), [social.views]);
  const totalLikes = useMemo(() => Object.values(social.likes).reduce((s, v) => s + v, 0), [social.likes]);

  const accountAge = useMemo(() => {
    if (!profile) return "";
    const days = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
    if (days < 30) return `${days} يوم`;
    if (days < 365) return `${Math.floor(days / 30)} شهر`;
    return `${Math.floor(days / 365)} سنة`;
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground text-lg">لم يتم العثور على هذا البائع</p>
        <Link to="/marketplace" className="text-primary text-sm mt-4 inline-block">العودة للسوق</Link>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8" dir="rtl">
      {/* Back */}
      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} />
        العودة للسوق
      </Link>

      {/* Profile Header */}
      <div className="bg-card rounded-2xl border border-border/30 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name || ""} loading="lazy" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              (profile.full_name || "؟")[0]
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{profile.full_name || "بائع"}</h1>
              {profile.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  <UserCheck size={12} />
                  {getVerificationLabel(profile.verification_level)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {profile.city && (
                <span className="flex items-center gap-1"><MapPin size={12} />{profile.city}</span>
              )}
              <span className="flex items-center gap-1"><Calendar size={12} />عضو منذ {accountAge}</span>
              <span className="flex items-center gap-1"><Store size={12} />{listings.length} إعلان</span>
            </div>

            <TrustBadge
              score={profile.trust_score}
              verificationLevel={profile.verification_level}
              size="md"
              showScore
              showBadges
              badges={badges}
            />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {[
              { label: "صفقات مكتملة", value: profile.completed_deals, icon: Award },
              { label: "إجمالي المشاهدات", value: totalViews, icon: Eye },
              { label: "إجمالي الإعجابات", value: totalLikes, icon: Heart },
            ].map(stat => (
              <div key={stat.label} className="bg-muted/30 rounded-xl p-3 text-center min-w-[80px]">
                <stat.icon size={16} className="mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Actions */}
        {isOwner && !isCurrentUser && (
          <div className="flex items-center gap-2 pt-4 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => navigate(`/dashboard/view-customer/${id}`)}
            >
              <Eye size={13} />
              معاينة الحساب
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => setSupervisorDialogOpen(true)}
            >
              <Shield size={13} />
              {isSupervisor ? "صلاحيات المشرف" : "تعيين كمشرف"}
            </Button>
          </div>
        )}
      </div>

      {/* Supervisor Dialog */}
      {isOwner && id && (
        <SupervisorPermissionsDialog
          open={supervisorDialogOpen}
          onOpenChange={setSupervisorDialogOpen}
          userId={id}
          userName={profile.full_name || "مستخدم"}
          currentRole={userRole || "customer"}
          existingPermissions={supervisorPerms}
          onPromote={async (userId, perms) => {
            const { error } = await promoteToSupervisor(userId, perms);
            if (error) toast.error("فشل في ترقية المستخدم");
            else {
              toast.success("تم ترقية المستخدم إلى مشرف");
              setUserRole("supervisor");
              const allPerms = await getAllPermissions();
              setSupervisorPerms(allPerms.find(p => p.user_id === userId) || null);
            }
          }}
          onDemote={async (userId) => {
            const { error } = await demoteToCustomer(userId);
            if (error) toast.error("فشل في إزالة الصلاحيات");
            else {
              toast.success("تم إزالة صلاحيات المشرف");
              setUserRole("customer");
              setSupervisorPerms(null);
            }
          }}
          onUpdatePermissions={async (userId, perms) => {
            const { error } = await upsertPermissions(userId, {
              manage_listings: perms.manage_listings,
              manage_deals: perms.manage_deals,
              manage_users: perms.manage_users,
              manage_crm: perms.manage_crm,
              manage_reports: perms.manage_reports,
              manage_security: perms.manage_security,
            });
            if (error) toast.error("فشل في تحديث الصلاحيات");
            else {
              toast.success("تم تحديث الصلاحيات");
              const allPerms = await getAllPermissions();
              setSupervisorPerms(allPerms.find(p => p.user_id === userId) || null);
            }
          }}
        />
      )}

      {/* Reviews */}
      <SellerReviewsSummary reviews={reviews} />

      {/* Active Listings */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">إعلانات البائع النشطة</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد إعلانات نشطة حالياً</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(listing => {
              const photos = Array.isArray(listing.photos) ? listing.photos as string[] : [];
              return (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.id}`}
                  className="bg-card rounded-xl border border-border/30 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-[16/10] bg-muted/30 overflow-hidden">
                    {photos[0] ? (
                      <img src={photos[0]} alt={listing.title || ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Store size={32} />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="text-sm font-medium text-foreground line-clamp-1">{listing.title || "بدون عنوان"}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{listing.city || "—"}
                      </span>
                      <span>{t(listing.deal_type, DEAL_TYPE_LABELS)}</span>
                    </div>
                    {listing.price && (
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <SarSymbol size={11} />
                        {listing.price.toLocaleString("en-US")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-0.5"><Eye size={10} />{social.views[listing.id] || 0}</span>
                      <span className="flex items-center gap-0.5"><Heart size={10} />{social.likes[listing.id] || 0}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfilePage;
