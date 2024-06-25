import type { IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { deepUnref } from '@/pages/desktop/lib/utils';

export { IWallet };

export const useWalletStore = defineStore('walletStore', () => {
  const wallet = ref<IWallet>({
    accounts: [],
    credits: [],
    brokerAccounts: [],
    formattedBalance: '0',
  } as IWallet);

  window.desktopApi.on('Wallet.updated', data => {
    wallet.value = data.wallet;
  });

  async function load() {
    wallet.value = await window.desktopApi.send('User.getWallet');
  }
  void load();

  async function createAccount(name: string, suri?: string, password?: string) {
    const account = await window.desktopApi.send('User.createAccount', { name, suri, password });
    wallet.value.accounts.push(account);
    return account;
  }

  async function addBrokerAccount(host: string, userIdentity: string, name?: string) {
    const account = await window.desktopApi.send('User.addBrokerAccount', {
      name,
      host,
      userIdentity,
    });
    wallet.value.brokerAccounts.push(account);
    return account;
  }

  async function transferFromMainchain(milligons: bigint, address?: string) {
    await window.desktopApi.send('Argon.transferFromMainchain', { milligons, address });
    await load();
  }

  async function transferToMainchain(milligons: bigint, address?: string) {
    await window.desktopApi.send('Argon.transferToMainchain', { milligons, address });
    await load();
  }

  async function saveCredits(credit: IArgonFile['credit']) {
    await window.desktopApi.send('Credit.save', { credit });
    await load();
  }

  async function saveSentArgons(argonFile: IArgonFile) {
    await window.desktopApi.send('Argon.importSend', { argonFile: deepUnref(argonFile) });
    await load();
  }

  async function approveRequestedArgons(argonFile: IArgonFile, fundWithAddress: string) {
    await window.desktopApi.send('Argon.acceptRequest', {
      argonFile: deepUnref(argonFile),
      fundWithAddress,
    });
    await load();
  }

  async function createSendArgonsFile(milligons: bigint, toAddress?: string, fromAddress?: string) {
    const argons = await window.desktopApi.send('Argon.send', {
      milligons,
      toAddress,
      fromAddress,
    });
    await load();
    return argons;
  }

  async function createRequestArgonsFile(milligons: bigint, sendToMyAddress?: string) {
    const argons = await window.desktopApi.send('Argon.request', {
      milligons,
      sendToMyAddress,
    });
    await load();
    return argons;
  }

  return {
    load,
    saveCredits,
    approveRequestedArgons,
    saveSentArgons,
    createSendArgonsFile,
    createRequestArgonsFile,
    createAccount,
    addBrokerAccount,
    transferFromMainchain,
    transferToMainchain,
    wallet,
  };
});
