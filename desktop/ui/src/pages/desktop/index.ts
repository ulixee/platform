import { createApp } from 'vue';
import * as VueRouter from 'vue-router';
import { createPinia } from 'pinia';
import InlineSvg from 'vue-inline-svg';
import './index.css';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import Datastores from '@/pages/desktop/views/Datastores.vue';
import DatastoreDetails from '@/pages/desktop/views/datastore-details/DatastoreDetails.vue';
import Replays from '@/pages/desktop/views/Replays.vue';
import Wallet from '@/pages/desktop/views/Wallet.vue';
import GettingStarted from '@/pages/desktop/views/GettingStarted.vue';
import Clouds from '@/pages/desktop/views/Clouds.vue';
import Versions from '@/pages/desktop/views/datastore-details/Versions.vue';
import Queries from '@/pages/desktop/views/datastore-details/Queries.vue';
import Reliability from '@/pages/desktop/views/datastore-details/Reliability.vue';
import Overview from '@/pages/desktop/views/datastore-details/Overview.vue';
import CloudDetails from '@/pages/desktop/views/cloud-details/CloudDetails.vue';
import CloudDatastores from '@/pages/desktop/views/cloud-details/Datastores.vue';
import CloudConfigure from '@/pages/desktop/views/cloud-details/Configure.vue';
import CloudConnections from '@/pages/desktop/views/cloud-details/Connections.vue';
import GettingStartedHero from '@/pages/desktop/views/getting-started/Hero.vue';
import GettingStartedDeploy from '@/pages/desktop/views/getting-started/Deploy.vue';
import GettingStartedChromeAlive from '@/pages/desktop/views/getting-started/ChromeAlive.vue';
import GettingStartedDatastore from '@/pages/desktop/views/getting-started/Datastore.vue';
import GettingStartedCredit from '@/pages/desktop/views/getting-started/Credit.vue';
import GettingStartedPayment from '@/pages/desktop/views/getting-started/Payment.vue';
import GettingStartedClone from '@/pages/desktop/views/getting-started/Clone.vue';
import GettingStartedQuery from '@/pages/desktop/views/getting-started/Query.vue';
import { Client } from '@/api/Client';
import App from './index.vue';
import Entities from '@/pages/desktop/views/datastore-details/Entities.vue';

declare global {
  interface Window {
    desktopPrivateApiHost: string;
    desktopApi: Client<'internal'>;
    openedArgonFile: IArgonFile;
    appBridge: {
      send(api: string, args: any): Promise<any>;
      getPrivateApiHost(): string;
    };
  }
}

const pinia = createPinia();
const app = createApp(App);
window.desktopApi = new Client(window.appBridge.getPrivateApiHost());
window.desktopApi.connect().catch(console.error);
window.desktopApi.on('Argon.opened', data => {
  window.openedArgonFile = data;
});

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    {
      path: '/getting-started',
      component: GettingStarted,
      alias: '/',
      children: [
        { path: 'hero', alias: '', component: GettingStartedHero },
        { path: 'chromealive', component: GettingStartedChromeAlive },
        { path: 'deploy', component: GettingStartedDeploy },
        { path: 'payment', component: GettingStartedPayment },
        { path: 'query', component: GettingStartedQuery },
        { path: 'credit', component: GettingStartedCredit },
        { path: 'datastore', component: GettingStartedDatastore },
        { path: 'clone', component: GettingStartedClone },
      ],
    },
    { path: '/datastores', component: Datastores },
    {
      path: '/datastore/:datastoreId/:version',
      component: DatastoreDetails,
      children: [
        {
          path: 'overview',
          alias: '',
          name: 'Overview',
          component: Overview,
        },
        {
          path: 'queries',
          name: 'Queries',
          component: Queries,
        },
        {
          path: 'entities',
          name: 'Entities',
          component: Entities,
        },
        {
          path: 'reliability',
          name: 'Reliability',
          component: Reliability,
        },
        {
          path: 'versions',
          name: 'Versions',
          component: Versions,
        },
      ],
    },
    { path: '/replays', component: Replays },
    { path: '/clouds', component: Clouds },
    {
      path: '/cloud/:name',
      component: CloudDetails,
      children: [
        {
          path: 'datastores',
          alias: '',
          name: 'Datastores',
          component: CloudDatastores,
        },
        {
          path: 'connections',
          name: 'Connections',
          component: CloudConnections,
        },
        {
          path: 'configure',
          name: 'Configure',
          component: CloudConfigure,
        },
      ],
    },
    { path: '/wallet', component: Wallet },
  ],
});

app.use(pinia);
app.use(router);
app.component('InlineSvg', InlineSvg);
app.mount('#app');
