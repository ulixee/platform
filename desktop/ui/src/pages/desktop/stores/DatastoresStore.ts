import { defineStore, storeToRefs } from 'pinia';
import { computed, Ref, ref } from 'vue';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import type IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import moment from 'moment';
import type IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import { Client } from '@/api/Client';
import ICloudConnection from '@/api/ICloudConnection';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';

export type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result']['datastores'];
export type IDatastoreMeta = IDatastoreApiTypes['Datastore.meta']['result'];
export type TCredit = { datastoreUrl: string; microgons: number };

export type IDatastoresByVersion = {
  [versionHash: string]: {
    summary: IDatastoreList[0];
    datastore: IDatastoreMeta;
    createdCredits: { credit: TCredit; filename: string; cloud: string }[];
    adminIdentity: string;
    isInstalled: boolean;
    deploymentsByCloud: { [cloud: string]: IDatastoreList[0] };
  };
};

export const useDatastoreStore = defineStore('datastoreStore', () => {
  const cloudsStore = useCloudsStore();
  const { clouds } = storeToRefs(cloudsStore);

  const installedDatastoreVersions = new Set<string>();
  const datastoreAdminIdentities = ref<{ [versionHash: string]: string }>({});
  const userQueriesByDatastore = ref<{
    [versionHash: string]: { [queryId: string]: IQueryLogEntry };
  }>({});

  const datastoresByVersion = ref<IDatastoresByVersion>({});

  function onDeployed(event: IDatastoreDeployLogEntry) {
    const { versionHash, cloudHost, adminIdentity } = event;
    const entry = datastoresByVersion.value[versionHash];
    const cloud = cloudsStore.getCloudWithAddress(cloudHost);
    void refreshMetadata(versionHash, cloud).then(() => {
      // eslint-disable-next-line promise/always-return
      datastoresByVersion.value[versionHash].adminIdentity ??= adminIdentity;
    });
    if (entry) {
      entry.adminIdentity ??= adminIdentity;
    }
  }

  document.addEventListener('desktop:event', evt => {
    const { eventType, data } = (evt as CustomEvent).detail;
    if (eventType === 'Datastore.onDeployed') {
      onDeployed(data);
    }
    if (eventType === 'User.onQuery') {
      const query = data as IQueryLogEntry;
      userQueriesByDatastore.value[query.versionHash] ??= {};
      userQueriesByDatastore.value[query.versionHash][query.id] = query;
    }
  });

  function getWithHash(versionHash: string): { summary: IDatastoreList[0]; cloud: string } {
    const entry = datastoresByVersion.value[versionHash];
    if (entry) {
      const deployments = Object.entries(entry.deploymentsByCloud);
      deployments.sort((a, b) => {
        if (a[0] === 'public') return -1;
        if (b[0] === 'public') return 1;
        if (a[0] === 'private') return -1;
        if (b[0] === 'private') return 1;
        return 0;
      });
      const [cloud, summary] = deployments[0];
      return { summary, cloud };
    }
  }

  function refreshMetadata(versionHash: string, cloudName = 'local'): Promise<void> {
    const cloud = clouds.value.find(x => x.name === cloudName);
    const client = cloud.clientsByAddress.values().next().value;
    return client.send('Datastore.meta', { versionHash }).then(x => onDatastoreMeta(x, cloud));
  }

  function findAdminIdentity(versionHash: string) {
    void window.desktopApi
      .send('Datastore.findAdminIdentity', versionHash)
      .then(x => (datastoresByVersion.value[versionHash].adminIdentity = x));
  }

  function getCloudAddress(versionHash: string, cloudName: string): URL {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    const cloudAddress = new URL(`/${versionHash}`, cloudHost);
    cloudAddress.protocol = 'ulx:';
    return cloudAddress;
  }

  async function runQuery(versionHash: string, query: string): Promise<void> {
    const datastore = datastoresByVersion.value[versionHash];
    const cloudName = Object.keys(datastore.deploymentsByCloud)[0];
    const cloudHost = cloudsStore.getCloudHost(cloudName);

    const queryStart = await window.desktopApi.send('Datastore.query', {
      versionHash,
      cloudHost,
      query,
    });
    userQueriesByDatastore.value[versionHash] ??= {};
    userQueriesByDatastore.value[versionHash][queryStart.id] = queryStart;
  }

  function openDocs(versionHash: string, cloudName: string) {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    const docsUrl = new URL(`/${versionHash}/`, cloudHost);
    docsUrl.protocol = 'http:';

    const credits = useWalletStore().userBalance.credits.filter(
      x => x.datastoreVersionHash === versionHash,
    );
    const credit = credits.find(x => x.remainingBalance > 0) ?? credits[0];
    if (credit) {
      docsUrl.search = `?${credit.creditsId}`;
    }

    const left = window.screenLeft + 25;
    const top = window.screenTop + 25;
    const features = `top=${top},left=${left},width=${window.outerWidth},height=${window.outerHeight}`;
    window.open(docsUrl.href, `Docs${versionHash}`, features);
  }

  function getAdminDetails(versionHash: string, cloudName: string): Ref<string> {
    const datastore = datastoresByVersion.value[versionHash];

    const adminIdentity = computed(() => datastore.adminIdentity);
    datastore.adminIdentity ??= getDatastoreAdminIdentity(versionHash, cloudName);

    return adminIdentity;
  }

  async function deploy(datastore: IDatastoreList[0], cloudName: string): Promise<void> {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    await window.desktopApi.send('Datastore.deploy', {
      versionHash: datastore.versionHash,
      cloudName,
      cloudHost,
    });
  }

  async function installDatastore(versionHash: string, cloud = 'local'): Promise<void> {
    const entry = datastoresByVersion.value[versionHash];
    const cloudHost = cloudsStore.getCloudHost(cloud);

    await window.desktopApi.send('Datastore.install', {
      cloudHost,
      datastoreVersionHash: versionHash,
    });
    installedDatastoreVersions.add(versionHash);
    entry.isInstalled = true;
  }

  async function installDatastoreByUrl(datastore: IDatastoreList[0], url: string): Promise<void> {
    const datastoreUrl = new URL(url);
    datastoreUrl.protocol = 'ws:';
    const datastoreVersionHash = datastore.versionHash;
    const entry = datastoresByVersion.value[datastore.versionHash];

    await window.desktopApi.send('Datastore.install', {
      cloudHost: datastoreUrl.host,
      datastoreVersionHash,
    });
    installedDatastoreVersions.add(datastore.versionHash);
    entry.isInstalled = true;
  }

  async function getByUrl(url: string): Promise<IDatastoreList[0]> {
    if (!url.includes('://')) url = `ws://${url}`;
    const datastoreUrl = new URL(url);
    datastoreUrl.protocol = 'ws:';
    const versionHash = datastoreUrl.pathname.slice(1);

    if (datastoresByVersion.value[versionHash]?.summary)
      return datastoresByVersion.value[versionHash].summary;

    await cloudsStore.connectToCloud(datastoreUrl.host, `${datastoreUrl.host}`);

    const endDate = moment().add(5, 'seconds').toDate().getTime();
    while (Date.now() < endDate) {
      const datastore = datastoresByVersion.value[versionHash]?.summary;
      if (datastore) return datastore;
      await new Promise(requestAnimationFrame);
    }
  }

  async function onClient(cloud: ICloudConnection, client: Client<'desktop'>): Promise<void> {
    client.removeEventListeners('Datastore.new');
    client.on('Datastore.new', x => onDatastoreMeta(x.datastore, cloud));
    client.removeEventListeners('Datastore.stats');
    client.on('Datastore.stats', x => updateStats(x.versionHash, cloud.name, x.stats));
    client.removeEventListeners('Datastore.stopped');
    client.on('Datastore.stopped', x => onDatastoreStopped(x.versionHash, cloud.name));

    const results = await client.send('Datastores.list', {});
    if (!results) return;
    const { datastores, count } = results;
    for (const datastore of datastores) {
      onDatastoreSummary(datastore, cloud);
    }
    cloud.datastores = count;
  }

  function onDatastoreStopped(versionHash: string, cloudName: string) {
    if (datastoresByVersion.value[versionHash]?.datastore) {
      datastoresByVersion.value[versionHash].datastore.isStarted = false;
    }
    if (datastoresByVersion.value[versionHash]?.deploymentsByCloud[cloudName]) {
      datastoresByVersion.value[versionHash].deploymentsByCloud[cloudName].isStarted = false;
    }
  }

  function onDatastoreMeta(meta: IDatastoreMeta, cloud: ICloudConnection) {
    onDatastoreSummary(meta, cloud);
    datastoresByVersion.value[meta.versionHash].datastore = meta;
    updateStats(meta.versionHash, cloud.name, meta.stats);
    let totalByCloud = 0;
    for (const entry of Object.values(datastoresByVersion.value)) {
      if (entry.deploymentsByCloud[cloud.name]) totalByCloud += 1;
    }
    if (totalByCloud > cloud.datastores) cloud.datastores = totalByCloud;
  }

  function updateStats(versionHash: string, cloudName: string, stats: IDatastoreMeta['stats']) {
    if (datastoresByVersion.value[versionHash]) {
      datastoresByVersion.value[versionHash].summary.stats = stats;
      if (datastoresByVersion.value[versionHash].deploymentsByCloud[cloudName]) {
        datastoresByVersion.value[versionHash].deploymentsByCloud[cloudName].stats = stats;
      }
    }
  }

  async function createCredit(datastore: IDatastoreList[0], argons: number, cloud: string) {
    const data = {
      argons,
      datastore: {
        versionHash: datastore.versionHash,
        name: datastore.name,
        domain: datastore.domain,
        scriptEntrypoint: datastore.scriptEntrypoint,
      },
      cloud,
    };
    const { filename, credit } = await window.desktopApi.send('Credit.create', data);
    datastoresByVersion.value[datastore.versionHash].createdCredits.push({
      credit,
      filename,
      cloud,
    });
    void refreshMetadata(datastore.versionHash, cloud);
    return { filename, credit };
  }

  function getDatastoreAdminIdentity(versionHash: string, cloudName: string) {
    return (
      datastoreAdminIdentities.value[versionHash] ??
      clouds.value.find(x => x.name === cloudName)?.adminIdentity
    );
  }

  function onDatastoreSummary(datastore: IDatastoreList[0], cloud: ICloudConnection) {
    const versionHash = datastore.versionHash;
    const cloudName = cloud.name;
    datastoresByVersion.value[versionHash] ??= {
      datastore: null,
      summary: datastore,
      deploymentsByCloud: {},
      createdCredits: [],
      isInstalled: false,
      adminIdentity: null,
    };
    userQueriesByDatastore.value[versionHash] ??= {};
    datastoresByVersion.value[versionHash].adminIdentity ??= getDatastoreAdminIdentity(
      versionHash,
      cloudName,
    );
    datastoresByVersion.value[versionHash].deploymentsByCloud[cloud.name] = datastore;
    datastoresByVersion.value[versionHash].isInstalled =
      installedDatastoreVersions.has(versionHash);
  }

  async function load() {
    const datastores = await window.desktopApi.send('Datastore.getInstalled');
    for (const { cloudHost, datastoreVersionHash } of datastores) {
      installedDatastoreVersions.add(datastoreVersionHash);
      if (!cloudsStore.connectedToHost(cloudHost) && !cloudHost.includes('localhost:1818')) {
        await cloudsStore.connectToCloud(cloudHost, `Installed from ${cloudHost}`);
      }
    }

    const adminIdentities = await window.desktopApi.send('Desktop.getAdminIdentities');
    datastoreAdminIdentities.value = adminIdentities.datastoresByVersion;

    const userQueries = await window.desktopApi.send('User.getQueries');
    for (const query of userQueries) {
      userQueriesByDatastore.value[query.versionHash] ??= {};
      userQueriesByDatastore.value[query.versionHash][query.id] = query;
    }
  }

  void load();

  return {
    datastoresByVersion,
    userQueriesByDatastore,
    getAdminDetails,
    getByUrl,
    createCredit,
    deploy,
    getCloudAddress,
    runQuery,
    getWithHash,
    installDatastore,
    installDatastoreByUrl,
    onClient,
    load,
    refreshMetadata,
    findAdminIdentity,
    openDocs,
    async refresh() {
      for (const cloud of clouds.value) {
        const client = cloud.clientsByAddress.values().next().value;
        if (client) await onClient(cloud, client);
      }
    },
  };
});
