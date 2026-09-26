import { afterEach, describe, expect, it, vi } from "vitest";

import { saveTextFile } from "./browser-download.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("saveTextFile", () => {
  it("offers the content as a download under the given name and releases the object URL", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    saveTextFile("data.json", '{"a":1}', "application/json");

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("data.json");
    expect(anchor.href).toBe("blob:export");
    expect(anchor.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });
});
