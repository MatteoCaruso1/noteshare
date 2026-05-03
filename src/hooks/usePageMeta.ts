import { useEffect } from "react";

type PageMetaOptions = {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "product";
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
};

const SITE_URL = "https://noteshare.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
}

/**
 * Reusable per-page meta + Open Graph + Twitter Card + canonical injection.
 * Keeps title under 60 chars and description under 160 chars (truncates safely).
 */
export function usePageMeta(opts: PageMetaOptions) {
  const {
    title,
    description,
    canonical,
    image = DEFAULT_IMAGE,
    type = "website",
    twitterCard = "summary_large_image",
    noIndex,
  } = opts;

  useEffect(() => {
    const safeTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    const safeDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;
    const url = canonical
      ? canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`
      : (typeof window !== "undefined" ? window.location.origin + window.location.pathname : SITE_URL);

    const prevTitle = document.title;
    document.title = safeTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: safeDesc });
    upsertLink("canonical", url);

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: safeTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: safeDesc });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Noteshare" });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: twitterCard });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: safeTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: safeDesc });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });

    if (noIndex) {
      upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex,nofollow" });
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, canonical, image, type, twitterCard, noIndex]);
}
