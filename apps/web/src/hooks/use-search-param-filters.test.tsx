import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { useSearchParamFilters } from "./use-search-param-filters.js";

function render(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(() => useSearchParamFilters(), { wrapper });
}

describe("useSearchParamFilters", () => {
  it("reads the filters from the URL", () => {
    const { result } = render("/learn/vocabulary?language=pl&status=saved");

    expect(result.current[0].get("status")).toBe("saved");
  });

  it("sets, replaces and clears filters, keeping the others", () => {
    const { result } = render("/learn/vocabulary?language=pl&status=saved&q=dom");

    act(() => {
      result.current[1]({ status: "learned", q: "", category: "food" });
    });

    const params = result.current[0];
    expect(params.get("language")).toBe("pl");
    expect(params.get("status")).toBe("learned");
    expect(params.get("category")).toBe("food");
    expect(params.has("q")).toBe(false);
  });
});
