<template>
  <Modal ref="modal" :title="title" dialog-class="w-1/2" :close-handler="onClose">
    <div class="divider-y divider-slate-100 my-5">
      <div class="items-left my-5 flex flex-col px-3">
        <p v-if="errorMessage" class="px-1 py-2 text-sm font-semibold text-red-500">
          {{ errorMessage }}
        </p>

        <div class="my-5">
          <div class="mb-1 whitespace-nowrap text-sm font-light">Argons</div>
          <div class="mb-2 text-sm font-thin">
            Your Argons will transfer once your Notary has settled with the Mainchain. You have
            {{ toArgons(balance) }} available.
          </div>
          <div class="relative">
            <input
              v-model="transferAmount"
              type="number"
              step="0.001"
              placeholder="Argons to transfer"
              class="rounded-md border border-gray-300 p-3 placeholder-gray-400 w-full"
            />
          </div>
        </div>
        <button
          class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
          @click="transfer"
        >
          <ArrowRightCircleIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Transfer
        </button>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import ArgfileIcon from '@/assets/icons/argfile.svg';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { ArrowLeftIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/outline';
import { storeToRefs } from 'pinia';
import { onUpdated, PropType } from 'vue';
import * as Vue from 'vue';
import { useRoute } from 'vue-router';
import Modal from '../../components/Modal.vue';
import { titleCase, toArgons } from '@/pages/desktop/lib/utils';

export default Vue.defineComponent({
  name: 'NewAccountModal',
  components: {
    Modal,
    ArrowLeftIcon,
    ArrowRightCircleIcon,
    ArgfileIcon,
  },
  props: {
    toMainchain: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  setup(props) {
    const route = useRoute();
    const walletStore = useWalletStore();
    const address = route.params.address as string;
    const { wallet } = storeToRefs(walletStore);

    const account = wallet.value.accounts.find(x => x.address === address);
    const title = Vue.ref(
      props.toMainchain ? 'Transfer Argons to Mainchain' : 'Transfer Argons to Localchain',
    );
    const balance = Vue.computed(() => {
      if (props.toMainchain) {
        return account?.balance || 0n;
      } else {
        return account?.mainchainBalance || 0n;
      }
    });
    onUpdated(() => {
      if (props.toMainchain) {
        title.value = 'Transfer Argons to Mainchain';
      } else {
        title.value = 'Transfer Argons to Localchain';
      }
    });

    return {
      transferAmount: Vue.ref<number>(0),
      balance,
      title,
      account,
      toArgons,
      modal: Vue.ref<typeof Modal>(null),
      errorMessage: Vue.ref<string>(),
    };
  },
  methods: {
    async transfer() {
      if (!this.transferAmount) {
        this.errorMessage = "You didn't enter an amount to transfer";
        return;
      }
      const transferAmount = BigInt(this.transferAmount);
      if (transferAmount <= 0n) {
        this.errorMessage = 'You must transfer a positive amount';
        return;
      }
      if (this.toMainchain) {
        if (transferAmount > this.account.balance) {
          this.errorMessage = 'You do not have enough Argons to transfer';
          return;
        }
      } else {
        if (transferAmount > this.account.mainchainBalance) {
          this.errorMessage = 'You do not have enough Argons to transfer';
          return;
        }
      }

      try {
        if (this.toMainchain) {
          await useWalletStore().transferToMainchain(transferAmount, this.account.address);
        } else {
          await useWalletStore().transferFromMainchain(transferAmount, this.account.address);
        }
      } catch (e) {
        this.errorMessage = e.message;
        return;
      }
      this.modal.close();
    },
    open() {
      this.modal.open();
    },
    onClose(isFromBackdrop: boolean) {
      if (!isFromBackdrop) {
        this.modal.close();
        requestAnimationFrame(() => {
          this.transferAmount = 0;
          this.errorMessage = '';
        });
      }
    },
  },
});
</script>
