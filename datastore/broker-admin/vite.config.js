import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';
import checker from 'vite-plugin-checker';

const outDir = process.env.BUILD_DIR ?? 'build';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
    outDir: fileURLToPath(new URL(`../../${outDir}/datastore/broker/admin-ui`, import.meta.url)),
    // needed for commonjs to be activated for @ulixee deps
    commonjsOptions: { include: [] },
    emptyOutDir: true,
    sourcemap: 'inline',
    target: 'es2020',
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          whitespace: 'preserve',
        },
      },
    }),
    svgLoader({
      svgoConfig: {
        multipass: true,
      },
    }),
    checker({
      vueTsc: true,
      typescript: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
