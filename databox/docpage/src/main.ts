import { createApp } from 'vue'
import InlineSvg from 'vue-inline-svg';
import App from './App.vue'
import './index.css';

export const app = createApp(App);
app.component('InlineSvg', InlineSvg);
app.mount('#app');
