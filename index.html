import { defineConfig } from 'vite';

// This builds ONLY the UI (index.html + src/ui.ts). The sandboxed
// plugin.ts is bundled separately by esbuild (see package.json ->
// "build:plugin"), because Penpot's plugin script runs in a locked-down
// SES sandbox and must ship as a single plain iife script, not a Vite
// module graph.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    port: 4400,
    cors: true,
  },
});
