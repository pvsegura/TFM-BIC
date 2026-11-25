/**
 * Course illustrations generated with the Gemini API (PLAN-LIBROS.md §11.2: AI images are one of
 * the three sources). Reads content/images/plan.json — [{ asset, prompt }] — and creates every
 * asset that does not exist yet in content/images, recording its source in credits.json.
 *
 *   packages/data/node_modules/.bin/tsx infrastructure/images/generate-images.mts [--limit n] [--dry-run]
 *
 * The key is read from the environment or from the git-ignored .env.media.local (same as the
 * media pipeline) and never printed. Image generation is a paid Gemini feature (no free tier):
 * the script prints the estimated cost before calling and stops at --limit (default 3).
 * Docs: aistudio.google.com/docs/image-generation (Interactions API, Api-Revision 2026-05-20).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IMAGES = path.join(repoRoot, "content/images");
const PLAN = path.join(IMAGES, "plan.json");
const CREDITS = path.join(IMAGES, "credits.json");
const ENV_FILE = path.join(repoRoot, ".env.media.local");
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";
const PRICE_USD = 0.0336;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** One house style for every illustration: prints well in black & white, no text to get wrong. */
const STYLE =
  "Simple, friendly black line-art illustration for a language textbook. Clean even outlines, " +
  "white background, no shading, no colour fills. Absolutely no text, letters, numbers, logos, " +
  "maps, signs, posters, screens with writing or book covers with writing. " +
  "Modern, inclusive, adults. Scene: ";

interface PlanItem {
  asset: string;
  prompt: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Finds the first base64 image payload anywhere in the response (the docs show no raw JSON). */
function findImage(node: unknown): string | undefined {
  if (node === null || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  const data = record.data;
  if (
    typeof data === "string" &&
    data.length > 1000 &&
    /^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))
  ) {
    return data;
  }
  for (const value of Object.values(record)) {
    const found = Array.isArray(value) ? value.map(findImage).find(Boolean) : findImage(value);
    if (found) return found;
  }
  return undefined;
}

async function generate(key: string, prompt: string): Promise<Buffer> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: "text", text: STYLE + prompt }],
      response_format: { type: "image", aspect_ratio: "4:3", image_size: "1K" },
    }),
  });
  const text = await response.text();
  if (!response.ok) {
    // The error body never contains the key; show only its first part.
    throw new Error(`Gemini answered ${String(response.status)}: ${text.slice(0, 400)}`);
  }
  const image = findImage(JSON.parse(text) as unknown);
  if (!image) throw new Error(`No image in the response: ${text.slice(0, 300)}`);
  return Buffer.from(image, "base64");
}

async function main() {
  const plan = JSON.parse(readFileSync(PLAN, "utf8")) as PlanItem[];
  const credits = JSON.parse(readFileSync(CREDITS, "utf8")) as Record<string, unknown>;
  const missing = plan.filter((item) => !existsSync(path.join(IMAGES, item.asset)));
  const limit = Number(arg("limit") ?? 3);
  const batch = missing.slice(0, limit);
  console.log(
    `${String(missing.length)} missing, generating ${String(batch.length)} with ${MODEL} (≈ $${(batch.length * PRICE_USD).toFixed(2)})`,
  );
  if (process.argv.includes("--dry-run") || batch.length === 0) return;

  if (!process.env.GEMINI_API_KEY && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not configured (.env.media.local).");

  for (const item of batch) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(item.asset))
      throw new Error(`Bad asset name ${item.asset}`);
    const png = await generate(key, item.prompt);
    writeFileSync(path.join(IMAGES, item.asset), png);
    credits[item.asset] = {
      source: "ai",
      tool: `Google Gemini API (${MODEL})`,
      licence: "Generated for Verbysia with the Gemini API; carries Google's SynthID watermark.",
    };
    writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);
    console.log(`wrote ${item.asset} (${String(Math.round(png.length / 1024))} KB)`);
  }
}

await main();
