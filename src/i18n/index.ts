import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGS = ["ar", "en", "zh", "hi", "ur", "bn"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const RTL_LANGS: SupportedLang[] = ["ar", "ur"];

export const LANG_LABELS: Record<SupportedLang, string> = {
  ar: "العربية",
  en: "English",
  zh: "中文",
  hi: "हिंदी",
  ur: "اردو",
  bn: "বাংলা",
};

export const isRTLLang = (lang: string): boolean =>
  RTL_LANGS.includes(lang as SupportedLang);

// Lazy loader for translation files — only fetched when the language is actually requested
const loadResources = async (lang: SupportedLang) => {
  const mod = await import(`./locales/${lang}.json`);
  return mod.default ?? mod;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ar",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    react: { useSuspense: true },
    // Load Arabic synchronously-ish on init; others lazy-loaded on demand
    resources: {},
    partialBundledLanguages: true,
  });

// Bootstrap: load the initial language bundle
const bootstrapLang = (i18n.resolvedLanguage || i18n.language || "ar").split("-")[0] as SupportedLang;
const initialLang: SupportedLang = (SUPPORTED_LANGS as readonly string[]).includes(bootstrapLang)
  ? bootstrapLang
  : "ar";

const loadedLangs = new Set<string>();

export const ensureLangLoaded = async (lang: SupportedLang) => {
  if (loadedLangs.has(lang)) return;
  try {
    const resources = await loadResources(lang);
    i18n.addResourceBundle(lang, "translation", resources, true, true);
    loadedLangs.add(lang);
  } catch (err) {
    console.warn(`[i18n] Failed to load locale "${lang}"`, err);
  }
};

// Load initial language immediately
void ensureLangLoaded(initialLang).then(() => {
  if (i18n.language !== initialLang) i18n.changeLanguage(initialLang);
});

// Wrap changeLanguage to lazy-load before switching
export const changeLanguage = async (lang: SupportedLang) => {
  await ensureLangLoaded(lang);
  await i18n.changeLanguage(lang);
  try {
    localStorage.setItem("i18nextLng", lang);
  } catch {
    /* ignore storage errors */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTLLang(lang) ? "rtl" : "ltr";
  }
};

export default i18n;
