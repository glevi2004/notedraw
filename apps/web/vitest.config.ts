import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // vite-tsconfig-paths uses Vite 6 types while vitest bundles Vite 7 — cast suppresses the mismatch
  plugins: [tsconfigPaths() as any, react() as any],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});

