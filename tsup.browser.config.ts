import { defineConfig } from 'tsup';

// Script-tag build: one self-contained file that sets `window.UpagJs`.
// Runs after the main build (see the `build` script), which cleans `dist` first.
export default defineConfig({
  entry: { upag: 'src/browser.ts' },
  format: ['iife'],
  platform: 'browser',
  dts: false,
  clean: false,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  // Nothing is left external: a plain <script> has no way to resolve imports.
  noExternal: [/.*/],
  // tsup would name it `upag.global.js`.
  outExtension: () => ({ js: '.js' }),
});
