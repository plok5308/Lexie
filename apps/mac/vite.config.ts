import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
