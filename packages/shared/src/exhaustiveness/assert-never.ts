/**
 * Exhaustiveness check for switch/if-else chains over a union type. Calling
 * this in an unreachable `default` branch makes TypeScript error at compile
 * time if a new union member is added and not handled.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
