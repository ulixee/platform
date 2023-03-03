<template>
  <div class="h-full">
    <div class="header-bar sticky top-0 flex h-12 flex-row bg-slate-100 pt-2">
      <ArrowLeftIcon
        class="absolute left-2 top-2 h-6 cursor-pointer text-slate-600 hover:text-slate-900 hover:drop-shadow"
        @click.prevent="$emit('clear-datastore')"
      />
      <h1 class="font-md w-full text-center text-xl font-thin">
        {{ datastore.name ?? '' }}
      </h1>
    </div>
    <div class="font-reg m-2 text-center text-sm text-slate-700">
      <div class="">Version: {{ datastore.versionHash }}</div>
      <div class="content-stretch my-5 flex flex flex-row flex-row justify-center">
        <div v-for="cloud of clouds" class="middle mx-5 flex flex-row">
          <div class="m-2">
            {{ getCloudName(cloud.name) }}
          </div>
          <button
            v-if="cloudDeployments[cloud.name] && cloudDeployments[cloud.name] !== datastore"
            class="cursor-pointer rounded-md bg-purple-900 p-2 px-4 font-semibold text-white hover:bg-purple-500 hover:drop-shadow"
            @click="
              $emit('navigate', { datastore: cloudDeployments[cloud.name], cloud: cloud.name })
            "
          >
            Show
          </button>
          <button
            v-else-if="!cloudDeployments[cloud.name]"
            class="group relative cursor-pointer rounded-md bg-cyan-900 p-2 px-4 font-semibold text-white hover:bg-cyan-500 disabled:bg-slate-300 disabled:text-slate-600"
            :disabled="cloud.type === 'public'"
          >
            Deploy
            <div
              v-if="cloud.type === 'public'"
              class="absolute -bottom-5 -left-1 hidden whitespace-nowrap text-xs font-light group-hover:block"
            >
              COMING SOON!
            </div>
          </button>
          <span v-else class="p-2 font-semibold text-purple-400">Showing</span>
        </div>
      </div>
    </div>
    <table class="w-full table-auto">
      <thead>
        <tr class="sticky top-12 mb-1 bg-slate-100 pb-1 text-left font-thin shadow-md">
          <th class="pb-1 pl-2 font-normal">Name</th>
          <th class="pb-1 font-normal">Queries</th>
          <th class="pb-1 font-normal">Average Bytes</th>
          <th class="pb-1 font-normal">Average Ms</th>
          <th class="pb-1 font-normal">Price per Query</th>
          <th class="pb-1 font-normal">Earned</th>
          <th class="pr-2 pb-1 font-normal">Spent</th>
        </tr>
      </thead>
      <tbody>
        <tr colspan="100%">
          <th colspan="100%">
            <h3 class="mt-5 border-b border-slate-200 px-2 text-left text-base font-light">
              Tables
            </h3>
          </th>
        </tr>
        <tr
          v-for="[name, table] of Object.entries(datastore.tablesByName)"
          :key="name"
          class="text-sm leading-loose hover:bg-slate-100"
        >
          <td class="pl-3">
            {{ name }}
          </td>
          <td>{{ table.stats.queries }}</td>
          <td>{{ table.stats.averageBytesPerQuery }}</td>
          <td>{{ table.stats.averageMilliseconds }}</td>
          <td>₳{{ table.pricePerQuery ?? 0 }}</td>
          <td>-</td>
          <td class="pr-2">-</td>
        </tr>
      </tbody>
      <tbody>
        <tr>
          <th colspan="100%">
            <h3 class="mt-5 border-b border-slate-200 px-2 text-left text-base font-light">
              Runners
            </h3>
          </th>
        </tr>
        <tr
          v-for="[name, runner] of Object.entries(datastore.runnersByName)"
          :key="name"
          class="text-sm leading-loose hover:bg-slate-100"
        >
          <td class="pl-3">
            {{ name }}
          </td>
          <td>{{ runner.stats.queries }}</td>
          <td>{{ runner.stats.averageBytesPerQuery }}</td>
          <td>{{ runner.stats.averageMilliseconds }}</td>
          <td>₳{{ runner.pricePerQuery ?? 0 }}</td>
          <td>-</td>
          <td class="pr-2">-</td>
        </tr>
      </tbody>

      <tbody>
        <tr>
          <th colspan="100%">
            <h3 class="mt-5 border-b border-slate-200 px-2 text-left text-base font-light">
              Crawlers
            </h3>
          </th>
        </tr>
        <tr
          v-for="[name, crawler] of Object.entries(datastore.crawlersByName)"
          :key="name"
          class="text-sm leading-loose hover:bg-slate-100"
        >
          <td class="pl-3">
            {{ name }}
          </td>
          <td>{{ crawler.stats.queries }}</td>
          <td>{{ crawler.stats.averageBytesPerQuery }}</td>
          <td>{{ crawler.stats.averageMilliseconds }}</td>
          <td>₳{{ crawler.pricePerQuery ?? 0 }}</td>
          <td>-</td>
          <td class="pr-2">-</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import ICloudConnection from '@/api/ICloudConnection';

type IDatastoreList = IDatastoreApiTypes['Datastores.list']['result'];

export default Vue.defineComponent({
  name: 'Datastores',
  components: { ArrowLeftIcon },
  props: {
    clouds: {
      type: Object as PropType<Array<ICloudConnection>>,
      required: true,
    },
    datastore: {
      type: Object as PropType<IDatastoreList[0]>,
    },
    selectedCloud: {
      type: String,
    },
    datastoresByCloud: {
      type: Object as PropType<Map<string, Map<string, IDatastoreList[0]>>>,
    },
  },
  emits: ['clear-datastore', 'navigate'],
  setup(props) {
    const cloudDeployments = Vue.computed(() => {
      const deploymentByCloud: { [name: string]: IDatastoreList[0] } = {};
      for (const [cloud, datastoresByHash] of props.datastoresByCloud) {
        for (const [, datastore] of datastoresByHash) {
          if (datastore.versionHash === (props.datastore as any).versionHash) {
            deploymentByCloud[cloud] = datastore;
          }
        }
      }
      return deploymentByCloud;
    });
    return { cloudDeployments };
  },
  methods: {
    getCloudName(name: string): string {
      if (name === 'public') return 'Public Cloud';
      if (name === 'local') return 'Local Development Cloud';
      return name;
    },
  },
});
</script>

<style lang="scss" scoped="scoped">
.header-bar {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
