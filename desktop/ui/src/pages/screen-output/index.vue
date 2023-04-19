<template>
  <div class="py-12 px-28">
    <div class="mb-5 border-b border-gray-400 pb-5 text-center">
      <div class="script-path mb-2 text-2xl font-thin opacity-50">
        {{ scriptEntrypoint }}
      </div>
      <h1>OUTPUT DATA</h1>
    </div>

    <ul class="flex flex-row border-b border-gray-200 pb-5">
      <li class="flex-1">
        Started {{ startTime }}
      </li>
      <li class="flex-1">
        Finished on {{ endTime }}
      </li>
    </ul>

    <h2>
      Datastore Output <span>{{ dataSize }}</span>:
    </h2>
    <div class="box max-h-[500px] min-h-[200px] overflow-auto border border-gray-200 bg-gray-50">
      <Json
        v-if="output"
        :json="output"
        :scroll-to-record-id="scrollToRecordId"
        class="p-5 text-sm text-gray-600"
      />
    </div>
    {{ detachedResourcesString }}, {{ detachedElementsString }}, {{ snippetsString }}

    <div class="my-10 text-center">
      <a
        class="text-purple-700 underline"
        href="/rerun-extractor"
        @click.prevent="rerunExtractor"
      >Re-run Extractor</a>
    </div>
    <slot v-if="collectedAssets.detachedResources.length">
      <h2>Collected Resources</h2>
      <div
        v-for="resource of collectedAssets.detachedResources"
        :key="resource.resource.id"
        class="box mb-20 border border-gray-100 p-10"
      >
        <h4>Name "{{ resource.name }}"</h4>
        <h5>
          {{ resource.resource.request.method }} {{ resource.resource.url }}
          <span class="font-thin">({{ resource.resource.type }})</span>
        </h5>
        <div class="font-thin">
          Collected at {{ formatTimestamp(resource.timestamp) }} from
          {{ resource.resource.documentUrl }}
        </div>
        <div class="font-thin">
          Http Requested at {{ formatTimestamp(resource.resource.request.timestamp) }}
        </div>

        <div class="font-sm box my-2 whitespace-pre border border-gray-100 bg-gray-100 p-2">
          <div>Source Code</div>
          <div v-for="line of resource.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>

        <div class="box mt-20">
          <a
            class="text-purple-700 underline"
            :href="resourceDataUrlsById[resource.resource.id]"
            target="_blank"
            :download="resourceFilename(resource)"
          >Download Response ({{ byteSize(resource.resource.response.buffer) }})</a>

          <a
            class="ml-20 text-purple-700 underline"
            href="javascript:void(0)"
            @click.prevent="inspectResource(resource)"
          >Inspect Resource</a>
        </div>
      </div>
    </slot>

    <slot v-if="collectedAssets.snippets.length">
      <h2>Collected Snippets</h2>
      <div
        v-for="snippet of collectedAssets.snippets"
        :key="snippet.commandId"
        class="box mb-20 border border-gray-100 p-10"
      >
        <h4>Name "{{ snippet.name }}"</h4>
        <div class="font-thin">
          Collected at {{ formatTimestamp(snippet.timestamp) }}
        </div>
        <div class="grid">
          <div
            class="bg-gray-10 overflow-auto whitespace-pre border border-gray-200 p-10 text-sm font-thin"
          >
            {{ formatJson(snippet.value) }}
          </div>
        </div>

        <div class="font-sm box my-2 whitespace-pre border border-gray-100 bg-gray-100 p-2">
          <div>Source Code</div>
          <div v-for="line of snippet.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>
      </div>
    </slot>

    <slot v-if="collectedAssets.detachedElements.length">
      <h2>Collected Elements</h2>
      <div
        v-for="element of collectedAssets.detachedElements"
        :key="element.id"
        class="box mb-20 border border-gray-100 p-10"
      >
        <h4>Name "{{ element.name }}"</h4>
        <h5>
          {{ element.nodePath }}
          <span class="font-thin">({{ element.nodeType }})</span>
        </h5>
        <div class="font-thin">
          Collected at {{ formatTimestamp(element.timestamp) }} from
          {{ element.documentUrl }}
        </div>

        <div class="font-sm box my-2 whitespace-pre border border-gray-100 bg-gray-100 p-2">
          <div>Source Code</div>
          <div v-for="line of element.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>
        <div class="box mt-20">
          <a
            class="text-purple-700 underline"
            :href="`data:text/html,${encodeURIComponent(element.outerHTML)}`"
            target="_blank"
            :download="element.name + '.html'"
          >Download HTML</a>

          <a
            class="ml-20 text-purple-700 underline"
            href="javascript:void(0)"
            @click.prevent="inspectElement(element)"
          >Inspect Element</a>

          <a
            class="ml-20 text-purple-700 underline"
            href="javascript:void(0)"
            @click.prevent="timetravelToElement(element)"
          >Show Element in Timetravel</a>
        </div>
      </div>
    </slot>
  </div>
