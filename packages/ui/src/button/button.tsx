import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-white hover:opacity-90 focus-visible:outline-accent",
  secondary:
    "bg-transparent text-primary border border-primary hover:bg-primary/5 focus-visible:outline-primary dark:text-surface dark:border-surface dark:hover:bg-surface/10",
};

/**
 * Reusable, presentation-only button primitive — no business logic, no data
 * fetching. See .claude/skills/project-architecture for the "packages/ui is
 * primitives only" rule.
 */
export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
