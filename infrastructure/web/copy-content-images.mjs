// Copies the course illustrations (content/images) into public/content-images before dev/build,
// so the web serves exactly the images the content and the books use. The target is generated.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../content/images");
const target = path.resolve(here, "../../apps/web/public/content-images");
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
if (existsSync(source)) {
  for (const name of readdirSync(source)) {
    if (/\.(png|jpg|webp|svg)$/.test(name))
      cpSync(path.join(source, name), path.join(target, name));
  }
}
