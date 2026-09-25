const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

/**
 * Wraps signed 16-bit little-endian PCM samples in a canonical RIFF/WAVE header — the same
 * container Gemini TTS returns by default (24 kHz, mono, 16-bit PCM). Used by the fake adapter to
 * produce a real, playable clip without generating speech.
 */
export function encodeWavPcm16(samples: Int16Array, sampleRate: number, channels = 1): Uint8Array {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * BYTES_PER_SAMPLE, true);
  view.setUint16(32, channels * BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);
  samples.forEach((sample, index) => {
    view.setInt16(HEADER_BYTES + index * BYTES_PER_SAMPLE, sample, true);
  });
  return bytes;
}

/** `true` only for a RIFF container whose form type is WAVE — checked on the bytes, not a label. */
export function isWav(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) return false;
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  return tag(0) === "RIFF" && tag(8) === "WAVE";
}
