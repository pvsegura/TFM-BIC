interface RoutePlaceholderProps {
  title: string;
  description: string;
}

/**
 * Generic placeholder for a route that has no real feature yet (M1 is
 * infra-only — see docs/product/roadmap.md). Deliberately has no
 * language-specific or feature-specific logic so it can stand in for any
 * route in the architectural skeleton below.
 */
export function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <section aria-labelledby="route-placeholder-heading" className="mx-auto max-w-2xl py-12">
      <h1 id="route-placeholder-heading" className="text-2xl font-semibold">
        {title}
      </h1>
      <p className="mt-2 text-primary/70 dark:text-surface/70">{description}</p>
      <p className="mt-4 text-sm text-primary/50 dark:text-surface/50">
        This route is an architectural placeholder for Milestone 1 — no feature is implemented here
        yet.
      </p>
    </section>
  );
}
