import { Link } from "react-router-dom";
import SocialIcons from "./SocialIcons";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { tx } = useLanguage();

  const footerLinks = [
    { label: tx("الرئيسية", "Home"), path: "/" },
    { label: tx("سوق الفرص", "Marketplace"), path: "/marketplace" },
    { label: tx("أضف فرصة", "Add Listing"), path: "/create-listing" },
    { label: tx("الشروط", "Terms"), path: "/terms" },
    { label: tx("الخصوصية", "Privacy"), path: "/privacy" },
    { label: tx("من نحن", "About"), path: "/about" },
    { label: tx("كيف تعمل المنصة", "How it works"), path: "/how-it-works" },
    { label: tx("تواصل معنا", "Contact"), path: "/contact" },
    { label: tx("مركز المساعدة", "Help Center"), path: "/help" },
    { label: tx("المدونة", "Blog"), path: "/blog" },
    { label: tx("العمولة", "Commission"), path: "/commission" },
    { label: tx("تثبيت التطبيق", "Install App"), path: "/install" },
  ];

  return (
    <footer className="py-8 px-4">
      <div className="container max-w-3xl mx-auto text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          {footerLinks.map((link, i) => (
            <span key={link.path} className="flex items-center gap-1.5">
              <Link
                to={link.path}
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
              {i < footerLinks.length - 1 && (
                <span className="text-muted-foreground/30 text-[10px]">|</span>
              )}
            </span>
          ))}
        </div>

        <div className="flex justify-center">
          <img src={logoIcon} alt={tx("سوق تقبيل", "Soq Taqbeel")} className="h-8 w-auto opacity-60" />
        </div>

        <SocialIcons className="justify-center" />

        <p className="text-[12px] text-muted-foreground/70">
          {tx("في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦", "Built in Saudi Arabia — for its market 🇸🇦")}
        </p>

        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()} {tx("المنصة مملوكة ومدارة بواسطة شركة", "This platform is owned and operated by")}{" "}
          <a
            href="https://www.jsaas-group.com/en"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Ain Jasaas
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
