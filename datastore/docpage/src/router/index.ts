import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Index from '../pages/Index.vue';

const matches = location.pathname.match(/(\/docs\/[a-z0-9-]+@v[\d.]+)/);
const pathPrefix = matches ? matches[1] : '';

const basicRoutes: Array<RouteRecordRaw> = [
  {
    name: 'home',
    path: `${pathPrefix}/`,
    component: Index,
  },
  {
    name: 'cloneIt',
    path: `${pathPrefix}/clone-it`,
    component: () => import('../pages/CloneIt.vue'),
  },
  {
    name: 'freeCredits',
    path: `${pathPrefix}/free-credits`,
    component: () => import('../pages/FreeCredits.vue'),
  },
];

async function tryScrollToAnchor(hash: string, timeout = 1000, delay = 100) {
  while (timeout > 0) {
    const el = document.querySelector(hash);
    if (el) {
      const offsetTop = el.getBoundingClientRect().top;
      const top = offsetTop + window.scrollY - 70;

      window.scrollTo({ top, behavior: 'auto' });
      break;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    timeout = timeout - delay;
  }
}

const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      // Required because our <RouterView> is wrapped in a <Transition>
      // So elements are mounted after a delay
      return tryScrollToAnchor(to.hash, 1000, 100);
    }

    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
  history: createWebHistory(process.env.BASE_URL || '/'),
  routes: [...basicRoutes],
});

export default router;
