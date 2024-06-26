<template>
  <Modal ref="modal" title="Create a new Account" dialog-class="w-1/2" :close-handler="onClose">
    <div class="divider-y divider-slate-100 my-5">
      <div class="items-left my-5 flex flex-col px-3">
        <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
          {{ errorMessage }}
        </p>
        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-sm font-light">Display Name</div>
          <div class="mb-2 text-sm font-thin">
            The name of your account is an easy way to identify it in Ulixee Desktop, and on your
            filesystem.
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
        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-sm font-light">Secret URI</div>
          <div class="mb-2 text-sm font-thin">
            Secret URIs are a format that can be used to create secure accounts or derive one
            account from another. Learn about the format
            <a
              class="text-fuchsia-800 underline hover:font-light cursor-pointer"
              @click="learnAboutSuri"
              >here</a
            >.
          </div>
          <div class="relative">
            <input
              v-model="suri"
              type="text"
              placeholder="Import a secret URI or leave empty to generate a new one"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>
        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-sm font-light">Password (optional)</div>
          <div class="relative">
            <input
              v-model="password"
              type="password"
              placeholder="Set a password for your account keystore"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>
        <button
          class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          @click="create"
        >
          <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Create Account
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
      secretUri: Vue.ref<string>(''),
      password: Vue.ref<string>(''),
      suri: Vue.ref<string>(''),
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
    };
  },
  methods: {
    async create() {
      if (!this.displayName) {
        this.errorMessage = 'Display name is required';
        return;
      }
      const suri = this.suri.length ? this.suri : null;
      const password = this.password.length ? this.password : null;
      try {
        await useWalletStore().createAccount(this.displayName, suri, password);
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
        this.password = '';
        this.suri = '';
      });
    },
    learnAboutSuri() {
      window.open('https://polkadot.js.org/docs/keyring/start/suri/');
    },
  },
});
</script>
