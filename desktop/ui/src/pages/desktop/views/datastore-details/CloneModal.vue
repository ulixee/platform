<template>
  <Modal ref="modal" title="Clone this Datastore" dialog-class="w-1/2">
    <div class="divider-y divider-slate-100 my-5">
      <div class="items-left my-5 flex flex-col px-3">
        <p class="mb-5 text-base font-light">
          You can clone this Datastore and add your own functionality. Don't worry, this Datastore
          author will participate in any proceeds you make, so they're happy for you to do so!
        </p>
        <p v-if="errorMessage" class="py-2 text-sm font-semibold text-red-500">
          {{ errorMessage }}
        </p>

        <Prism language="shell" class="w-full">
          npx @ulixee/datastore clone "{{ cloudAddress }}"
        </Prism>

        <p class="my-2 text-center text-sm text-gray-500">
          Run this from the command line in a folder you want the clone to be created.
        </p>
        <!--        <button
          class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 py-2.5 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          @click="addCredit"
        >
          <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Clone It
        </button>-->
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import Modal from '../../components/Modal.vue';
import Prism from '@/pages/desktop/components/Prism.vue';
import { ArrowLeftIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { IDatastoreSummary, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';

export default Vue.defineComponent({
  name: 'CloneModal',
  components: {
    Modal,
    ArrowLeftIcon,
    ArrowRightCircleIcon,
    Prism,
  },
  props: {
    selectedCloud: String,
    datastore: {
      type: Object as PropType<IDatastoreSummary>,
      required: true,
      default: () => ({} as IDatastoreSummary),
    },
  },
  setup(props) {
    const datastoresStore = useDatastoreStore();
    const cloudAddress = datastoresStore.getCloudAddress(
      props.datastore.id,
      props.datastore.version,
      props.selectedCloud,
    );

    return {
      cloudAddress,
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
    };
  },
  methods: {
    open() {
      this.modal.open();
    },
  },
});
</script>
