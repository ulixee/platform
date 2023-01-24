import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Index from '../pages/Index.vue';

const basicRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Index,
  },
  {
    path: '/query-example',
    component: () => import('../pages/QueryExample.vue'),
  },
  {
    path: '/clone-it',
    component: () => import('../pages/CloneIt.vue'),
  },
  {
    path: '/free-credits',
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
  routes: [...basicRoutes ],
});

export default router;