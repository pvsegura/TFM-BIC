import { Link } from "../components/app-link.js";

/** Any address no route matches. A fixed message — the requested path is never echoed. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="mt-2 text-primary/70 dark:text-surface/70">
        There is no page at this address. It may have moved, or the link may be mistyped.
      </p>
      <Link to="/" className="mt-4 inline-block text-sm underline underline-offset-2">
        Go to the homepage
      </Link>
    </section>
  );
}
