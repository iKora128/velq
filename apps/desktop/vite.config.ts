import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error — process is a Node global available in the Vite config context.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // CM6 cores are singletons — a double-bundle silently breaks decorations.
    dedupe: ["@codemirror/state", "@codemirror/view", "@lezer/common"],
  },

  // 1. Don't obscure Rust errors during `tauri dev`.
  clearScreen: false,
  // 2. Tauri exposes env vars under these prefixes to the frontend.
  envPrefix: ["VITE_", "TAURI_ENV_*"],

  build: {
    // The webview is modern (WKWebView / WebView2 / WebKitGTK) — ship esnext.
    target: "esnext",
  },

  // 3. Tauri expects a fixed port and fails if it isn't available.
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 4. Don't watch the Rust side.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
