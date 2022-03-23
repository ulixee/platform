<template>
  <div class="py-12 px-28">
    <div class="pb-5 mb-5 border-b border-gray-400 text-center">
      <div class="text-2xl mb-2 script-path font-thin opacity-50">
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
      Databox Output <span>{{ dataSize }}</span>:
    </h2>
    <div class="box bg-gray-50 border border-gray-200 min-h-[200px] max-h-[500px] overflow-auto">
      <Json
        v-if="output"
        :json="output"
        :scroll-to-record-id="scrollToRecordId"
        class="p-5 text-sm text-gray-600"
      />
    </div>
    {{ collectedResourcesString }}, {{ collectedElementsString }}, {{ collectedSnippetsString }}

    <div class="text-center my-10">
      <a
        class="underline text-purple-700"
        href="/rerun-extract"
        @click.prevent="runExtract"
      >Re-run Extract</a>
    </div>
    <slot v-if="collectedAssets.collectedResources.length">
      <h2>Collected Resources</h2>
      <div
        v-for="resource of collectedAssets.collectedResources"
        :key="resource.resource.id"
        class="box border border-gray-100 p-10 mb-20"
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
        <div class="grid grid-cols-2 gap-4">
          <div
            class="
              p-10
              bg-gray-10
              border border-gray-200
              font-thin
              whitespace-pre
              text-sm
              overflow-auto
            "
          >
            <div class="label font-bold">
              Request Headers
            </div>
            {{ formatJson(resource.resource.request.headers) }}
          </div>
          <div
            class="
              p-10
              bg-gray-10
              border border-gray-200
              font-thin
              whitespace-pre
              text-sm
              overflow-auto
            "
          >
            <div class="label font-bold">
              Response Headers
            </div>
            {{ formatJson(resource.resource.response.headers) }}
          </div>
        </div>

        <div class="font-sm whitespace-pre box border border-gray-100 bg-gray-100 my-2 p-2">
          <div>Source Code</div>
          <div v-for="line of resource.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>

        <div class="mt-20 box">
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

    <slot v-if="collectedAssets.collectedSnippets.length">
      <h2>Collected Snippets</h2>
      <div
        v-for="snippet of collectedAssets.collectedSnippets"
        :key="snippet.commandId"
        class="box border border-gray-100 p-10 mb-20"
      >
        <h4>Name "{{ snippet.name }}"</h4>
        <div class="font-thin">
          Collected at {{ formatTimestamp(snippet.timestamp) }}
        </div>
        <div class="grid">
          <div
            class="
              p-10
              bg-gray-10
              border border-gray-200
              font-thin
              whitespace-pre
              text-sm
              overflow-auto
            "
          >
            {{ formatJson(snippet.value) }}
          </div>
        </div>

        <div class="font-sm whitespace-pre box border border-gray-100 bg-gray-100 my-2 p-2">
          <div>Source Code</div>
          <div v-for="line of snippet.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>
      </div>
    </slot>

    <slot v-if="collectedAssets.collectedElements.length">
      <h2>Collected Elements</h2>
      <div
        v-for="element of collectedAssets.collectedElements"
        :key="element.id"
        class="box border border-gray-100 p-10 mb-20"
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
        <div
          class="
            p-10
            bg-gray-100
            border border-gray-200
            font-thin
            whitespace-pre
            text-sm
            overflow-auto
          "
        >
          {{ element.outerHTML }}
        </div>

        <div class="font-sm whitespace-pre box border border-gray-100 bg-gray-100 my-2 p-2">
          <div>Source Code</div>
          <div v-for="line of element.sourcecode" :key="line.line">
            <span class="text-gray-300">{{ line.line }}.</span>
            <span class="text-gray-500">{{ line.code }}</span>
          </div>
        </div>
        <div class="mt-20 box">
          <a
            class="underline text-purple-700"
            :href="`data:text/html,${encodeURIComponent(element.outerHTML)}`"
            target="_blank"
            :download="element.name + '.html'"
          >Download HTML</a>

          <a
            class="ml-20 underline text-purple-700"
            href="javascript:void(0)"
            @click.prevent="inspectElement(element)"
          >Inspect Element</a>

          <a
            class="ml-20 underline text-purple-700"
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
import IDataboxOutputEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxOutputEvent';
import humanizeBytes from '@/utils/humanizeBytes';
import Json from '@/components/Json.vue';
import { convertJsonToFlat } from '@/utils/flattenJson';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import IDataboxCollectedAssetsResponse from '@ulixee/apps-chromealive-interfaces/IDataboxCollectedAssets';
import IDataboxCollectedAssetEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxCollectedAssetEvent';
import IResourceMeta from '@ulixee/hero-interfaces/IResourceMeta';
import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICollectedElement from '@ulixee/hero-interfaces/ICollectedElement';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';

