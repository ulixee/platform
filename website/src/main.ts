import { createApp } from 'vue'
import InlineSvg from 'vue-inline-svg';

import App from './App.vue'
import mainLayout from './layouts/MainLayout.vue';
import router from './router'

import Prism from 'prismjs';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

import './index.css';
import 'prismjs/themes/prism.css';
import '@/assets/scss/code.scss';
import '@/assets/scss/line-numbers.scss';
import '@/assets/scss/DocsPage.scss';

const app = createApp(App);
app.use(router);
app.component('MainLayout', mainLayout);
app.component('InlineSvg', InlineSvg);
app.mount('#app');

export { app, Prism };