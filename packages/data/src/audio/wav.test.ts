import { describe, expect, it } from "vitest";

import { encodeWavPcm16, isWav } from "./wav.js";

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

describe("encodeWavPcm16", () => {
  it("writes a canonical 44-byte RIFF/WAVE header for 16-bit mono PCM", () => {
    const wav = encodeWavPcm16(new Int16Array([0, 1, -1]), 24000);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    expect(wav.byteLength).toBe(44 + 6);
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint32(28, true)).toBe(48000); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(1);
    expect(view.getInt16(48, true)).toBe(-1);
  });

  it("is deterministic", () => {
    const samples = new Int16Array([5, 6, 7]);
    expect(encodeWavPcm16(samples, 8000)).toEqual(encodeWavPcm16(samples, 8000));
  });
});

describe("isWav", () => {
  it("recognises a RIFF/WAVE file and nothing else", () => {
    expect(isWav(encodeWavPcm16(new Int16Array(1), 24000))).toBe(true);
    expect(isWav(new TextEncoder().encode("RIFF....AVI "))).toBe(false);
    expect(isWav(new TextEncoder().encode("ID3 not a wav"))).toBe(false);
    expect(isWav(new Uint8Array(4))).toBe(false);
  });
});
