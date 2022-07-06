import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Index from "../pages/Index.vue";
import Documentation from '../pages/Documentation.vue';

const roadmapNames = [
  'Argon',
  'Bonds',
  'ChromeAlive',
  'Pipeline',
  'Databox',
  'Domain',
  'DoubleAgent',
  'Hero',
  'Manager',
  'Marketplace',
  'NFTs',
  'Stream',
  'ScraperReport',
  'Server',
  'Sidechain'
];

const releasedToolNames = [
  'Hero',
  'ChromeAlive',
  'Databox',
  'Server',
  'Stream'
];

const basicRoutes: Array<RouteRecordRaw> = [
  {
    path: "/",
    component: Index,
  },
  {
    path: "/getting-started",
    component: () => import("../pages/GettingStarted.vue"),
  },
  {
    path: "/developer-environment",
    component: () => import("../pages/DeveloperEnvironment.vue"),
  },
  {
    path: "/unblocked",
    component: () => import("../pages/Unblocked.vue"),
  },
  {
    path: "/roadmap",
    component: () => import("../pages/roadmap/Index.vue"),
  },
  {
    path: "/code-of-conduct",
    component: () => import("../pages/contribute/CodeOfConduct.vue"),
  },
  {
    path: "/how-to-contribute",
    component: () => import("../pages/contribute/HowToContribute.vue"),
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

const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 70,
      };
    }

    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
  history: createWebHistory(process.env.BASE_URL),
  routes: [
    ...basicRoutes,
    ...productRoutes,
  ],
});

export default router;
