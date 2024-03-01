import { defineConfig } from 'vite';
import prismjs from 'vite-plugin-prismjs';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import svgLoader from 'vite-svg-loader';
import checker from 'vite-plugin-checker';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        desktop: fileURLToPath(new URL('./desktop.html', import.meta.url)),
        menubar: fileURLToPath(new URL('./menubar.html', import.meta.url)),
        'menu-finder': fileURLToPath(new URL('./menu-finder.html', import.meta.url)),
        'menu-primary': fileURLToPath(new URL('./menu-primary.html', import.meta.url)),
        'menu-timetravel': fileURLToPath(new URL('./menu-timetravel.html', import.meta.url)),
        'menu-url': fileURLToPath(new URL('./menu-url.html', import.meta.url)),
        'screen-about': fileURLToPath(new URL('./screen-about.html', import.meta.url)),
        'screen-input': fileURLToPath(new URL('./screen-input.html', import.meta.url)),
        'screen-output': fileURLToPath(new URL('./screen-output.html', import.meta.url)),
        'screen-reliability': fileURLToPath(new URL('./screen-reliability.html', import.meta.url)),
        toolbar: fileURLToPath(new URL('./toolbar.html', import.meta.url)),
        resources: fileURLToPath(new URL('./extension/resources.html', import.meta.url)),
        'hero-script': fileURLToPath(new URL('./extension/hero-script.html', import.meta.url)),
        'state-generator': fileURLToPath(
          new URL('./extension/state-generator.html', import.meta.url),
        ),
      },
    },
    outDir: fileURLToPath(new URL('../../build/desktop/main/app/ui', import.meta.url)),
    target: 'chrome120',
    // needed for commonjs to be activated for @ulixee deps
    commonjsOptions: { include: [] },
    emptyOutDir: false,
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
        multipass: true
      }
    }),
    prismjs({
      languages: ['javascript', 'typescript', 'shell'],
    }),
    checker({
      vueTsc: true,
      typescript: true
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
