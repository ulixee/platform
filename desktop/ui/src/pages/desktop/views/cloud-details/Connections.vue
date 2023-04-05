<template>
  <div
    class="flex flex-col items-center divide-y divide-gray-200 overflow-hidden overflow-hidden rounded-lg bg-white shadow ring-1 ring-black ring-opacity-5"
  >
    <h4
      class="w-full border-b border-gray-100 py-5 px-5 text-lg font-medium leading-6 text-gray-900"
    >
      Nodes
    </h4>
    <div class="w-full divide-y divide-gray-100 px-5 pb-2">
      <div v-for="connection of connections" class="my-5 flex flex-row items-center">
        {{ connection }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { ChartBarIcon, ChevronRightIcon, HeartIcon } from '@heroicons/vue/24/outline';
import DatastoreCard from '@/pages/desktop/components/DatastoreCard.vue';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'Nodes',
  props: {},
  components: {
    ArrowPathIcon,
    DatastoreCard,
    HeartIcon,
    ChartBarIcon,
    ChevronRightIcon,
  },
  setup() {
    const route = useRoute();
    const cloudsStore = useCloudsStore();

    const cloudName = route.params.name as string;

    const connections = computed(() => {
      const cloud = cloudsStore.clouds.find(x => x.name === cloudName);
      return [...cloud.clientsByAddress.keys()].map(x =>
        x.replace('/desktop', '').replace('ws://', 'ulx://'),
      );
    });
    return {
      connections,
    };
  },
  emits: [],
  methods: {},
});
</script>
