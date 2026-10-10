import { defineConfig } from 'vite';

// base './' makes every built asset path relative, which is required for
// Capacitor (the Android WebView serves the files from a local origin).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
