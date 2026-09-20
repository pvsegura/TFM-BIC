import { isValidLocaleForLanguage, LEVEL_STATUSES, TEXT_DIRECTIONS } from "@tfm-bic/domain";
import { z } from "zod";

import { plainText } from "./content-block.schema.js";
import { languageIdSchema, levelIdSchema } from "./identifiers.schema.js";

/** The format version of the content files. Bump it (and migrate the files)
 * when the file shape changes incompatibly, so old files fail loudly. */
export const CONTENT_SCHEMA_VERSION = 1;

/**
 * `content/languages/<code>/language.json` — a language's metadata and which
 * CEFR levels it offers. Strict: an unknown key is an error, not ignored.
 */
export const languageFileSchema = z
  .strictObject({
    schemaVersion: z.literal(CONTENT_SCHEMA_VERSION),
    code: languageIdSchema,
    name: plainText(60),
    nativeName: plainText(60),
    locale: z.string().min(2).max(35),
    direction: z.enum(TEXT_DIRECTIONS),
    isActive: z.boolean(),
    levels: z
      .array(z.strictObject({ id: levelIdSchema, status: z.enum(LEVEL_STATUSES) }))
      .min(1)
      .max(6),
  })
  .refine((file) => isValidLocaleForLanguage(file.locale, file.code), {
    path: ["locale"],
    error: "Expected a BCP 47 locale for this language, such as pl-PL.",
  });

export type LanguageFile = z.infer<typeof languageFileSchema>;
