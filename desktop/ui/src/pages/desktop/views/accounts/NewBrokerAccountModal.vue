<template>
  <Modal
    ref="modal"
    title="Connect a Databroker Account"
    dialog-class="w-1/2"
    :close-handler="onClose"
  >
    <div class="divider-y divider-slate-100 my-5">
      <div class="px-3 mb-2 font-light text-med">
        Wire up an account you already created with a Databroker. NOTE: this will not create a new
        account with the databroker!
      </div>

      <div class="items-left my-5 flex flex-col px-3">
        <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
          {{ errorMessage }}
        </p>

        <div class="my-5">
          <div class="mb-1 whitespace-nowrap font-light">User Identity</div>
          <div class="mb-2 font-thin">
            The user identity you registered with this Databroker (starts with id1..).
          </div>
          <div class="relative">
            <input
              v-model="userIdentity"
              type="text"
              placeholder="eg, id1xv7empyzlwuvlshs2vlf9eruf72jeesr8yxrrd3esusj75qsr6jqj6dv3p"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>
        <div class="my-5">
          <div class="mb-1 whitespace-nowrap font-light">Databroker URL</div>
          <div class="relative">
            <input
              v-model="host"
              type="url"
              placeholder="The url for this databroker"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>

        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-med font-light">Display Name (optional)</div>
          <div class="mb-2 font-thin">
            The name of your account is an easy way to identify it in Ulixee Desktop.
          </div>
          <div class="relative">
            <input
              v-model="displayName"
              type="text"
              placeholder="Give your account a name"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>
        <button
          class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          @click="create"
        >
          <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Connect your Account
        </button>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import ArgfileIcon from '@/assets/icons/argfile.svg';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { ArrowLeftIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import * as Vue from 'vue';
import Modal from '../../components/Modal.vue';

export default Vue.defineComponent({
  name: 'NewAccountModal',
  components: {
    Modal,
    ArrowLeftIcon,
    ArrowRightCircleIcon,
    ArgfileIcon,
  },
  emits: ['added'],
  setup() {
    return {
      displayName: Vue.ref<string>(''),
      host: Vue.ref<string>(''),
      userIdentity: Vue.ref<string>(''),
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
    };
  },
  methods: {
    async create() {
      if (!this.userIdentity) {
        this.errorMessage = 'User identity is required';
        return;
      }
      if (!this.host) {
        this.errorMessage = 'Databroker url is required';
        return;
      }

      try {
        await useWalletStore().addBrokerAccount(this.host, this.userIdentity, this.displayName);
      } catch (e) {
        this.errorMessage = e.message;
        return;
      }
      this.$emit('added');
      this.modal.close();
    },
    open() {
      this.modal.open();
    },
    onClose() {
      this.modal.close();
      requestAnimationFrame(() => {
        this.displayName = '';
        this.host = '';
        this.userIdentity = '';
      });
    },
  },
});
</script>
