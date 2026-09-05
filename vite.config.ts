import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Build legal documents as entry pages so their CSS references are
    // fingerprinted alongside the app instead of copied from public/.
    rollupOptions: {
      input: {
        app: 'index.html',
        notFound: '404.html',
        privacy: 'privacy/index.html',
        terms: 'terms/index.html'
      }
    }
  }
});
