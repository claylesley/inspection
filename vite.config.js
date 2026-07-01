// vite.config.js
// The key change for Electron is  base: "./"
// Without it, the built index.html uses absolute paths (/assets/...)
// which Electron can't load from the filesystem.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",           // ← required for Electron
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,         // must match the URL in electron/main.js
  },
});
