import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs font-medium flex items-center gap-1"
      title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      <Globe size={15} strokeWidth={1.5} />
      <span className="hidden sm:inline">{lang === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
};

export default LanguageToggle;
