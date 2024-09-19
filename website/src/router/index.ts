import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Documentation from '../pages/Documentation.vue';
import Index from '../pages/Index.vue';

const _roadmapNames = [
  'Argon',
  'Bonds',
  'ChromeAlive',
  'Pipeline',
  'Datastore',
  'Domain',
  'DoubleAgent',
  'Hero',
  'Manager',
  'Marketplace',
  'NFTs',
  'Stream',
  'ScraperReport',
  'Cloud',
];

const releasedToolNames = ['Hero', 'ChromeAlive', 'Datastore', 'Cloud', 'Stream'];

const basicRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Index,
  },
  {
    path: '/getting-started',
    component: () => import('../pages/GettingStarted.vue'),
  },
  {
    path: '/developer-environment',
    component: () => import('../pages/DeveloperEnvironment.vue'),
  },
  {
    path: '/unblocked',
    component: () => import('../pages/Unblocked.vue'),
  },
  {
    path: '/roadmap',
    component: () => import('../pages/roadmap/Index.vue'),
  },
  {
    path: '/code-of-conduct',
    component: () => import('../pages/contribute/CodeOfConduct.vue'),
  },
  {
    path: '/how-to-contribute',
    component: () => import('../pages/contribute/HowToContribute.vue'),
  },
  {
    path: '/docs/:docsPath(.+)',
    component: Documentation,
  },
  // ...roadmapNames.map(x => {
  //   return {
  //     path: `/roadmap/${x.toLowerCase()}`,
  //     component: () => import(`../pages/roadmap/${x}.vue`),
  //   }
  // }),
];

const productRoutes: Array<RouteRecordRaw> = [];
releasedToolNames.forEach(x => {
  const productKey = x.toLowerCase();
  productRoutes.push({
    path: `/${productKey}`,
    component: () => import(`../pages/data-tools/${productKey}/Index.vue`),
  });
  productRoutes.push({
    path: `/${productKey}/example`,
    component: () => import(`../pages/data-tools/${productKey}/Example.vue`),
  });
  productRoutes.push({
    path: `/${productKey}/roadmap`,
    component: () => import(`../pages/data-tools/${productKey}/Roadmap.vue`),
  });
});

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
  history: createWebHistory(process.env.BASE_URL),
  routes: [...basicRoutes, ...productRoutes],
});

export default router;
