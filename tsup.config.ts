import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  // The 3D Secure browser module (and its own dependencies) is bundled into dist,
  // so it never appears in the integrator's dependency tree.
  noExternal: [/^marlim-sdk-3ds(\/|$)/, /^zod(\/|$)/],
});

