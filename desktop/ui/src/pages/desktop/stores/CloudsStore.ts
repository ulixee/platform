import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ICloudConnected } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import { Client } from '@/api/Client';
import ICloudConnection from '@/api/ICloudConnection';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useReplaysStore } from '@/pages/desktop/stores/ReplaysStore';

export const useCloudsStore = defineStore('cloudsStore', () => {
  const clouds = ref<ICloudConnection[]>([
    { name: 'public', type: 'public', nodes: 0, datastores: 0, clientsByAddress: new Map() },
    { name: 'local', type: 'local', nodes: 0, datastores: 0, clientsByAddress: new Map() },
  ]);

  function getCloudName(name: string): string {
    if (name === 'public') return 'Public Cloud';
    if (name === 'local') return 'Local Development Cloud';
    return name;
  }

  function getPublicCloudUrl(): string {
    return 'ulx://cloud.ulixee.org';
  }

  function connectedToHost(host: string): boolean {
    for (const cloud of clouds.value) {
      for (const address of cloud.clientsByAddress.keys()) {
        if (address.includes(host)) return true;
      }
    }
  }

  function getCloudWithAddress(cloudAddress: string): string {
    for (const cloud of clouds.value) {
      if (cloud.clientsByAddress.has(cloudAddress)) return cloud.name;
      for (const address of cloud.clientsByAddress.keys()) {
        if (address.includes(cloudAddress)) return cloud.name;
      }
    }
  }

  function getAdmin(name: string): string {
    return clouds.value.find(x => x.name === name)?.adminIdentity;
  }

  function getCloudHost(cloudName: string): string {
    return clouds.value
      .find(x => x.name === cloudName)
      .clientsByAddress.keys()
      .next().value;
  }

  function getCloudClient(cloudName: string): Client<'desktop'> {
    return clouds.value
      .find(x => x.name === cloudName)
      .clientsByAddress.values()
      .next().value;
  }

  async function attachIdentity(cloud: ICloudConnection) {
    const identity = await window.desktopApi.send('Cloud.findAdminIdentity', cloud.name);
    if (identity) cloud.adminIdentity = identity;
  }

  async function connectToCloud(address: string, name: string): Promise<void> {
    await window.desktopApi.send('Desktop.connectToPrivateCloud', {
      address,
      name,
    });
  }

  document.addEventListener('desktop:event', evt => {
    const { eventType, data } = (evt as CustomEvent).detail;
    if (eventType === 'Cloud.onConnected') {
      onConnection(data).catch(console.error);
    }
  });

  async function load() {
    const list = await window.desktopApi.send<ICloudConnected[]>(
      'Desktop.getCloudConnections',
      null,
    );
    for (const cloud of list) await onConnection(cloud);
  }

  async function onConnection(event: ICloudConnected): Promise<void> {
    const { name, address, oldAddress, type, cloudNodes } = event;

    let cloud = clouds.value.find(x => x.name === name);
    if (!cloud) {
      cloud = { name, type, datastores: 0, nodes: 0, clientsByAddress: new Map() };
      clouds.value.push(cloud);
      clouds.value.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        if (a.type === 'public') return -1;
        if (b.type === 'public') return 1;
        if (a.type === 'local') return 1;
        if (b.type === 'local') return -1;
        return 0;
      });
    }
    if (event.oldAddress) {
      cloud.clientsByAddress.get(oldAddress)?.close();
      cloud.clientsByAddress.delete(oldAddress);
    }
    cloud.nodes = cloudNodes ?? 0;
    cloud.adminIdentity = event.adminIdentity;
    const client = new Client<'desktop'>();
    client.autoReconnect = false;
    client.address = address;
    cloud.clientsByAddress.set(address, client);
    await client.connect();
    await useReplaysStore().onClient(cloud, client);
    await useDatastoreStore().onClient(cloud, client);
  }
  void load();

  return {
    clouds,
    getCloudName,
    getCloudClient,
    getCloudWithAddress,
    attachIdentity,
    connectToCloud,
    connectedToHost,
    getCloudHost,
    load,
    getPublicCloudUrl,
    getAdmin,
    disconnect() {
      for (const cloud of clouds.value) {
        for (const connection of cloud.clientsByAddress.values()) connection.close();
      }
    },
  };
});
