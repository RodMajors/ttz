import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = process.platform === "win32" ? "tsc.cmd" : "tsc";
const node = process.execPath;
const build = spawnSync(tsc, ["-p", "tsconfig.build.json"], { cwd: appRoot, stdio: "inherit", shell: process.platform === "win32" });
if (build.status !== 0) process.exit(build.status ?? 1);

const copy = spawnSync(
  node,
  ["scripts/copy-assets.mjs", ...(process.argv.includes("--local-dev-auth") ? ["--local-dev-auth"] : [])],
  { cwd: appRoot, stdio: "inherit" },
);
process.exit(copy.status ?? 1);
