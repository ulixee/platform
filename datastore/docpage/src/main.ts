import { createApp } from 'vue';
import InlineSvg from 'vue-inline-svg';
import IDocpageConfig from '@ulixee/datastore-packager/interfaces/IDocpageConfig';
import App from './App.vue';
import router from './router';
import './index.css';

export const serverDetailsPromise = fetch('/server-details')
  .then(r => r.json())
  .then(d => d || {});

export const docpageConfigPromise = fetch('docpage.json')
  .then(r => r.json())
  .then(d => (d || {}) as IDocpageConfig);

export const app = createApp(App);
app.use(router);
app.component('InlineSvg', InlineSvg);
app.mount('#app');
