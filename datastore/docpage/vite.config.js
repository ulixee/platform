import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import prismjs from 'vite-plugin-prismjs';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';

const outDir = process.env.BUILD_DIR ?? 'build';
const isDevelopment = !['production', 'test'].includes(process.env.NODE_ENV);

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
  base: isDevelopment ? undefined : './',
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
    outDir: fileURLToPath(new URL(`../../${outDir}/datastore/docpage/dist`, import.meta.url)),
    // needed for commonjs to be activated for @ulixee deps
    commonjsOptions: { include: [/prismjs/] },
    emptyOutDir: true,
    sourcemap: 'inline',
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
    prismjs({
      languages: ['javascript', 'typescript', 'shell'],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
