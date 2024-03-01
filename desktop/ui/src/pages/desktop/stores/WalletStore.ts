import type { IUserBalance } from '@ulixee/datastore/interfaces/IPaymentService';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export { IUserBalance };

export const useWalletStore = defineStore('walletStore', () => {
  const userBalance = ref<IUserBalance>({} as any);

  async function load() {
    userBalance.value = await window.desktopApi.send('User.getBalance');
  }
  void load();

  async function saveCredits(credit: IArgonFile['credit']) {
    await window.desktopApi.send('Credit.save', { credit });
    await load();
  }

  async function saveSentArgons(argonFile: IArgonFile) {
    await window.desktopApi.send('Argon.importSend', { argonFile });
    await load();
  }

  async function approveRequestedArgons(argonFile: IArgonFile) {
    await window.desktopApi.send('Argon.acceptRequest', { argonFile });
    await load();
  }

  return {
    load,
    saveCredits,
    approveRequestedArgons,
    saveSentArgons,
    userBalance,
  };
});
