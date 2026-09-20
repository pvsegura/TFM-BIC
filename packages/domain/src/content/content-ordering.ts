interface Orderable {
  id: string;
  order: number;
}

/**
 * Explicit, deterministic ordering: ascending `order`, ties broken by `id`
 * (compared by code unit, so the result does not depend on the runtime's
 * locale). Nothing relies on file-system or database insertion order.
 */
export function compareContentItems(a: Orderable, b: Orderable): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

export function sortContentItems<T extends Orderable>(items: readonly T[]): T[] {
  return [...items].sort(compareContentItems);
}
