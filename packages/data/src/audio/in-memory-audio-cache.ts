import type { AudioCache, GeneratedAudio } from "@tfm-bic/application";

export interface InMemoryAudioCacheOptions {
  maxEntries: number;
  maxBytes: number;
}

/**
 * A bounded, least-recently-used `AudioCache` in this process's memory (ADR-013). Not storage:
 * it is lost on restart and not shared between instances — a miss only costs one more
 * generation. Bounded both by entry count and total bytes, so it can never grow without limit.
 */
export class InMemoryAudioCache implements AudioCache {
  private readonly entries = new Map<string, GeneratedAudio>();
  private bytes = 0;

  constructor(private readonly options: InMemoryAudioCacheOptions) {}

  get totalBytes(): number {
    return this.bytes;
  }

  get(key: string): GeneratedAudio | undefined {
    const audio = this.entries.get(key);
    if (audio) {
      // Re-insert so iteration order stays least- to most-recently used.
      this.entries.delete(key);
      this.entries.set(key, audio);
    }
    return audio;
  }

  set(key: string, audio: GeneratedAudio): void {
    this.remove(key);
    if (audio.data.byteLength > this.options.maxBytes) {
      return;
    }
    this.entries.set(key, audio);
    this.bytes += audio.data.byteLength;

    for (const oldest of this.entries.keys()) {
      if (this.entries.size <= this.options.maxEntries && this.bytes <= this.options.maxBytes) {
        break;
      }
      this.remove(oldest);
    }
  }

  private remove(key: string): void {
    const existing = this.entries.get(key);
    if (existing) {
      this.bytes -= existing.data.byteLength;
      this.entries.delete(key);
    }
  }
}
