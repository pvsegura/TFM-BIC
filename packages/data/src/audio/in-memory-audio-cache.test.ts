import type { GeneratedAudio } from "@tfm-bic/application";
import { describe, expect, it } from "vitest";

import { InMemoryAudioCache } from "./in-memory-audio-cache.js";

const clip = (size: number): GeneratedAudio => ({
  data: new Uint8Array(size),
  format: "audio/wav",
  provider: "fake",
  model: null,
});

describe("InMemoryAudioCache", () => {
  it("returns what was stored, and nothing for an unknown key", () => {
    const cache = new InMemoryAudioCache({ maxEntries: 2, maxBytes: 100 });
    const audio = clip(10);
    cache.set("a", audio);

    expect(cache.get("a")).toBe(audio);
    expect(cache.get("b")).toBeUndefined();
  });

  it("evicts the least recently used entry beyond its entry limit", () => {
    const cache = new InMemoryAudioCache({ maxEntries: 2, maxBytes: 100 });
    cache.set("a", clip(1));
    cache.set("b", clip(1));
    cache.get("a"); // a is now the most recently used
    cache.set("c", clip(1));

    expect(cache.get("a")).toBeDefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("evicts old entries until the total size fits its byte limit", () => {
    const cache = new InMemoryAudioCache({ maxEntries: 10, maxBytes: 25 });
    cache.set("a", clip(10));
    cache.set("b", clip(10));
    cache.set("c", clip(10));

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
    expect(cache.totalBytes).toBe(20);
  });

  it("never stores a clip bigger than the whole cache", () => {
    const cache = new InMemoryAudioCache({ maxEntries: 10, maxBytes: 25 });
    cache.set("a", clip(10));
    cache.set("huge", clip(26));

    expect(cache.get("huge")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
  });

  it("replaces an entry stored again under the same key without double-counting its size", () => {
    const cache = new InMemoryAudioCache({ maxEntries: 10, maxBytes: 100 });
    cache.set("a", clip(10));
    cache.set("a", clip(20));

    expect(cache.totalBytes).toBe(20);
    expect(cache.get("a")?.data.byteLength).toBe(20);
  });
});
