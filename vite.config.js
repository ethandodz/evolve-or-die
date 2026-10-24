import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /evolve-or-die/
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
