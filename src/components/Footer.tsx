import { Link } from "react-router-dom";
import SocialIcons from "./SocialIcons";
import logoIcon from "@/assets/logo-icon.png";

const footerLinks = [
  { label: "الرئيسية", path: "/" },
  { label: "السوق", path: "/marketplace" },
  { label: "أضف فرصة", path: "/create-listing" },
  { label: "الشروط", path: "/terms" },
  { label: "الخصوصية", path: "/privacy" },
  { label: "من نحن", path: "/about" },
  { label: "كيف تعمل المنصة", path: "/how-it-works" },
  { label: "تواصل معنا", path: "/contact" },
  { label: "مركز المساعدة", path: "/help" },
  { label: "المدونة", path: "/blog" },
];

const Footer = () => {
  return (
    <footer className="py-8 px-4">
      <div className="container max-w-3xl mx-auto text-center space-y-3">
        {/* Line 1: Links */}
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

        {/* Logo icon */}
        <div className="flex justify-center">
          <img src={logoIcon} alt="سوق تقبيل" className="h-8 w-auto opacity-60" />
        </div>

        {/* Social Icons */}
        <SocialIcons className="justify-center" />

        {/* Line 2: Brand statement */}
        <p className="text-[12px] text-muted-foreground/70">
          في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦
        </p>

        {/* Line 3: Ownership */}
        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()} المنصة مملوكة ومدارة بواسطة شركة{" "}
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
