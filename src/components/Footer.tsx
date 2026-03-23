import { Link } from "react-router-dom";
import AiStar from "./AiStar";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/50">
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

        <div className="border-t border-border/30 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} سوق تقبيل. جميع الحقوق محفوظة.
          </span>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">الشروط</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">الخصوصية</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">تواصل معنا</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
