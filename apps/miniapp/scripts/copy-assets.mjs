import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(appRoot, "src/miniprogram");
const outputRoot = resolve(appRoot, "miniprogram");
const allowedOutput = resolve(appRoot, "miniprogram");

if (outputRoot !== allowedOutput || !outputRoot.startsWith(appRoot)) {
  throw new Error("Refusing to write Mini Program build output outside apps/miniapp/miniprogram");
}

async function copyStaticFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    const destination = join(outputRoot, relative(sourceRoot, source));
    if (entry.isDirectory()) {
      await copyStaticFiles(source);
    } else if ([".json", ".wxml", ".wxss"].includes(extname(entry.name))) {
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination);
    }
  }
}

await copyStaticFiles(sourceRoot);
const localDevAuthEnabled = process.argv.includes("--local-dev-auth");
await writeFile(
  join(outputRoot, "config.js"),
  `export const API_BASE_URL = \"http://localhost:3001/api\";\nexport const LOCAL_DEV_AUTH_ENABLED = ${localDevAuthEnabled};\n`,
);
console.log("Copied Mini Program JSON/WXML/WXSS assets to miniprogram/.");
