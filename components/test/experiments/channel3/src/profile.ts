import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ProfileSchema, type Profile } from "./types";

// Loads profile.local.json if present (gitignored personal copy), otherwise
// the committed profile.json defaults.
export function loadProfile(rootDir: string): Profile {
  const local = resolve(rootDir, "profile.local.json");
  const defaults = resolve(rootDir, "profile.json");
  const path = existsSync(local) ? local : defaults;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return ProfileSchema.parse(raw);
}
