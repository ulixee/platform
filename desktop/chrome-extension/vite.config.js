import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const outDir = process.env.BUILD_DIR ?? 'build';
const outputDir = fileURLToPath(new URL(`../../${outDir}/desktop/main/app/ui/`, import.meta.url));

export default defineConfig({
  root: 'src',
  build: {
    lib: {
      entry: ['content.ts', 'devtools.ts'],
    },
    outDir: outputDir,
    target: 'chrome120',
    // needed for commonjs to be activated for @ulixee deps
    commonjsOptions: { include: [] },
    emptyOutDir: false,
    sourcemap: 'inline',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
