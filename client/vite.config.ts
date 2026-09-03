import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "chase-tag-shared": fileURLToPath(new URL("../shared/src/browser.ts", import.meta.url)),
    },
    dedupe: ["@colyseus/schema"],
  },
  server: {
    port: 3000,
  },
});
