import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  type?: string;
  twitterCard?: "summary" | "summary_large_image";
}

const BASE_TITLE = "سوق تقبيل";
const BASE_URL = "https://soqtaqbeel.com";
const DEFAULT_OG_IMAGE = "https://soqtaqbeel.com/og-image.jpg";

export const useSEO = ({ title, description, ogImage, canonical, type = "website", twitterCard = "summary_large_image" }: SEOOptions) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} — تقبيل المشاريع والفرص التجارية بالذكاء الاصطناعي`;
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    // Description
    const desc = description || "منصة ذكية لعرض وتحليل وتفاوض فرص تقبيل المحلات والمشاريع التجارية في السعودية";
    setMeta("name", "description", desc);
    setMeta("property", "og:description", desc);
    setMeta("name", "twitter:description", desc);

    // Title
    setMeta("property", "og:title", fullTitle);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", "سوق تقبيل");
    setMeta("property", "og:locale", "ar_SA");

    // Twitter
    setMeta("name", "twitter:card", twitterCard);

    // Image
    const image = ogImage || DEFAULT_OG_IMAGE;
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:image", image);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");

    // Canonical + og:url
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${BASE_URL}${canonical}`);
      setMeta("property", "og:url", `${BASE_URL}${canonical}`);
    }

    return () => {
      document.title = `${BASE_TITLE} — تقبيل المشاريع والفرص التجارية بالذكاء الاصطناعي`;
    };
  }, [title, description, ogImage, canonical, type, twitterCard]);
};
