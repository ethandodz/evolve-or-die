import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /evolve-or-die/
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', editor: 'editor.html' } },
  },
});
