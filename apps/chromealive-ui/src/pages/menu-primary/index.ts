import { createApp } from 'vue';
import App from './index.vue';
import './index.css';

createApp(App).mount('#app');

window.addEventListener('blur', () => {
  // @ts-ignore
  setTimeout(window.hideMenu);
});
