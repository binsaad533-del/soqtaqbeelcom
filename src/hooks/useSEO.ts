import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  type?: string;
}

const BASE_TITLE = "سوق تقبيل";
const BASE_URL = "https://soqtaqbeelcom.lovable.app";

export const useSEO = ({ title, description, ogImage, canonical, type = "website" }: SEOOptions) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} — منصة تقبيل المشاريع التجارية`;
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

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    setMeta("property", "og:title", fullTitle);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("property", "og:type", type);

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

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
      document.title = `${BASE_TITLE} — منصة تقبيل المشاريع التجارية`;
    };
  }, [title, description, ogImage, canonical, type]);
};
