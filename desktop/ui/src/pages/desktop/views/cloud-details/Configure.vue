<template>
  <div class="rounded-lg bg-white p-3 px-5 shadow ring-1 ring-black ring-opacity-5">
    <div class="mt-3 divide-y divide-gray-200">
      <div class="space-y-1">
        <h3 class="text-lg font-medium leading-6 text-gray-900">Administer this Cloud</h3>
        <p class="max-w-2xl text-sm text-gray-500">
          <template v-if="adminIdentity">
            As the the administrator of this cloud, you have permission to deploy Datastores, issue
            Credits and see Hero Sessions.
          </template>
          <template v-else>
            If you're the administrator of this cloud, you can attach your Admin Identity to deploy
            Datastores, issue Credits and see Hero Sessions.
          </template>
        </p>
      </div>
      <div class="mt-6">
        <dl class="divide-y divide-gray-200">
          <div class="grid grid-cols-3 gap-4 py-4">
            <dt class="text-sm font-medium text-gray-500">Admin Identity</dt>
            <dd class="mt-1 flex text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <span class="flex-grow overflow-hidden text-ellipsis">{{
                adminIdentity ?? '-'
              }}</span>
              <span class="ml-4 flex-shrink-0">
                <button
                  v-if="cloud.type !== 'public'"
                  type="button"
                  class="rounded-md bg-white font-medium text-fuchsia-800 hover:text-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-800 focus:ring-offset-2"
                  @click.prevent="attachIdentity(cloud)"
                >
                  {{ adminIdentity ? 'Update' : 'Attach Identity' }}
                </button>
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { computed } from 'vue';
import { ArrowPathIcon } from '@heroicons/vue/20/solid';
import { CogIcon } from '@heroicons/vue/24/outline';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useRoute } from 'vue-router';

export default Vue.defineComponent({
  name: 'Datastores',
  props: {},
  components: {
    ArrowPathIcon,
    CogIcon,
  },
  setup() {
    const cloudsStore = useCloudsStore();
    const route = useRoute();
    const cloudName = route.params.name as string;
    const adminIdentity = computed(() => cloudsStore.getAdmin(cloudName));
    const cloud = cloudsStore.clouds.find(x => x.name === cloudName);
    const { getCloudName, attachIdentity, getAdmin } = cloudsStore;

    return {
      adminIdentity,
      cloudName,
      cloud,
      getCloudName,
      attachIdentity,
      getAdmin,
    };
  },
  emits: [],
  methods: {},
});
</script>

<style lang="scss" scoped="scoped">
@use 'sass:math';

.icon {
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}

.header-bar {
  @apply bg-slate-100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.Sessions {
  min-height: 200px;
}
</style>
