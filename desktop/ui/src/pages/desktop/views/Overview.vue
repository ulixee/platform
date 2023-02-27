<template>
  <div class="mt-20 flex flex-col content-center divide-y divide-slate-300 m-20 ">
    <div
      class="grid-col mx-auto grid h-64 w-64 place-content-center gap-4 text-center text-2xl "
    >
      <div class="font-bold text-8xl">
        ₳{{ balance }}
      </div>
      <div class="font-thin">
        Account Balance
      </div>
    </div>
    <div class="center pt-20 flex flex-row place-content-center space-x-8 divide-x divide-slate-300 ">
      <div
        class="grid-col grid basis-2/5 place-content-center gap-4 text-center  text-2xl"
      >
        <div class="font-bold text-6xl">
          ₳{{ spent }}
        </div>
        <div class="font-thin">
          Spent
        </div>
      </div>
      <div
        class="grid-col grid basis-2/5 place-content-center gap-4  text-center text-2xl "
      >
        <div class="font-bold text-6xl">
          ₳{{ earned }}
        </div>
        <div class="font-thin">
          Earned
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import ICloudConnection from '@/api/ICloudConnection';

export default Vue.defineComponent({
  name: 'Overview',
  props: {
    clouds: {
      type: Object as PropType<Array<ICloudConnection>>,
      required: true,
    },
  },
  components: {},
  setup() {
    return {
      balance: Vue.ref<number>(100),
      spent: Vue.ref<number>(0),
      earned: Vue.ref<number>(12.67),
    };
  },
  methods: {
    sendToBackend(api: string, ...args: any[]) {
      document.dispatchEvent(
        new CustomEvent('desktop:api', {
          detail: { api, args },
        }),
      );
    },
  },

  mounted() {
    document.addEventListener('desktop:event', evt => {
      const { eventType, data } = (evt as CustomEvent).detail;
    });
  },
});
</script>

<style lang="scss" scoped="scoped"></style>
