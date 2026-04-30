import { spawnSync } from "node:child_process";

const grepIndex = process.argv.indexOf("--grep");
const pattern = grepIndex >= 0 ? process.argv[grepIndex + 1] : "@ui-smoke";
const result = spawnSync("pnpm", ["exec", "vitest", "run", "--testNamePattern", pattern], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
