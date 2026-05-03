import { useEffect, useId } from "react";

const SITE_URL = "https://noteshare.app";

function injectJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.text = JSON.stringify(data);
  return el;
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

/** Inject a JSON-LD <script> by id. Cleans up on unmount. */
export function useJsonLd(id: string, data: unknown | null) {
  useEffect(() => {
    if (!data) return;
    injectJsonLd(id, data);
    return () => removeJsonLd(id);
  }, [id, data]);
}

export type BreadcrumbItem = { name: string; url: string };

/** BreadcrumbList JSON-LD from a list of crumbs. URLs may be absolute or path-only. */
export function useBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const id = useId();
  const data = items.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: it.name,
          item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
        })),
      }
    : null;
  useJsonLd(`jsonld-breadcrumb-${id}`, data);
}

export type FaqItem = { question: string; answer: string };

/** FAQPage JSON-LD built from a single source-of-truth FAQ array. */
export function useFaqJsonLd(items: FaqItem[]) {
  const id = useId();
  const data = items.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
      }
    : null;
  useJsonLd(`jsonld-faq-${id}`, data);
}
