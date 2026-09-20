import { defineConfig } from 'vite';

// The Pages URL is https://freddricklogan.github.io/psf-utilization-analytics/ — the base must match.
export default defineConfig({
  base: '/psf-utilization-analytics/',
  build: {
    target: 'es2022',
    sourcemap: false,
    // One entry chunk; no vendor split needed at this size. modulePreload is bundled, not inline.
    modulePreload: { polyfill: true }
  }
});
