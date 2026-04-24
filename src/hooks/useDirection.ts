import { useTranslation } from "react-i18next";
import { isRTLLang } from "@/i18n";

export const useDirection = () => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "ar";
  const isRTL = isRTLLang(lang);
  return { dir: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr", isRTL, lang };
};

export default useDirection;
