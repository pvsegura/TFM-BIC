import { describe, expect, it } from "vitest";

import { InvalidVideoDefinitionIdError } from "./errors/invalid-video-definition-id.error.js";
import {
  createVideoDefinitionId,
  isValidVideoDefinitionId,
  videoDefinitionIdBelongsToLanguage,
} from "./video-definition-id.js";

describe("VideoDefinitionId", () => {
  it.each(["pl-a1-nasal-vowels-demo", "pl-greetings-intro", "xx-a1-demo"])("accepts %s", (id) => {
    expect(isValidVideoDefinitionId(id)).toBe(true);
    expect(createVideoDefinitionId(id)).toBe(id);
  });

  it.each([
    "",
    "Pl-A1-Demo",
    "pl_a1_demo",
    "pl--a1-demo",
    "-pl-a1-demo",
    "pl-a1-demo-",
    "1pl-a1-demo",
    "pl a1 demo",
    "pl/a1/demo",
    "../etc/passwd",
    "<script>",
    "pl-a1'; DROP TABLE video_generation_jobs;--",
    `pl-${"a".repeat(62)}`,
  ])("rejects %j", (id) => {
    expect(isValidVideoDefinitionId(id)).toBe(false);
    expect(() => createVideoDefinitionId(id)).toThrow(InvalidVideoDefinitionIdError);
  });

  it("is namespaced by language, so a misfiled definition can be detected", () => {
    const id = createVideoDefinitionId("pl-a1-nasal-vowels-demo");

    expect(videoDefinitionIdBelongsToLanguage(id, "pl" as never)).toBe(true);
    expect(videoDefinitionIdBelongsToLanguage(id, "en" as never)).toBe(false);
  });
});
