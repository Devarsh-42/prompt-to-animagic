import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

const SEO = ({ title, description, canonical = "/", jsonLd }: SEOProps) => {
  useEffect(() => {
    document.title = title;

    const ensureMeta = (name: string, attr: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}='${name}']`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMeta("description", "name", description);
    ensureMeta("og:title", "property", title);
    ensureMeta("og:description", "property", description);

    let link = document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;

    let scriptEl = document.getElementById("ld-json") as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.id = "ld-json";
      document.head.appendChild(scriptEl);
    }
    if (jsonLd) {
      scriptEl.textContent = JSON.stringify(jsonLd);
    }
  }, [title, description, canonical, jsonLd]);

  return null;
};

export default SEO;