</template>

<script lang="ts">
import json5 from 'json5';
import * as Vue from 'vue';
import moment from 'moment';
import Client from '@/api/Client';
import IDatastoreOutputEvent from '@ulixee/desktop-interfaces/events/IDatastoreOutputEvent';
import humanizeBytes from '@/utils/humanizeBytes';
import Json from '@/components/Json.vue';
import { convertJsonToFlat } from '@/utils/flattenJson';
import IHeroSessionUpdatedEvent from '@ulixee/desktop-interfaces/events/IHeroSessionUpdatedEvent';
import IDatastoreCollectedAssetsResponse from '@ulixee/desktop-interfaces/IDatastoreCollectedAssets';
import IDatastoreCollectedAssetEvent from '@ulixee/desktop-interfaces/events/IDatastoreCollectedAssetEvent';
import IResourceMeta from '@ulixee/unblocked-specification/agent/net/IResourceMeta';
import IDetachedResource from '@ulixee/hero-interfaces/IDetachedResource';
import IDetachedElement from '@ulixee/hero-interfaces/IDetachedElement';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

const datastore: any = Vue.defineComponent({
  name: 'Datastore',
  components: { Json },
  setup() {
    document.title = 'Datastore Panel';

    return {
      dataSize: Vue.ref<string>(humanizeBytes(0)),
      output: Vue.reactive(convertJsonToFlat({})),
      scrollToRecordId: Vue.ref<number>(null),
      scriptEntrypoint: Vue.ref<string>(null),
      collectedAssets: Vue.reactive<IDatastoreCollectedAssetsResponse>({
        detachedElements: [],
        detachedResources: [],
        snippets: [],
      }),
      resourceDataUrlsById: Vue.ref<Record<number, string>>({}),
      startTime: Vue.ref<string>(''),
      endTime: Vue.ref<string>(''),
      sessionId: null as string,
    };
  },
  computed: {
    detachedElementsString(): string {
      const count = this.collectedAssets.detachedElements.length;
      return `${count} Collected Element${count === 1 ? '' : 's'}`;
    },
    snippetsString(): string {
      const count = this.collectedAssets.snippets.length;
      return `${count} Collected Snippet${count === 1 ? '' : 's'}`;
    },
    detachedResourcesString(): string {
      const count = this.collectedAssets.detachedResources.length;
      return `${count} Collected Resource${count === 1 ? '' : 's'}`;
    },
  },
  methods: {
    byteSize(buffer: Uint8Array): string {
      return humanizeBytes(buffer.byteLength);
    },
    resourceFilename(resource: IDetachedResource & ISourceCodeReference): string {
      const url = new URL(resource.resource.url);
      const postfix = url.pathname.split('.').pop() ?? 'html';
      const matchingName = this.collectedAssets.detachedResources.filter(
        x => x.name === resource.name,
      );
      const index = matchingName.indexOf(resource);
      let indexString = '';
      if (index > 0) indexString = `-${index}`;
      return `${resource.name}${indexString}.${postfix}`;
    },
    formatJson(text: string | any): string {
      let json = text;
      if (typeof text === 'string') json = JSON.parse(text);
      return json5.stringify(json, null, 2);
    },
    formatTimestamp(timestamp: number): string {
      return moment(timestamp).format('HH:mm:ss.SSS');
    },
    onDatastoreOutput(data: IDatastoreOutputEvent) {
      const { bytes, changes } = data;

      this.dataSize = humanizeBytes(bytes);
      if (data.output) {
        this.output = convertJsonToFlat(
          data.output,
          changes?.map(x => x.path),
        );

        if (this.output.length) {
          Vue.nextTick(() => {
            const recordToScroll = this.output
              .filter(x => x.highlighted)
              .slice(-1)
              .pop();
            this.scrollToRecordId = recordToScroll ? recordToScroll.id : null;
          }).catch(console.error);
        }
      } else {
        this.output = convertJsonToFlat({});
      }
    },
    onSessionUpdated(data: IHeroSessionUpdatedEvent) {
      if (!data) return;

      const entrypoint = data.scriptEntrypointTs ?? data.scriptEntrypoint;
      if (this.scriptEntrypoint && !entrypoint.endsWith(this.scriptEntrypoint)) {
        this.onDatastoreOutput({} as IDatastoreOutputEvent);
      }
      const divider = entrypoint.includes('/') ? '/' : '\\';
      this.scriptEntrypoint = entrypoint.split(divider).slice(-2).join(divider);
      this.startTime = moment(data.startTime).format(`LL [at] LTS z`);
      this.endTime = moment(data.endTime ?? Date.now()).format(`LL [at] LTS z`);
    },
    onCollectedAssets(assets: IDatastoreCollectedAssetsResponse): void {
      this.collectedAssets.detachedResources = assets.detachedResources;
      this.collectedAssets.detachedElements = assets.detachedElements;
      this.collectedAssets.snippets = assets.snippets;
      for (const resource of assets.detachedResources) {
        this.updateDataUrl(resource.resource);
      }
    },
    onCollectedAsset(asset: IDatastoreCollectedAssetEvent): void {
      if (asset.detachedElement) {
        this.collectedAssets.detachedElements.push(asset.detachedElement);
      }
      if (asset.detachedResource) {
        this.collectedAssets.detachedResources.push(asset.detachedResource);
        this.updateDataUrl(asset.detachedResource.resource);
      }
      if (asset.snippet) {
        this.collectedAssets.snippets.push(asset.snippet);
      }
    },
    async inspectResource(resource: IDetachedResource): Promise<void> {
      const blob = this.resourceToBlob(resource.resource);
      const data: any = {
        name: resource.name,
        resource: {
          ...resource.resource,
          request: { ...resource.resource.request },
          response: { ...resource.resource.response },
        },
        responseAsBlob: blob,
      };

      if (resource.websocketMessages) {
        data.websocketMessages = resource.websocketMessages;
      }

      if (blob.type.includes('json')) {
        try {
          data.responseAsJson = JSON.parse(await blob.text());
        } catch (error) {}
      } else if (
        !blob.type.includes('media') &&
        !blob.type.includes('image') &&
        !blob.type.includes('audio') &&
        !blob.type.includes('data')
      ) {
        data.responseAsText = await blob.text();
      }

      // eslint-disable-next-line no-console
      console.log('Collected Resource (%s)', resource.name, data);
    },
    inspectElement(element: IDetachedElement): void {
      const renderer = document.createElement('template');
      renderer.innerHTML = element.outerHTML;
      const data: any = {
        name: element.name,
        element: renderer.content.firstChild,
        rawDetails: { ...element },
      };

      // eslint-disable-next-line no-console
      console.log('Collected Element (%s)', element.name, data);
    },
    timetravelToElement(element: IDetachedElement): void {
      Client.send('Session.timetravel', {
        commandId: element.commandId,
      }).catch(err => console.error(err));
    },
    resourceToBlob(resource: IResourceMeta): Blob {
      const mime =
        resource.response.headers['content-type'] ??
        resource.response['Content-Type'] ??
        'text/plain';
      return new Blob([resource.response.buffer], { type: mime });
    },
    updateDataUrl(resource: IResourceMeta): void {
      const fileReader = new FileReader();
      const id = resource.id;
      fileReader.onload = () => {
        this.resourceDataUrlsById[id] = fileReader.result as string;
      };
      const blob = this.resourceToBlob(resource);
      fileReader.readAsDataURL(blob);
    },
    refreshData(): void {
      Client.send('Session.load')
        .then(this.onSessionUpdated)
        .catch(err => console.error(err));
      Client.send('Datastore.getOutput')
        .then(x => this.onDatastoreOutput({ ...x, changes: undefined }))
        .catch(err => console.error(err));
      Client.send('Datastore.getCollectedAssets')
        .then(this.onCollectedAssets)
        .catch(err => console.error(err));
    },
    rerunExtractor(): void {
      Client.send('Datastore.rerunExtractor').catch(err => console.error(err));
    },
  },
  mounted() {
    Client.connect().catch(err => console.error(err));
    this.refreshData();
    Client.on('Datastore.output', this.onDatastoreOutput);
    Client.on('Datastore.collected-asset', this.onCollectedAsset);
    Client.on('Session.updated', this.onSessionUpdated);
  },
});
export default datastore;
</script>

<style lang="scss" scoped="scoped">
h1 {
  color: #ada0b6;
  @apply mb-3 text-6xl;
}

h2 {
  @apply mt-10 mb-5 font-bold;
}
</style>
