import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
// @ts-expect-error — JS plugin, no .d.ts
import { gameEditorPlugin } from "./scripts/vite-plugin-editor.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const appDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [gameEditorPlugin()],
  server: {
    port: 5174,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(appDir, "index.html"),
        editor: resolve(appDir, "editor.html"),
      },
    },
  },
});
