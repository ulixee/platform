import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Index from '../pages/Index.vue';

const basicRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Index,
  },
  {
    path: '/datanet/overview',
    redirect: '/datanet',
  },
  {
    path: '/datanet',
    component: () => import('../pages/datanet/Index.vue'),
  },
  {
    path: '/datanet/getting-started',
    component: () => import('../pages/datanet/GettingStarted.vue'),
  },
  {
    path: '/datanet/developer-environment',
    component: () => import('../pages/datanet/DeveloperEnvironment.vue'),
  },
  {
    path: '/datanet/unblocked',
    component: () => import('../pages/datanet/Unblocked.vue'),
  },
  {
    path: '/datanet/code-of-conduct',
    component: () => import('../pages/datanet/contribute/CodeOfConduct.vue'),
  },
  {
    path: '/datanet/how-to-contribute',
    component: () => import('../pages/datanet/contribute/HowToContribute.vue'),
  },
  {
    path: '/datanet/documentation/:docsPath(.+)',
    component: () => import('../pages/datanet/Documentation.vue'),
  },
  {
    path: '/datanet/brokers',
    component: Index,
  },
  {
    path: '/datanet/tools',
    component: Index,
  },
  {
    path: '/featured/:websiteName(.+)',
    component: Index,
  },

  // MAINCHAIN
  {
    path: '/mainchain/overview',
    redirect: '/mainchain',
  },
  {
    path: '/mainchain',
    component: () => import('../pages/mainchain/Index.vue'),
  },
  {
    path: '/mainchain/blocks',
    component: () => import('../pages/mainchain/entities/Blocks.vue'),
  },
  {
    path: '/mainchain/notaries',
    component: () => import('../pages/mainchain/entities/Notaries.vue'),
  },
  {
    path: '/mainchain/miners',
    component: () => import('../pages/mainchain/entities/Miners.vue'),
  },
  {
    path: '/mainchain/kademlia',
    component: () => import('../pages/mainchain/entities/Kademlia.vue'),
  },

  // ARGON
  {
    path: '/argon/overview',
    redirect: '/argon',
  },
  {
    path: '/argon',
    component: () => import('../pages/argon/Index.vue'),
  },

  // ECONOMY
  {
    path: '/economy',
    component: () => import('../pages/economy/Index.vue'),
  },

  // DOCUMENTATION
  {
    path: '/documentation',
    component: () => import('@/pages/documentation/Index.vue'),
  },
  {
    path: '/documentation/:docsPath(.+)',
    component: () => import('@/pages/documentation/Template.vue'),
  },

  // DISPATCHES
  {
    path: '/dispatches',
    component: () => import('../pages/dispatches/Index.vue'),
  },
  {
    path: '/dispatches/hello-world',
    component: () => import('../pages/dispatches/posts/HelloWorld.vue'),
  },

  // PULSE
  {
    path: '/pulse',
    component: () => import('@/pages/pulse/Index.vue'),
  },

  // ...roadmapNames.map(x => {
  //   return {
  //     path: `/roadmap/${x.toLowerCase()}`,
  //     component: () => import(`../pages/roadmap/${x}.vue`),
  //   }
  // }),
];

const productRoutes: Array<RouteRecordRaw> = [];
['Hero', 'Datastore', 'Cloud', 'SQL', 'Client', 'Domains', 'Desktop', 'Stream'].forEach(x => {
  const productKey = x.toLowerCase();
  productRoutes.push({
    path: `/${productKey}`,
    component: () => import(`../pages/datanet/data-tools/${productKey}/Index.vue`),
  });
  productRoutes.push({
    path: `/${productKey}/example`,
    component: () => import(`../pages/datanet/data-tools/${productKey}/Example.vue`),
  });
  productRoutes.push({
    path: `/${productKey}/roadmap`,
    component: () => import(`../pages/datanet/data-tools/${productKey}/Roadmap.vue`),
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
