import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Organization from '@/pages/Organization.vue';
import Organizations from '@/pages/Organizations.vue';
import Whitelist from '@/pages/Whitelist.vue';
import Index from '../pages/Index.vue';

const basicRoutes: Array<RouteRecordRaw> = [
  {
    name: 'home',
    path: `/`,
    component: Index,
  },
  {
    name: 'root',
    path: ``,
    component: Index,
  },
  {
    name: 'organizations',
    path: '/organizations',
    component: Organizations,
  },
  {
    name: 'organization',
    path: '/organizations/:id',
    component: Organization,
  },
  {
    name: 'whitelist',
    path: '/whitelist',
    component: Whitelist,
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
    timeout -= delay;
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
    }
    return { top: 0 };
  },
  history: createWebHistory(process.env.BASE_URL || '/'),
  routes: [...basicRoutes],
});

export default router;
