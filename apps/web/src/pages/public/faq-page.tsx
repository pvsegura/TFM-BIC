import { useEffect } from "react";

import { useDocumentMeta } from "../../homepage/use-document-meta.js";
import { m } from "../../i18n/index.js";
import { PageHero } from "./public-parts.js";

const t = m.marketing.faq;

/** FAQ with schema.org FAQPage structured data (the same answers, verbatim). */
export function FaqPage() {
  useDocumentMeta(t.metaTitle, t.metaDescription);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
    document.head.append(script);
    return () => script.remove();
  }, []);

  return (
    <div>
      <PageHero title={t.title} lead={t.metaDescription} />
      <div className="max-w-3xl space-y-3 pb-10">
        {t.items.map((item) => (
          <details
            key={item.q}
            className="rounded-xl border border-primary/10 px-4 py-3 open:bg-white/50 dark:border-surface/10 dark:open:bg-night-paper/50"
          >
            <summary className="cursor-pointer font-display font-bold">{item.q}</summary>
            <p className="mt-2 text-primary/80 dark:text-surface/80">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
