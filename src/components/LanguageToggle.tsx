import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { changeLanguage, LANG_LABELS, SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "ar").split("-")[0] as SupportedLang;

  const handleSelect = async (code: SupportedLang) => {
    await changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs font-medium flex items-center gap-1"
          title="Language"
        >
          <Globe size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline uppercase">{current}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LANGS.map((code) => {
          const isActive = code === current;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => handleSelect(code)}
              className="flex items-center justify-between gap-3 cursor-pointer text-[13px]"
            >
              <span>{LANG_LABELS[code]}</span>
              {isActive && <Check size={14} strokeWidth={2} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageToggle;
