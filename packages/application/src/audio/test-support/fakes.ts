import type { AudioCache } from "../ports/audio-cache.js";
import type {
  AudioGenerationRequest,
  AudioGenerationService,
  GeneratedAudio,
} from "../ports/audio-generation-service.js";

/** A `GeneratedAudio` with the given bytes, for assertions. Test-only. */
export function audioOf(bytes: readonly number[]): GeneratedAudio {
  return { data: new Uint8Array(bytes), format: "audio/wav", provider: "stub", model: null };
}

/** An unbounded `AudioCache` over a `Map`. Test-only — `packages/data` has the real, bounded one. */
export class MapAudioCache implements AudioCache {
  readonly entries = new Map<string, GeneratedAudio>();

  get(key: string): GeneratedAudio | undefined {
    return this.entries.get(key);
  }

  set(key: string, audio: GeneratedAudio): void {
    this.entries.set(key, audio);
  }
}

/**
 * A minimal, application-layer-only double for `AudioGenerationService` — resolves, rejects or
 * stays pending on command. Distinct from `packages/data`'s `FakeAudioGenerationService` (the
 * shippable dev/test/CI adapter): this one keeps use-case tests independent of `packages/data`.
 */
export class StubAudioGenerationService implements AudioGenerationService {
  private outcomes: (() => Promise<GeneratedAudio>)[] = [];
  private fallback: (() => Promise<GeneratedAudio>) | null = null;
  readonly calls: AudioGenerationRequest[] = [];

  resolveWith(audio: GeneratedAudio): void {
    this.fallback = () => Promise.resolve(audio);
  }

  rejectWith(error: Error): void {
    this.fallback = () => Promise.reject(error);
  }

  /** The next call stays pending until the returned handle settles it. */
  deferred(): { resolve: (audio: GeneratedAudio) => void; reject: (error: Error) => void } {
    let resolve!: (audio: GeneratedAudio) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<GeneratedAudio>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.outcomes.push(() => promise);
    return { resolve, reject };
  }

  generate(request: AudioGenerationRequest): Promise<GeneratedAudio> {
    this.calls.push(request);
    const next = this.outcomes.shift() ?? this.fallback;
    if (!next) {
      throw new Error(
        "StubAudioGenerationService: call resolveWith()/rejectWith()/deferred() before generate().",
      );
    }
    return next();
  }
}
