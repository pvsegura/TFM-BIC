import type { ReactNode } from "react";

import { Link } from "../../components/app-link.js";

/** Shared building blocks of the public (marketing) pages — one visual language for all of them. */

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <header className="py-10 sm:py-14">
      {eyebrow ? (
        <p className="font-display text-sm font-bold uppercase tracking-widest text-accent-ink dark:text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-primary/80 dark:text-surface/80">{lead}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div> : null}
    </header>
  );
}

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-t border-primary/10 py-10 dark:border-surface/10"
    >
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {lead ? <p className="mt-2 max-w-2xl text-primary/80 dark:text-surface/80">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-primary/10 bg-white/60 p-5 shadow-sm dark:border-surface/10 dark:bg-night-paper/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full bg-accent px-5 py-3 font-display font-bold text-primary shadow-sm hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full border border-primary px-5 py-3 font-display font-bold hover:bg-primary/5 dark:border-surface dark:hover:bg-surface/10"
    >
      {children}
    </Link>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="font-bold text-accent-ink dark:text-accent">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
