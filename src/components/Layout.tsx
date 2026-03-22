import { Link, useLocation } from "react-router-dom";
import { Search, User, Menu, X } from "lucide-react";
import { useState } from "react";
import AiStar from "./AiStar";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "الرئيسية", path: "/" },
  { label: "السوق", path: "/marketplace" },
  { label: "أضف فرصة", path: "/create-listing" },
  { label: "لوحة التحكم", path: "/dashboard" },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <AiStar size={24} />
            <span className="text-lg font-medium gradient-text">سوق تقبيل</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  location.pathname === link.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Link to="/dashboard" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <User size={18} strokeWidth={1.5} />
            </Link>
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-card p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg text-sm transition-colors",
                  location.pathname === link.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/50 bg-card/50">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AiStar size={20} animate={false} />
              <span className="text-sm text-muted-foreground">سوق تقبيل — منصة تقبّل الأعمال الذكية</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/marketplace" className="hover:text-foreground transition-colors">السوق</Link>
              <Link to="/create-listing" className="hover:text-foreground transition-colors">أضف فرصة</Link>
              <Link to="/dashboard" className="hover:text-foreground transition-colors">حسابي</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
