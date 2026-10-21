import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useSingleFlight } from "./use-single-flight.js";

function render(action: (input: string) => Promise<string>) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSingleFlight(useMutation({ mutationFn: action })), { wrapper });
}

describe("useSingleFlight", () => {
  it("sends one request for a double click, and allows the next once it has settled", async () => {
    let finish: (value: string) => void = () => undefined;
    const action = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = render(action);

    act(() => {
      result.current.mutate("a");
      result.current.mutate("a");
    });
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    await act(async () => {
      finish("done");
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.mutate("b");
    });
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it("allows a retry after a failure", async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error("no")).mockResolvedValueOnce("ok");
    const { result } = render(action);

    act(() => {
      result.current.mutate("a");
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    act(() => {
      result.current.mutate("a");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(action).toHaveBeenCalledTimes(2);
  });
});
