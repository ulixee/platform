<template>
  <Navbar />
  <div class="px-20">
    <div class="flex flex-row">
      <div class="p-6">
        <h1 class="text-2xl font-bold mb-4">System Overview</h1>
        <div v-if="overview">
          <div class="mb-2">
            <strong>Localchain Balance:</strong> {{ overview.localchainBalance }}
          </div>
          <div class="mb-2">
            <strong>Localchain Address:</strong> {{ overview.localchainAddress }}
          </div>
          <div class="mb-2">
            <strong>Total Organization Balance:</strong> {{ overview.totalOrganizationBalance }}
          </div>
          <div class="mb-2"><strong>Granted Balance:</strong> {{ overview.grantedBalance }}</div>
          <div class="mb-2"><strong>Organizations:</strong> {{ overview.organizations }}</div>
          <div class="mb-2"><strong>Users:</strong> {{ overview.users }}</div>
          <div class="mb-2"><strong>ChannelHolds:</strong> {{ overview.channelHolds }}</div>
          <div class="mb-2"><strong>Open ChannelHolds:</strong> {{ overview.openChannelHolds }}</div>
          <div class="mb-2">
            <strong>Balance Pending ChannelHold Settlement:</strong>
            {{ overview.balancePendingChannelHoldSettlement }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import client from '@/lib/Client';
import { IDatabrokerAdminApiTypes } from '@ulixee/platform-specification/datastore/DatabrokerAdminApis';
import * as Vue from 'vue';
import Navbar from '../layouts/Navbar.vue';

export default Vue.defineComponent({
  components: {
    Navbar,
  },
  async setup() {
    return {
      overview: Vue.ref<IDatabrokerAdminApiTypes['System.overview']['result']>({} as any),
    };
  },
  created() {
    this.fetchOverview();
  },
  methods: {
    async fetchOverview() {
      this.overview = await client.send('System.overview', {});
    },
  },
});
</script>

<style lang="scss">
.Index {
  section {
    @apply mt-10;
  }
}
</style>
