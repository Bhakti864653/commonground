import fs from "fs";
import path from "path";

/**
 * Unlike `next dev`/`next build`, a standalone vitest run doesn't auto-load `.env.local` — this
 * eval script needs GROQ_API_KEY from it, so load it manually rather than adding a dotenv
 * dependency just for this one file.
 */
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
