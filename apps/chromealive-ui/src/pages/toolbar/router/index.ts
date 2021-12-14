import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Main from '../views/Main.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Main",
    component: Main,
  }, {
    path: "/circuits",
    name: "Circuits",
    component: () => import("../views/Circuits.vue"),
  }, {
    path: "/selectors",
    name: "Selectors",
    component: () => import("../views/Selectors.vue"),
  }, {
    path: "/worlds",
    name: "Worlds",
    component: () => import("../views/Worlds.vue"),
  }, {
    path: "/output",
    name: "Output",
    component: () => import("../views/Output.vue"),
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
