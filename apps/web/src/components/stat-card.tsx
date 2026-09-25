/** One labelled number. The value is always shown as text; nothing is conveyed by colour. */
export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-primary/20 px-4 py-3 dark:border-surface/20">
      <dt className="text-sm text-primary/70 dark:text-surface/70">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint === undefined ? null : (
        <dd className="text-xs text-primary/70 dark:text-surface/70">{hint}</dd>
      )}
    </div>
  );
}
