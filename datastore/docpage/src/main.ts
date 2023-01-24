import { createApp } from 'vue'
import InlineSvg from 'vue-inline-svg';
import App from './App.vue'
import router from './router'
import './index.css';

export const app = createApp(App);
console.log(router);
app.use(router);
app.component('InlineSvg', InlineSvg);
app.mount('#app');
