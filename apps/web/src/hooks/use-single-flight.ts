import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

/**
 * A mutation that sends at most one request at a time: a second `mutate` while one is in flight is
 * ignored. `isPending` is published a moment after a click, so a disabled button alone would let a
 * double-click through — this guard is what keeps a student's action from being recorded twice.
 */
export function useSingleFlight<TData, TError, TVariables, TContext>(
  mutation: UseMutationResult<TData, TError, TVariables, TContext>,
) {
  const inFlight = useRef(false);
  const { mutate } = mutation;
  const mutateOnce = useCallback(
    (input: TVariables) => {
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      mutate(input, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    [mutate],
  );
  return { ...mutation, mutate: mutateOnce };
}
