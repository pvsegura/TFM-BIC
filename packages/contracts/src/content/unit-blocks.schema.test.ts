import { UNIT_SECTION_PHASES } from "@verbysia/domain";
import { describe, expect, it } from "vitest";

import { contentBlockSchema, UNIT_SECTION_PHASE_VALUES } from "./content-block.schema.js";

const valid = [
  { type: "section", phase: "perceive", title: "Dialog w kawiarni" },
  { type: "reading", title: "Mi barrio", paragraphs: ["Vivo en un barrio tranquilo."] },
  { type: "culture", title: "Hiszpańskie godziny", paragraphs: ["Obiad jemy około 14:00."] },
  { type: "pitfall", wrong: "Soy cansado.", right: "Estoy cansado.", explanation: "Stan: estar." },
  { type: "comparison", source: "Mam 30 lat.", target: "Tengo 30 años.", note: "tener" },
  {
    type: "table",
    caption: "ser",
    columns: ["osoba", "forma"],
    rows: [
      ["yo", "soy"],
      ["tú", "eres"],
    ],
  },
  { type: "mission", title: "Zamów kawę", steps: ["Przywitaj się.", "Zamów."] },
  {
    type: "summary",
    phrases: [{ text: "¿Cuánto es?", translation: "Ile płacę?" }],
    canDo: ["zamówić kawę"],
  },
];

describe("unit block types (books and web share them)", () => {
  it.each(valid)("accepts a $type block", (block) => {
    expect(contentBlockSchema.safeParse(block).success).toBe(true);
  });

  it("refuses a table row with the wrong number of cells", () => {
    const table = { type: "table", columns: ["a", "b"], rows: [["only one"]] };
    expect(contentBlockSchema.safeParse(table).success).toBe(false);
  });

  it("refuses an unknown section phase and markup in a reading", () => {
    expect(
      contentBlockSchema.safeParse({ type: "section", phase: "listen", title: "x" }).success,
    ).toBe(false);
    expect(
      contentBlockSchema.safeParse({ type: "reading", title: "x", paragraphs: ["<b>x</b>"] })
        .success,
    ).toBe(false);
  });

  it("lists the same section phases as the domain", () => {
    expect([...UNIT_SECTION_PHASE_VALUES]).toEqual([...UNIT_SECTION_PHASES]);
  });
});
