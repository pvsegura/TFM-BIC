import { Link } from "../components/app-link.js";
import { m } from "../i18n/index.js";

/** Any address no route matches. A fixed message — the requested path is never echoed. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        {m.common.notFoundTitle}
      </h1>
      <p className="mt-2 text-primary/70 dark:text-surface/70">{m.common.notFoundBody}</p>
      <Link to="/" className="mt-4 inline-block text-sm underline underline-offset-2">
        {m.common.notFoundHome}
      </Link>
    </section>
  );
}
