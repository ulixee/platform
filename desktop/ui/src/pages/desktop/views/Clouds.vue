<template>
  <div class="h-full">
    <h1 class="mb-8 mt-3 text-2xl font-semibold text-gray-900">Clouds</h1>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        class="flex flex-col ol-span-1 mb-10 divide-y divide-gray-200 rounded-lg"
        v-for="cloud of clouds"
        :class="[
          cloud.type !== 'public'
            ? 'cursor-pointer bg-white shadow-md hover:shadow-sm '
            : 'cursor-not-allowed bg-white/50 shadow-sm',
        ]"
        :key="cloud.name"
        @click.prevent="cloud.type !== 'public' ? $router.push(`/cloud/${cloud.name}`) : void(0)"
      >
        <div class="flex-grow  relative flex w-full  justify-between space-x-6 p-6">
          <div class="mt-2 mb-1 pb-1 text-base font-semibold leading-6 text-gray-600">
            <h3 class="">
              {{ getCloudName(cloud.name) }}
            </h3>
            <p class="mt-1 text-sm font-light text-gray-500" v-if="cloud.type === 'public'">
              The Ulixee Public cloud allows you to instantly host and monetize your Datastores with
              no server setup.
            </p>

            <p class="mt-1 text-sm font-light text-gray-500" v-else-if="cloud.type === 'local'">
              Ulixee Desktop starts an internal Cloud so you can test Datastores on your local
              machine.
            </p>
          </div>
          <CloudIcon
            class="absolute right-5 top-5 w-5 drop-shadow"
            :class="[cloud.clientsByAddress.size ? 'text-emerald-500' : 'text-gray-300']"
          />
        </div>
        <div class="-mt-px flex divide-x divide-gray-200">
          <div class="grid-row grid basis-1/2 py-2 text-center text-xl">
            <div class="text-sm font-normal text-gray-900">
              <BuildingStorefrontIcon
                class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600"
              />
              Datastores
              <span class="font-semibold"> {{ cloud.datastores }}</span>
            </div>
          </div>

          <div class="grid-row grid basis-1/2 place-content-center py-2 text-center text-xl">
            <div class="text-sm font-normal text-gray-900">
              <ServerStackIcon
                class="relative mr-1 inline h-4 align-text-bottom text-fuchsia-600"
              />
              Nodes
              <span class="font-semibold"> {{ cloud.nodes }} </span>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-10">
        <button
          class="group relative block h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-800/90 focus:ring-offset-2"
          @click.prevent="showAddCloud = true"
        >
          <PlusCircleIcon class="mx-auto h-12 w-12 text-gray-400" />
          <span class="mt-2 block text-sm font-semibold text-gray-900">Add a Cloud</span>
        </button>
      </div>
    </div>
  </div>
  <CloudAddModal :show="showAddCloud" @close="showAddCloud = false" />
</template>

<script lang="ts">
import * as Vue from 'vue';
import {
  BuildingStorefrontIcon,
  CogIcon,
  CloudIcon,
  PlusCircleIcon,
  ServerStackIcon,
} from '@heroicons/vue/24/outline';
import CloudAddModal from '@/pages/desktop/views/CloudAddModal.vue';
import { useCloudsStore } from '../stores/CloudsStore';
import { storeToRefs } from 'pinia';

export default Vue.defineComponent({
  name: 'Clouds',
  props: {},
  components: {
    CloudAddModal,
    CloudIcon,
    BuildingStorefrontIcon,
    ServerStackIcon,
    PlusCircleIcon,
    CogIcon,
  },
  setup() {
    const clouds = useCloudsStore();
    const { attachIdentity, getCloudName } = clouds;
    return {
      ...storeToRefs(clouds),
      showAddCloud: Vue.ref(false),
      attachIdentity,
      getCloudName,
    };
  },
  methods: {},
});
</script>
