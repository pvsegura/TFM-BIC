import { Writable } from "node:stream";

/** A destination for the real logger configuration that keeps every JSON line, for assertions. */
export function createLogCapture() {
  const raw: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      raw.push(...chunk.toString("utf8").split("\n").filter(Boolean));
      callback();
    },
  });
  return {
    stream,
    /** Everything written, as one string — for "never contains" assertions. */
    text: () => raw.join("\n"),
    lines: () => raw.map((line) => JSON.parse(line) as Record<string, unknown>),
    byMessage: (msg: string) =>
      raw.map((line) => JSON.parse(line) as Record<string, unknown>).filter((l) => l.msg === msg),
  };
}
