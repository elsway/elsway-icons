import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
// Vercel (root) → base "/"; GitHub Pages (subpath) → "/elsway-icons/"
const base = process.env.VERCEL || process.env.VITE_BASE === "/"
  ? "/"
  : "/elsway-icons/";

export default defineConfig({
  base,
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./public"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