const databox: any = Vue.defineComponent({
  name: 'Databox',
  components: { Json },
  setup() {
    document.title = 'Databox Panel';

    return {
      dataSize: Vue.ref<string>(humanizeBytes(0)),
      output: Vue.reactive(convertJsonToFlat({})),
      scrollToRecordId: Vue.ref<number>(null),
      scriptEntrypoint: Vue.ref<string>(null),
      collectedAssets: Vue.reactive<IDataboxCollectedAssetsResponse>({
        collectedElements: [],
        collectedSnippets: [],
        collectedResources: [],
      }),
      resourceDataUrlsById: Vue.ref<Record<number, string>>({}),
      startTime: Vue.ref<string>(''),
      endTime: Vue.ref<string>(''),
      sessionId: null as string,
    };
  },
  computed: {
    collectedElementsString(): string {
      const count = this.collectedAssets.collectedElements.length;
      return `${count} Collected Element${count === 1 ? '' : 's'}`;
    },
    collectedSnippetsString(): string {
      const count = this.collectedAssets.collectedSnippets.length;
      return `${count} Collected Snippet${count === 1 ? '' : 's'}`;
    },
    collectedResourcesString(): string {
      const count = this.collectedAssets.collectedResources.length;
      return `${count} Collected Resource${count === 1 ? '' : 's'}`;
    },
  },
  methods: {
    byteSize(buffer: Uint8Array): string {
      return humanizeBytes(buffer.byteLength);
    },
    resourceFilename(resource: ICollectedResource & ISourceCodeReference): string {
      const url = new URL(resource.resource.url);
      const postfix = url.pathname.split('.').pop() ?? 'html';
      const matchingName = this.collectedAssets.collectedResources.filter(
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
    onDataboxOutput(data: IDataboxOutputEvent) {
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
    onSessionActive(data: IHeroSessionActiveEvent) {
      if (!data) return;

      const entrypoint = data.scriptEntrypointTs ?? data.scriptEntrypoint;
      if (this.scriptEntrypoint && !entrypoint.endsWith(this.scriptEntrypoint)) {
        this.onDataboxOutput({} as IDataboxOutputEvent);
      }
      const divider = entrypoint.includes('/') ? '/' : '\\';
      this.scriptEntrypoint = entrypoint.split(divider).slice(-2).join(divider);
      this.startTime = moment(data.startTime).format(`LL [at] LTS z`);
      this.endTime = moment(data.endTime ?? Date.now()).format(`LL [at] LTS z`);
    },
    onCollectedAssets(assets: IDataboxCollectedAssetsResponse): void {
      this.collectedAssets.collectedResources = assets.collectedResources;
      this.collectedAssets.collectedElements = assets.collectedElements;
      this.collectedAssets.collectedSnippets = assets.collectedSnippets;
      for (const resource of assets.collectedResources) {
        this.updateDataUrl(resource.resource);
      }
    },
    onCollectedAsset(asset: IDataboxCollectedAssetEvent): void {
      if (asset.collectedElement) {
        this.collectedAssets.collectedElements.push(asset.collectedElement);
      }
      if (asset.collectedResource) {
        this.collectedAssets.collectedResources.push(asset.collectedResource);
        this.updateDataUrl(asset.collectedResource.resource);
      }
      if (asset.collectedSnippet) {
        this.collectedAssets.collectedSnippets.push(asset.collectedSnippet);
      }
    },
    async inspectResource(resource: ICollectedResource): Promise<void> {
      const blob = this.resourceToBlob(resource.resource);
      let data: any = {
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
    inspectElement(element: ICollectedElement): void {
      const renderer = document.createElement('template');
      renderer.innerHTML = element.outerHTML;
      let data: any = {
        name: element.name,
        element: renderer.content.firstChild,
        rawDetails: { ...element },
      };

      // eslint-disable-next-line no-console
      console.log('Collected Element (%s)', element.name, data);
    },
    timetravelToElement(element: ICollectedElement): void {
      Client.send('Session.timetravel', {
        heroSessionId: null,
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
      Client.send('Session.getActive')
        .then(this.onSessionActive)
        .catch(err => console.error(err));
      Client.send('Databox.getOutput')
        .then(x => this.onDataboxOutput({ ...x, changes: undefined }))
        .catch(err => console.error(err));
      Client.send('Databox.getCollectedAssets')
        .then(this.onCollectedAssets)
        .catch(err => console.error(err));
    },
    runExtract(): void {
      Client.send('Databox.runExtract', { heroSessionId: this.sessionId }).catch(err =>
        console.error(err),
      );
    },
  },
  mounted() {
    Client.connect().catch(err => console.error(err));
    this.refreshData();
    Client.on('Databox.output', this.onDataboxOutput);
    Client.on('Databox.collected-asset', this.onCollectedAsset);
    Client.on('Session.active', this.onSessionActive);
  },
});
export default databox;
</script>

<style lang="scss" scoped="scoped">
h1 {
  color: #ada0b6;
  @apply text-6xl mb-3;
}

h2 {
  @apply mt-10 font-bold mb-5;
}
</style>
