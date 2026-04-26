import { useTranslation } from "react-i18next";
import { changeLanguage, LANG_LABELS, SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FLAGS: Record<SupportedLang, string> = {
  ar: "🇸🇦",
  en: "🇺🇸",
  zh: "🇨🇳",
  hi: "🇮🇳",
  ur: "🇵🇰",
  bn: "🇧🇩",
};

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "ar").split("-")[0] as SupportedLang;

  const handleSelect = async (code: SupportedLang) => {
    if (code === current) return;
    await changeLanguage(code);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none max-w-[220px] sm:max-w-none"
        role="group"
        aria-label="Language selector"
      >
        {SUPPORTED_LANGS.map((code) => {
          const isActive = code === current;
          return (
            <Tooltip key={code}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleSelect(code)}
                  aria-label={LANG_LABELS[code]}
                  aria-pressed={isActive}
                  className={cn(
                    "shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-base sm:text-lg leading-none transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-primary/10 ring-1 ring-primary/40 scale-110"
                      : "opacity-60 hover:opacity-100 hover:bg-muted/40"
                  )}
                >
                  <span aria-hidden="true">{FLAGS[code]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {LANG_LABELS[code]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default LanguageToggle;
