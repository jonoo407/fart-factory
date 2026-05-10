import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fart-factory/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
