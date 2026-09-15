import type { Clock } from "@tfm-bic/application";

/**
 * Real adapter for the `Clock` port — the only place in this package that
 * touches wall-clock time directly. Repository/provider adapters follow the
 * same interface -> adapter -> real dependency pattern for PostgreSQL and
 * the external AI services once those are implemented (ADR-005/012/013).
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
