import { Link } from "react-router-dom";
import AiStar from "./AiStar";
import ainJasaasLogo from "@/assets/ain-jasaas-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 bg-background/50">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <AiStar size={20} animate={false} />
              <span className="text-sm font-medium gradient-text">سوق تقبيل</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              منصة تقبّل الأعمال الذكية — نربط بين البائعين والمشترين بذكاء اصطناعي متقدم لضمان صفقات عادلة وشفافة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-medium mb-3">روابط سريعة</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">الرئيسية</Link>
              <Link to="/marketplace" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">السوق</Link>
              <Link to="/create-listing" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">أضف فرصة</Link>
              <Link to="/dashboard" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">لوحة التحكم</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-medium mb-3">قانوني</h4>
            <div className="space-y-2">
              <Link to="/terms" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">الشروط والأحكام</Link>
              <Link to="/privacy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">سياسة الخصوصية</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-medium mb-3">الدعم</h4>
            <div className="space-y-2">
              <Link to="/contact" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">تواصل معنا</Link>
              <span className="block text-xs text-muted-foreground">support@souqtaqbeel.app</span>
            </div>
          </div>
        </div>

        {/* Brand Statement */}
        <div className="mt-10 mb-6 text-center">
          <p className="text-sm text-muted-foreground/80">
            في المملكة العربية السعودية — صُنع بها ولأجلها 🇸🇦
          </p>
        </div>

        {/* Ownership & Logo */}
        <div className="border-t border-border/20 pt-6">
          <div className="flex flex-col items-center gap-4">
            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              المنصة مملوكة ومدارة ومشغلة بواسطة شركة{" "}
              <a
                href="https://www.jsaas-group.com/en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                عين جساس
              </a>
              . جميع الحقوق محفوظة © {new Date().getFullYear()}
            </p>

            <a
              href="https://www.jsaas-group.com/en"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-75 hover:opacity-100 transition-opacity"
            >
              <img
                src={ainJasaasLogo}
                alt="Ain Jasaas Company"
                width={32}
                height={32}
                loading="lazy"
                className="w-8 h-8 object-contain"
              />
            </a>

            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60">
              <Link to="/terms" className="hover:text-foreground transition-colors">الشروط</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">الخصوصية</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">تواصل معنا</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
