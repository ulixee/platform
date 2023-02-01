import { createApp } from 'vue'
import InlineSvg from 'vue-inline-svg';
import App from './App.vue'
import router from './router'
import './index.css';

export const serverDetailsPromise = fetch('/server-details').then(r => r.json()).then(d => d || {});
export const app = createApp(App);
app.use(router);
app.component('InlineSvg', InlineSvg);
app.mount('#app');
