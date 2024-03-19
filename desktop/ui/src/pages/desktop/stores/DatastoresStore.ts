import { defineStore, storeToRefs } from 'pinia';
import { computed, Ref, ref } from 'vue';
import type IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import type IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import type IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { Client } from '@/api/Client';
import ICloudConnection from '@/api/ICloudConnection';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';

export type IDatastoreSummary = IDatastoreApiTypes['Datastores.list']['result']['datastores'][0];
export type IDatastoreMeta = IDatastoreApiTypes['Datastore.meta']['result'] & {
  examplesByEntityName: { [name: string]: { formatted: string; args: Record<string, any> } };
};
export type IDatastoreVersions = IDatastoreApiTypes['Datastore.versions']['result']['versions'];
export type TCredit = IArgonFile['credit'];

export type IDatastoresById = {
  [datastoreId: string]: {
    summary: IDatastoreSummary & { cloudName: string }; // aggregated stats
    details: IDatastoreMeta;
    createdCredits: { credit: TCredit; name: string; cloud: string }[];
    adminIdentity: string;
    versions?: IDatastoreVersions;
    cloudsByVersion: {
      [version: string]: string[];
    };
    isInstalled: boolean;
  };
};

export const useDatastoreStore = defineStore('datastoreStore', () => {
  const cloudsStore = useCloudsStore();
  const { clouds } = storeToRefs(cloudsStore);

  const installedDatastoreVersions = new Set<string>();
  const datastoreAdminIdentities = ref<{ [datastoreId: string]: string }>({});
  const userQueriesByDatastore = ref<{
    [datastoreId: string]: { [queryId: string]: IQueryLogEntry };
  }>({});

  const datastoresById = ref<IDatastoresById>({});

  function onDeployed(event: IDatastoreDeployLogEntry) {
    const { datastoreId, version, cloudHost, adminIdentity } = event;
    const entry = datastoresById.value[datastoreId];
    const cloud = cloudsStore.getCloudWithAddress(cloudHost);
    void refreshMetadata(datastoreId, version, cloud).then(() => {
      // eslint-disable-next-line promise/always-return
      datastoresById.value[datastoreId].adminIdentity ??= adminIdentity;
    });
    if (entry) {
      entry.adminIdentity ??= adminIdentity;
    }
  }

  window.desktopApi.on('Datastore.onDeployed', data => {
    onDeployed(data);
  });
  window.desktopApi.on('User.onQuery', query => {
    userQueriesByDatastore.value[query.datastoreId] ??= {};
    userQueriesByDatastore.value[query.datastoreId][query.queryId] = query;
  });

  function get(datastoreId: string): IDatastoreSummary {
    return datastoresById.value[datastoreId]?.summary;
  }

  function getHostedClouds(summary: IDatastoreSummary): string[] {
    return datastoresById.value[summary.id]?.cloudsByVersion[summary.version] ?? [];
  }

  function getCloud(id: string, version: string): string {
    const versionClouds = datastoresById.value[id]?.cloudsByVersion[version] ?? [];
    if (versionClouds.length > 1) return versionClouds.find(x => x !== 'local');
    return versionClouds[0];
  }

  function refreshMetadata(id: string, version: string, cloudName = 'local'): Promise<void> {
    const cloud = clouds.value.find(x => x.name === cloudName);
    const client = cloud.clientsByAddress.values().next().value;
    return client
      .send('Datastore.meta', { id, version, includeSchemasAsJson: true })
      .then(x => onDatastoreMeta(x, cloud as ICloudConnection));
  }

  function getStats(
    id: string,
    version: string,
    cloudName = 'local',
  ): Promise<IDatastoreApiTypes['Datastore.stats']['result']> {
    const cloud = clouds.value.find(x => x.name === cloudName);
    const client = cloud.clientsByAddress.values().next().value;
    return client.send('Datastore.stats', { id, version });
  }

  async function getVersions(
    id: string,
    cloudName = 'local',
    refresh = false,
  ): Promise<{ version: string; timestamp: number }[]> {
    const cloud = clouds.value.find(x => x.name === cloudName);
    const client = cloud.clientsByAddress.values().next().value;
    if (!client) return [];
    const entry = datastoresById.value[id];
    if (!entry.versions || refresh) {
      const versions = await client.send('Datastore.versions', { id });
      entry.versions = versions.versions;
    }
    return entry.versions as any;
  }

  function findAdminIdentity(datastoreId: string) {
    void window.desktopApi
      .send('Datastore.findAdminIdentity', datastoreId)
      .then(x => (datastoresById.value[datastoreId].adminIdentity = x));
  }

  function getCloudAddress(id: string, version: string, cloudName: string): URL {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    const cloudAddress = new URL(`/${id}@v${version}`, cloudHost);
    cloudAddress.protocol = 'ulx:';
    return cloudAddress;
  }

  async function runQuery(id: string, version: string, query: string): Promise<void> {
    const datastore = datastoresById.value[id];
    const cloudName = datastore.cloudsByVersion[version][0];
    const cloudHost = cloudsStore.getCloudHost(cloudName);

    const queryStart = await window.desktopApi.send('Datastore.query', {
      id,
      version,
      cloudHost,
      query,
    });
    userQueriesByDatastore.value[id] ??= {};
    userQueriesByDatastore.value[id][queryStart.queryId] = queryStart;
  }

  function openDocs(id: string, version: string, cloudName: string) {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    const docsUrl = new URL(`/${id}@v${version}/`, cloudHost);
    docsUrl.protocol = 'http:';

    const credits = useWalletStore().wallet.credits.filter(
      x => x.datastoreId === id && x.datastoreVersion === version,
    );
    const credit = credits.find(x => x.remaining > 0) ?? credits[0];
    if (credit) {
      docsUrl.search = `?${credit.creditsId}`;
    }

    window.open(docsUrl.href, `Docs${version}`);
  }

  function getDocsUrl(datastoreUrl: string): string {
    const creditUrl = new URL(datastoreUrl.replace('ulx:', 'http:'));
    const creditId = creditUrl.username;
    const secret = creditUrl.password;
    creditUrl.username = '';
    creditUrl.password = '';
    creditUrl.search = `?${creditId}:${secret}`;
    creditUrl.pathname = `${creditUrl.pathname}/free-credit`;
    return creditUrl.href;
  }

  function getAdminDetails(datastoreId: string, cloudName: string): Ref<string> {
    const datastore = datastoresById.value[datastoreId];

    const adminIdentity = computed(() => datastore.adminIdentity);
    datastore.adminIdentity ??= getDatastoreAdminIdentity(datastoreId, cloudName);

    return adminIdentity;
  }

  async function deploy(id: string, version: string, cloudName: string): Promise<void> {
    const cloudHost = cloudsStore.getCloudHost(cloudName);
    await window.desktopApi.send('Datastore.deploy', {
      id,
      version,
      cloudName,
      cloudHost,
    });
  }

  async function installDatastore(id: string, version: string, cloud = 'local'): Promise<void> {
    const entry = datastoresById.value[id];
    const cloudHost = cloudsStore.getCloudHost(cloud);

    await window.desktopApi.send('Datastore.install', {
      cloudHost,
      id,
      version,
    });
    installedDatastoreVersions.add(`${id}_${version}`);
    entry.isInstalled = true;
  }

  async function uninstallDatastore(id: string, version: string, cloud = 'local'): Promise<void> {
    const entry = datastoresById.value[id];
    const cloudHost = cloudsStore.getCloudHost(cloud);

    await window.desktopApi.send('Datastore.uninstall', {
      cloudHost,
      id,
      version,
    });
    installedDatastoreVersions.delete(`${id}_${version}`);
    entry.isInstalled = false;
  }

  async function installDatastoreByUrl(datastore: IDatastoreSummary, url: string): Promise<void> {
    const datastoreUrl = new URL(url);
    datastoreUrl.protocol = 'ws:';
    const { id, version } = datastore;
    const entry = datastoresById.value[id];

    await window.desktopApi.send('Datastore.install', {
      cloudHost: datastoreUrl.host,
      id,
      version,
    });
    installedDatastoreVersions.add(`${id}_${version}`);
    entry.isInstalled = true;
  }

  async function getByUrl(url: string): Promise<IDatastoreSummary> {
    if (!url.includes('://')) url = `ws://${url}`;
    const datastoreUrl = new URL(url);
    datastoreUrl.protocol = 'ws:';
    const [datastoreId] = datastoreUrl.pathname.slice(1).split('@v');

    if (datastoresById.value[datastoreId]?.summary)
      return datastoresById.value[datastoreId].summary;

    await cloudsStore.connectToCloud(datastoreUrl.host, `${datastoreUrl.host}`);
    console.log(datastoreUrl.pathname, datastoreId);

    const endDate = Date.now() + 5e3;
    while (Date.now() < endDate) {
      const datastore = datastoresById.value[datastoreId]?.summary;
      if (datastore) return datastore;
      await new Promise(requestAnimationFrame);
    }
  }

  async function onClient(cloud: ICloudConnection, client: Client<'desktop'>): Promise<void> {
    client.removeEventListeners('Datastore.new');
    client.on('Datastore.new', x => onDatastoreMeta(x.datastore, cloud));
    client.removeEventListeners('Datastore.stats');
    client.on('Datastore.stats', x => updateStats(x.id, x.version, cloud.name, x.stats));
    client.removeEventListeners('Datastore.stopped');
    client.on('Datastore.stopped', x => onDatastoreStopped(x.id));

    const results = await client.send('Datastores.list', {});
    if (!results) return;
    const { datastores, total } = results;
    for (const datastore of datastores) {
      onDatastoreSummary(datastore, cloud);
    }
    cloud.datastores = total;
  }

  function onDatastoreStopped(id: string) {
    if (datastoresById.value[id]?.summary) {
      datastoresById.value[id].summary.isStarted = false;
    }
    if (datastoresById.value[id]?.details) {
      datastoresById.value[id].details.isStarted = false;
    }
  }

  function onDatastoreMeta(meta: IDatastoreMeta, cloud: ICloudConnection) {
    onDatastoreSummary(meta, cloud);
    datastoresById.value[meta.id].details = meta;
    updateStats(meta.id, meta.version, cloud.name, meta.stats);
    let totalByCloud = 0;
    for (const entry of Object.values(datastoresById.value)) {
      if (entry.cloudsByVersion[meta.version]?.includes(cloud.name)) totalByCloud += 1;
    }
    if (totalByCloud > cloud.datastores) cloud.datastores = totalByCloud;
  }

  function updateStats(
    id: string,
    version: string,
    cloudName: string,
    stats: IDatastoreMeta['stats'],
  ) {
    if (datastoresById.value[id]) {
      datastoresById.value[id].summary.stats = stats;
    }
  }

  async function createCredit(datastore: IDatastoreSummary, argons: number, cloud: string) {
    const data = {
      argons,
      datastore: {
        id: datastore.id,
        version: datastore.version,
        name: datastore.name,
        scriptEntrypoint: datastore.scriptEntrypoint,
      },
      cloud,
    };
    const {
      file: { credit },
      name,
    } = await window.desktopApi.send('Credit.create', data);
    datastoresById.value[datastore.id].createdCredits.push({
      credit,
      name,
      cloud,
    });
    void refreshMetadata(datastore.id, datastore.version, cloud);
    return { name, credit };
  }

  function getDatastoreAdminIdentity(datastoreId: string, cloudName: string) {
    return (
      datastoreAdminIdentities.value[datastoreId] ??
      clouds.value.find(x => x.name === cloudName)?.adminIdentity
    );
  }

  function onDatastoreSummary(datastore: IDatastoreSummary, cloud: ICloudConnection) {
    const datastoreId = datastore.id;
    const cloudName = cloud.name;
    datastoresById.value[datastoreId] ??= {
      details: null,
      summary: { ...datastore, cloudName },
      cloudsByVersion: {},
      versions: [],
      createdCredits: [],
      isInstalled: false,
      adminIdentity: null,
    };
    userQueriesByDatastore.value[datastoreId] ??= {};

    const entry = datastoresById.value[datastoreId];
    entry.adminIdentity ??= getDatastoreAdminIdentity(datastoreId, cloudName);
    entry.cloudsByVersion[datastore.version] ??= [];
    if (!entry.cloudsByVersion[datastore.version].includes(cloud.name))
      entry.cloudsByVersion[datastore.version].push(cloud.name);
    entry.isInstalled = installedDatastoreVersions.has(`${datastore.id}_${datastore.version}`);

    entry.summary = { ...datastore, cloudName };
  }

  async function load() {
    const datastores = await window.desktopApi.send('Datastore.getInstalled');
    for (const { datastoreId, cloudHost, datastoreVersion } of datastores) {
      installedDatastoreVersions.add(`${datastoreId}_${datastoreVersion}`);
      if (!cloudsStore.connectedToHost(cloudHost) && !cloudHost.includes('localhost:1818')) {
        await cloudsStore.connectToCloud(cloudHost, `Installed from ${cloudHost}`);
      }
    }

    const adminIdentities = await window.desktopApi.send('Desktop.getAdminIdentities');
    datastoreAdminIdentities.value = adminIdentities.datastoresById;

    const userQueries = await window.desktopApi.send('User.getQueries');
    for (const query of userQueries) {
      userQueriesByDatastore.value[query.datastoreId] ??= {};
      userQueriesByDatastore.value[query.datastoreId][query.queryId] = query;
    }
  }

  void load();

  return {
    datastoresById,
    userQueriesByDatastore,
    getAdminDetails,
    getByUrl,
    getHostedClouds,
    getCloud,
    createCredit,
    deploy,
    getCloudAddress,
    getDocsUrl,
    runQuery,
    getVersions,
    get,
    getStats,
    installDatastore,
    installDatastoreByUrl,
    uninstallDatastore,
    onClient,
    load,
    refreshMetadata,
    findAdminIdentity,
    openDocs,
    async refresh() {
      for (const cloud of clouds.value) {
        const client = cloud.clientsByAddress.values().next().value;
        if (client) await onClient(cloud as ICloudConnection, client);
      }
    },
  };
});
