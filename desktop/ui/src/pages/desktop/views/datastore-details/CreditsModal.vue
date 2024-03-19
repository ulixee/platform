<template>
  <Modal
    ref="modal"
    title="Create a Datastore Credit"
    dialog-class="w-1/2"
    :close-handler="onClose"
  >
    <div class="divider-y divider-slate-100 my-5">
      <div v-if="!credit" class="items-left my-5 flex flex-col px-3">
        <p class="font-regular">
          Create a Credit that can be used (only) on this Datastore. This allows you to give your
          consumers a trial while they integrate into their apps and service.
        </p>
        <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
          {{ errorMessage }}
        </p>
        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-sm font-light">Credits</div>
          <div class="relative">
            <span
              class="absolute left-3 whitespace-nowrap border border-transparent py-2 font-light text-gray-500"
              >₳</span
            >
            <input
              v-model="argons"
              type="number"
              min="0"
              placeholder="Argons"
              class="rounded-md border border-gray-300 py-2 pl-8 pr-3 placeholder-gray-400"
            />
          </div>
        </div>
        <button
          class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          @click="addCredit"
        >
          <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Create Credit
        </button>
      </div>
      <div v-else class="my-5 w-full items-center px-2">
        <p class="font-regular mb-10 text-gray-800">
          Copy/drag this ₳{{ argons }} Credit to send to your recipient.
        </p>

        <div
          class="ml-10 flex cursor-grab flex-col items-center"
          draggable="true"
          @dragstart.prevent="dragCredit()"
        >
          <ArgfileIcon
            class="coin-shadow inline-block h-16 w-16 text-fuchsia-700"
            alt="Argon"
            @contextmenu.prevent="showCreditContextMenu($event)"
          />
          <div class="my-2 text-center text-xs font-light">
            {{ creditFilename }}
          </div>
        </div>

        <div class="font-regular my-5 border-t border-gray-100 pt-5 text-gray-800">
          <p class="text-sm text-gray-800">The Credit-enabled URL to your Documentation is:</p>
          <p
            class="mt-2 select-all break-words rounded-md border border-gray-300 bg-gray-100 p-2 text-sm text-slate-800"
          >
            {{ creditUrl() }}
          </p>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import ArgfileIcon from '@/assets/icons/argfile.svg';
import { deepUnref } from '@/pages/desktop/lib/utils';
import * as Vue from 'vue';
import { PropType } from 'vue';
import { ArrowLeftIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import {
  IDatastoreSummary,
  TCredit,
  useDatastoreStore,
} from '@/pages/desktop/stores/DatastoresStore';
import type { IArgonFileMeta } from '@ulixee/desktop-interfaces/apis';
import Modal from '../../components/Modal.vue';

export default Vue.defineComponent({
  name: 'CreditsModal',
  components: {
    Modal,
    ArrowLeftIcon,
    ArrowRightCircleIcon,
    ArgfileIcon,
  },
  props: {
    selectedCloud: String,
    datastore: {
      type: Object as PropType<IDatastoreSummary>,
      required: true,
      default: () => ({}) as IDatastoreSummary,
    },
  },
  emits: ['added-credit'],
  setup() {
    return {
      credit: Vue.ref<TCredit>(null),
      creditFilename: Vue.ref<string>(),
      argons: Vue.ref<number>(5),
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
    };
  },
  methods: {
    creditUrl() {
      const datastoresStore = useDatastoreStore();
      return datastoresStore.getDocsUrl(this.credit.datastoreUrl);
    },
    async addCredit() {
      try {
        const { name, credit } = await useDatastoreStore().createCredit(
          this.datastore,
          this.argons,
          this.selectedCloud,
        );
        this.credit = credit;
        this.creditFilename = name;
        this.$emit('added-credit');
      } catch (error: any) {
        this.errorMessage = error.message.split('Error: ').pop();
        return;
      }
    },
    open() {
      this.modal.open();
    },
    async dragCredit() {
      const credit = deepUnref(this.credit);
      await window.appBridge.send('Argon.dragAsFile', {
        name: this.creditFilename,
        file: { credit },
      } as IArgonFileMeta);
    },
    async showCreditContextMenu($event) {
      const args = {
        file: { credit: { ...this.credit } },
        name: this.creditFilename,
        position: { x: $event.x, y: $event.y },
      };
      await window.desktopApi.send('Argon.showFileContextMenu', args);
    },
    onClose(isFromBackdrop: boolean) {
      if (!isFromBackdrop || !this.credit) {
        this.modal.close();
        requestAnimationFrame(() => (this.credit = null));
      }
    },
  },
});
</script>

<style>
.coin-shadow {
  filter: drop-shadow(0 2px 1px rgb(0 0 0 / 0.65));
}

.coin-shadow:hover {
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.65));
}
</style>
