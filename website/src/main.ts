import { createApp } from 'vue'
import MainLayout from './layouts/MainLayout.vue';
import InlineSvg from 'vue-inline-svg';
import App from './App.vue'
import router from './router'
import * as Prism from 'prismjs';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

import './index.css';
import 'prismjs/themes/prism.css';
import '@/assets/scss/code.scss';
import '@/assets/scss/line-numbers.scss';
import '@/assets/scss/DocsPage.scss';

export const app = createApp(App);
app.use(router);
app.component('MainLayout', MainLayout);
app.component('InlineSvg', InlineSvg);
app.mount('#app');

export { Prism };
