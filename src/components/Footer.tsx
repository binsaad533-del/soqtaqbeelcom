import { Link } from "react-router-dom";
import SocialIcons from "./SocialIcons";
import logoIcon from "@/assets/logo-icon-gold.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { tx } = useLanguage();
  const { t } = useTranslation();

  const footerLinks = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.marketplace"), path: "/marketplace" },
    { label: t("nav.addListing"), path: "/create-listing?new=1" },
    { label: t("footer.terms"), path: "/terms" },
    { label: t("footer.privacy"), path: "/privacy" },
    { label: t("footer.about"), path: "/about" },
    { label: t("footer.howItWorks"), path: "/how-it-works" },
    { label: t("footer.contact"), path: "/contact" },
    { label: t("footer.help"), path: "/help" },
    { label: t("footer.blog"), path: "/blog" },
    { label: t("footer.commission"), path: "/commission" },
    { label: t("footer.pdfTemplates"), path: "/pdf-preview" },
    { label: t("footer.support"), path: "/support" },
    { label: t("footer.installApp"), path: "/install" },
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
          {t("footer.madeInSaudi")}
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
