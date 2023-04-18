import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { IUserBalance } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';

export { IUserBalance };

export const useWalletStore = defineStore('walletStore', () => {
  const userBalance = ref<IUserBalance>({} as any);

  async function load() {
    userBalance.value = await window.desktopApi.send('User.getBalance');
  }
  void load();

  const address = computed(() => userBalance.value.address);

  async function saveCredits(credit: IArgonFile['credit']) {
    await window.desktopApi.send('Credit.save', { credit });
    await load();
  }

   function saveCash(_cash: IArgonFile['cash']) {
    throw new Error('Not implemented');
    // await window.desktopApi.send('Argon.saveCash', { cash });
    // await load();
  }

  return {
    load,
    saveCredits,
    saveCash,
    userBalance,
    address,
  };
});
