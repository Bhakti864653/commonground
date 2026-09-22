import { defineConfig } from "vitest/config";
import path from "path";

/**
 * A separate config just for `.eval.ts` files (live-Groq safety evals), since vitest's `run
 * <path>` still filters against the main config's `include` glob rather than overriding it —
 * passing an explicit path alone isn't enough to run a file the default config excludes.
 * Deliberately no jsdom environment (these are plain Node calls to askGuide, not component
 * tests) and no setupFiles, so this stays cheap and separate from the component-test config.
 */
export default defineConfig({
  test: {
    include: ["**/*.eval.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.eval.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
