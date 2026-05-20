import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { exec } from "node:child_process";
import { loadProfile } from "./profile";
import { runAgent } from "./llm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function parseArgs(argv: string[]): { request: string; open: boolean } {
  const positional: string[] = [];
  let open = false;
  for (const arg of argv) {
    if (arg === "--open") open = true;
    else positional.push(arg);
  }
  return { request: positional.join(" ").trim(), open };
}

async function main() {
  const { request, open } = parseArgs(process.argv.slice(2));
  if (!request) {
    process.stderr.write(
      'usage: pnpm agent "<request>" [--open]\n  e.g. pnpm agent "fragrance-free moisturizer for combination skin under $35"\n',
    );
    process.exit(2);
  }
  const profile = loadProfile(ROOT);
  const { chosen, considered } = await runAgent(request, profile);

  process.stdout.write(JSON.stringify({ chosen, considered }, null, 2) + "\n");

  if (open && chosen.checkout_url) {
    const opener =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(`${opener} ${JSON.stringify(chosen.checkout_url)}`);
  }
}

main().catch((err) => {
  process.stderr.write(`agent failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
