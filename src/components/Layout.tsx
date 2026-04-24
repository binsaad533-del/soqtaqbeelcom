import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, Menu, X, LogIn, LogOut, Plus, MessageSquare, ArrowRight, LifeBuoy } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useState, useEffect } from "react";
import AiAssistant from "./AiAssistant";
import AiAutoAnalysis from "./AiAutoAnalysis";
import Footer from "./Footer";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import CurrencyToggle from "./CurrencyToggle";
import CookieConsent from "./CookieConsent";
import SmartInstallPrompt from "./SmartInstallPrompt";
import PushNotificationPrompt from "./PushNotificationPrompt";
import LaunchBanner from "./LaunchBanner";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, role } = useAuthContext();
  const { tx } = useLanguage();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setUnreadMessages(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("unread-msgs-nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isFinancialManager = role === "financial_manager";

  const navLinks = isFinancialManager
    ? [
        { label: t("nav.home"), path: "/" },
        { label: tx("الإدارة المالية", "Finance"), path: "/admin/finance" },
      ]
    : [
        { label: t("nav.home"), path: "/" },
        { label: t("nav.marketplace"), path: "/marketplace" },
        { label: t("nav.howItWorks"), path: "/how-it-works" },
        { label: t("nav.addListing"), path: "/create-listing?new=1" },
        { label: t("nav.dashboard"), path: "/dashboard" },
        { label: tx("نماذج PDF", "PDF Templates"), path: "/pdf-preview" },
      ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LaunchBanner />
      <header
        className={cn(
          "sticky top-0 z-50 backdrop-blur-md transition-all duration-200 border-b border-primary/5",
          scrolled
            ? "h-[52px] shadow-[0_1px_3px_0_hsl(var(--primary)/0.08)] bg-background/95"
            : "h-[60px] bg-gradient-to-l from-primary/[0.03] via-background/95 to-accent/[0.04]"
        )}
      >
        <div className="container h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
              <img src={logoIcon} alt={tx("سوق تقبيل", "Soq Taqbeel")} className="w-6 h-6 md:w-7 md:h-7 object-contain" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path && link.path !== "/pdf-preview";
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "relative px-3.5 py-1.5 text-[13px] transition-colors rounded-lg",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1.5px] bg-foreground rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5">
            <CurrencyToggle />
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/create-listing?new=1"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all"
                >
                  <Plus size={13} strokeWidth={2} />
                  {t("nav.addListing")}
                </Link>
                <Link
                  to="/messages"
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={tx("المحادثات", "Messages")}
                >
                  <MessageSquare size={17} strokeWidth={1.5} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-0.5">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to="/support"
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={tx("الدعم الفني", "Support")}
                >
                  <LifeBuoy size={17} strokeWidth={1.5} />
                </Link>
                <NotificationBell />
                <button
                  onClick={() => navigate("/dashboard")}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-[12px]"
                  title={tx("لوحة التحكم", "Dashboard")}
                >
                  <User size={15} strokeWidth={1.5} />
                  <span className="hidden lg:inline">{tx("لوحة التحكم", "Dashboard")}</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={tx("لوحة التحكم", "Dashboard")}
                >
                  <User size={17} strokeWidth={1.5} />
                </button>
                <button
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={t("common.logout")}
                >
                  <LogOut size={17} strokeWidth={1.5} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn size={15} strokeWidth={1.5} />
                {t("common.login")}
              </Link>
            )}
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              title={tx("القائمة", "Menu")}
            >
              {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-background border-t border-border/20 px-4 py-3 space-y-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-lg text-[13px] transition-colors",
                  location.pathname === link.path
                    ? "text-foreground font-medium bg-muted/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-[13px] text-muted-foreground hover:text-foreground"
              >
                {t("common.login")}
              </Link>
            )}
          </div>
        )}
      </header>

      <AiAutoAnalysis />

      {location.pathname !== "/" && (
        <div className="container pt-3 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={15} strokeWidth={1.5} />
            {tx("رجوع", "Back")}
          </button>
        </div>
      )}

      <main className="flex-1">{children}</main>
      <AiAssistant />
      <CookieConsent />
      <SmartInstallPrompt />
      <PushNotificationPrompt />
      <Footer />
    </div>
  );
};

export default Layout;
