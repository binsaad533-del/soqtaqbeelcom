import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, Menu, X, LogIn, LogOut, Plus } from "lucide-react";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useState, useEffect } from "react";
import AiAssistant from "./AiAssistant";
import Footer from "./Footer";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { tx } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: tx("الرئيسية", "Home"), path: "/" },
    { label: tx("السوق", "Marketplace"), path: "/marketplace" },
    { label: tx("أضف فرصة", "Add Listing"), path: "/create-listing" },
    { label: tx("لوحة التحكم", "Dashboard"), path: "/dashboard" },
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
              const isActive = location.pathname === link.path;
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
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/create-listing"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-l from-primary to-primary/70 text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all"
                >
                  <Plus size={13} strokeWidth={2} />
                  {tx("أضف فرصة", "Add Listing")}
                </Link>
                <NotificationBell />
                <Link
                  to="/dashboard"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={tx("لوحة التحكم", "Dashboard")}
                >
                  <User size={17} strokeWidth={1.5} />
                </Link>
                <button
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title={tx("تسجيل الخروج", "Sign out")}
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
                {tx("تسجيل الدخول", "Log in")}
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
                {tx("تسجيل الدخول", "Log in")}
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
      <AiAssistant />
      <Footer />
    </div>
  );
};

export default Layout;
