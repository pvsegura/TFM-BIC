import type { LanguageLevelsResponse, LanguagesResponse } from "@tfm-bic/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as catalogApi from "../services/catalog-api.js";
import {
  CATALOG_QUERY_KEY_ROOT,
  useContentItem,
  useContentList,
  useLanguageLevels,
  useLanguages,
} from "./use-catalog.js";

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

// Branded ids (LanguageId) are plain strings at runtime; the API client validates them for real.
const LANGUAGES = {
  languages: [
    { code: "pl", name: "Polish", nativeName: "polski", locale: "pl-PL", direction: "ltr" },
  ],
} as unknown as LanguagesResponse;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog hooks", () => {
  it("useLanguages loads the catalog and caches it under the catalog key root", async () => {
    vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useLanguages(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(LANGUAGES);
    });
    expect(client.getQueryCache().getAll()[0]?.queryKey[0]).toBe(CATALOG_QUERY_KEY_ROOT);
  });

  it("treats catalog metadata as stable: no refetch on window focus, a long stale time", async () => {
    const spy = vi.spyOn(catalogApi, "fetchLanguages").mockResolvedValue(LANGUAGES);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useLanguages(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    window.dispatchEvent(new Event("focus"));
    const observer = client.getQueryCache().getAll()[0]?.observers[0];

    expect(spy).toHaveBeenCalledTimes(1);
    expect(observer?.options.staleTime).toBeGreaterThanOrEqual(60_000);
    expect(observer?.options.refetchOnWindowFocus).toBe(false);
  });

  it("useLanguageLevels does not fetch until a language code is known", () => {
    const spy = vi.spyOn(catalogApi, "fetchLanguageLevels");
    const { wrapper } = setup();

    renderHook(() => useLanguageLevels(undefined), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });

  it("useLanguageLevels fetches the levels of the given language", async () => {
    const levels = {
      language: LANGUAGES.languages[0],
      levels: [],
    } as unknown as LanguageLevelsResponse;
    const spy = vi.spyOn(catalogApi, "fetchLanguageLevels").mockResolvedValue(levels);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLanguageLevels("pl"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(levels);
    });
    expect(spy).toHaveBeenCalledWith("pl");
  });

  it("useContentList stays idle while disabled, even with a language and level", () => {
    const spy = vi.spyOn(catalogApi, "fetchContentList");
    const { wrapper } = setup();

    renderHook(() => useContentList("pl", "a2", false), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });

  it("useContentList fetches once enabled", async () => {
    const spy = vi.spyOn(catalogApi, "fetchContentList").mockResolvedValue({ items: [] });
    const { wrapper } = setup();

    const { result } = renderHook(() => useContentList("pl", "a1", true), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [] });
    });
    expect(spy).toHaveBeenCalledWith("pl", "a1");
  });

  it("useContentItem fetches one item, and not without an id", async () => {
    const idle = vi.spyOn(catalogApi, "fetchContent");
    const { wrapper } = setup();
    renderHook(() => useContentItem(undefined), { wrapper });
    expect(idle).not.toHaveBeenCalled();

    const item = {
      id: "pl-greetings",
      languageId: "pl",
      levelId: "a1",
      type: "lesson" as const,
      title: "Greetings",
      description: "Say hello.",
      order: 10,
      instructionLanguage: "en",
      blocks: [],
    };
    // Branded ids are plain strings at runtime; the API client already validates them.
    idle.mockResolvedValue(item as unknown as Awaited<ReturnType<typeof catalogApi.fetchContent>>);
    const { result } = renderHook(() => useContentItem("pl-greetings"), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.id).toBe("pl-greetings");
    });
  });
});
