<template>
  <Modal
    ref="modal"
    :title="
      argonFile?.credit && datastore
        ? 'You Received Argon Credits!'
        : argonFile?.send && isValidArgonRequest
          ? 'You Received Argons!'
          : argonFile?.request
            ? 'You Received a Request for Argons.'
            : 'Problem with Argons :('
    "
  >
    <div class="divider-y divider-slate-100 my-5">
      <div v-if="argonFile?.credit" class="items-left my-5 flex flex-col px-3">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-base font-semibold leading-6 text-gray-900">Argon File</h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            You received a {{ toArgons(argonFile.credit.microgons, true) }} credit
            <template v-if="datastore?.name">
              good at a Datastore called "{{ datastore.name }}".
            </template>
            <template v-else-if="datastore?.domain">
              good at the Datastore at "{{ datastore.domain }}".
            </template>
            <template v-else-if="datastore?.scriptEntrypoint">
              good at the Datastore called "{{ datastore?.scriptEntrypoint }}".
            </template>
            <template v-else-if="datastore">
              good at a Datastore with id "{{ datastore.id }}".
            </template>
            <template v-else> from a Datastore that can't be found. </template>
          </p>
        </div>
        <div class="border-t border-gray-200">
          <dl>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Datastore</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ datastore?.name ?? datastore?.scriptEntrypoint ?? 'na' }}
              </dd>
            </div>
            <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Documentation</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <a
                  href="#"
                  class="font-semibold text-fuchsia-800 underline hover:text-fuchsia-800/70"
                  @click.prevent="showDatastoreDocs()"
                >
                  View docs
                  <ArrowTopRightOnSquareIcon class="-mt-1 ml-2 inline h-4 text-gray-500" />
                </a>
              </dd>
            </div>
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Credit Value</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ toArgons(argonFile.credit.microgons, true) }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-5 flex w-full flex-row items-center gap-4">
          <button
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border border-gray-400 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="modal.close()"
          >
            <XMarkIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Close
          </button>

          <button
            v-if="!isAccepted"
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            :class="[!datastore ? 'cursor-not-allowed bg-fuchsia-700/50' : 'hover:bg-fuchsia-600']"
            :disabled="!datastore"
            @click.prevent="acceptDatastoreCredit"
          >
            <DocumentArrowDownIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Accept
          </button>
          <span
            v-else
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold"
          >
            <DocumentArrowDownIcon
              class="-ml-0.5 h-5 w-5 text-fuchsia-700"
              aria-hidden="true"
            />Accepted!</span
          >
        </div>
      </div>
      <div
        v-else-if="argonFile?.send || argonFile?.request"
        class="items-left my-5 flex flex-col px-3"
      >
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-base font-semibold leading-6 text-gray-900">Argon File</h3>
          <p v-if="argonFile.send" class="mt-1 max-w-2xl text-sm text-gray-500">
            This file has Argons worth {{ toArgons(milligons, false) }}.
            <span v-if="isValidArgonRequest">Click below to save it to your wallet.</span>
            <span v-else
              >It was not sent to an address in your wallet. Please add this Localchain before
              saving the argons.</span
            >
          </p>
          <p v-else class="mt-1 max-w-2xl text-sm text-gray-500">
            This is a request to send {{ toArgons(milligons, false) }}.
            <span v-if="isValidArgonRequest"
              >Click below to accept the charges to your wallet.</span
            >
          </p>
        </div>
        <div class="border-t border-gray-200">
          <dl v-for="change of argonFile.send || argonFile.request">
            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Account ({{ change.accountType }})</dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ change.accountId }}
              </dd>
            </div>
            <div
              v-for="note of change.notes"
              class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
            >
              <dt class="text-sm font-medium text-gray-500">
                {{ displayNote(note) }}
              </dt>
              <dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {{ toArgons(note.milligons) }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-5 flex w-full flex-row items-center gap-4">
          <Listbox
            v-if="argonFile.request && wallet.accounts.length > 1"
            v-model="sendFromName"
            as="div"
            class="space-between mx-auto mb-3 flex flex-row justify-center text-center w-2/3"
          >
            <ListboxLabel class="mr-2 py-2 text-sm font-medium text-gray-900">
              Fulfill this request from:
            </ListboxLabel>
            <div class="relative basis-1/3">
              <ListboxButton
                class="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-800 sm:text-sm sm:leading-6"
              >
                <span class="block truncate">{{ sendFromName }}</span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </ListboxButton>

              <transition
                leave-active-class="transition ease-in duration-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                >
                  <ListboxOption
                    v-for="account in wallet.accounts"
                    :key="account.name"
                    v-slot="{ active, selected }"
                    as="template"
                    :value="account.name"
                  >
                    <li
                      :class="[
                        active ? 'bg-gray-700 text-white' : 'text-gray-900',
                        'relative cursor-default select-none py-2 pl-3 pr-9',
                      ]"
                    >
                      <span
                        :class="[
                          selected ? 'font-semibold' : 'font-normal',
                          'block truncate text-left',
                        ]"
                        >{{ account.name }}</span
                      >
                      <span
                        v-if="selected"
                        :class="[
                          active ? 'text-white' : 'text-indigo-600',
                          'absolute inset-y-0 right-0 flex items-center pr-4',
                        ]"
                      >
                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </transition>
            </div>
          </Listbox>

          <button
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border border-gray-400 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            @click.prevent="modal.close()"
          >
            <XMarkIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Close
          </button>

          <button
            v-if="!isAccepted"
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md bg-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800"
            :class="[
              !isValidArgonRequest
                ? 'cursor-not-allowed bg-fuchsia-700/50'
                : 'hover:bg-fuchsia-600',
            ]"
            :disabled="!isValidArgonRequest"
            @click.prevent="acceptArgonFile"
          >
            <DocumentArrowDownIcon class="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Accept
          </button>
          <span
            v-else
            class="mt-3 inline-flex w-full items-center gap-x-1.5 rounded-md border-fuchsia-700 px-3.5 py-2.5 text-sm font-semibold"
          >
            <DocumentArrowDownIcon
              class="-ml-0.5 h-5 w-5 text-fuchsia-700"
              aria-hidden="true"
            />Accepted!</span
          >
        </div>
      </div>
      <div v-else class="my-5 w-full items-center px-2">
        <p class="font-regular mb-10 text-gray-800">This Argon file could not be processed.</p>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/vue';
import * as Vue from 'vue';
import { PropType } from 'vue';
import {
  DocumentArrowDownIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/vue/24/outline';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { toArgons } from '@/pages/desktop/lib/utils';
import { IDatastoreSummary, useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { storeToRefs } from 'pinia';
import INote from '@ulixee/platform-specification/types/INote';
import Modal from '../components/Modal.vue';

export default Vue.defineComponent({
  name: 'ReceiveArgonsModal',
  components: {
    Modal,
    DocumentArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    XMarkIcon,
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
  },
  props: {
    argonFile: {
      type: Object as PropType<IArgonFile>,
      required: true,
      default: () => ({}) as IArgonFile,
    },
  },
  setup(props) {
    const walletStore = useWalletStore();
    const { wallet } = storeToRefs(walletStore);
    const datastore = Vue.ref<IDatastoreSummary>(null);
    return {
      toArgons,
      modal: Vue.ref<typeof Modal>(null),
      isValidArgonRequest: Vue.ref(false),
      datastore,
      wallet,
      sendFromName: Vue.ref<string>(null),
      milligons: Vue.ref<number>(),
      isAccepted: Vue.computed(() => {
        if (props.argonFile?.credit) {
          const url = props.argonFile.credit.datastoreUrl;
          return wallet.value.credits.some(x => url.includes(x.creditsId) && url.includes(x.host));
        }
        return false;
      }),
    };
  },
  watch: {
    async argonFile(value: IArgonFile) {
      if (value) {
        if (value.credit) {
          const datastoresStore = useDatastoreStore();
          this.datastore = await datastoresStore.getByUrl(value.credit.datastoreUrl);
          this.milligons = 0;
        } else if (value.send) {
          this.milligons = 0;
          const walletStore = useWalletStore();
          const wallet = walletStore.wallet;
          this.isValidArgonRequest = true;
          for (const change of value.send) {
            for (const note of change.notes) {
              if (note.noteType.action === 'send') {
                this.milligons += Number(note.milligons);
                if (note.noteType.to) {
                  const toAddresses = note.noteType.to;
                  this.isValidArgonRequest = toAddresses.some(x =>
                    wallet.accounts.some(y => y.address === x),
                  );
                }
              }
            }
          }
        } else if (value.request) {
          this.milligons = 0;
          this.isValidArgonRequest = true;
          for (const change of value.send) {
            if (change.accountType === 'tax') {
              continue;
            }
            for (const note of change.notes) {
              if (note.noteType.action === 'claim') {
                this.milligons += Number(note.milligons);
              }
            }
          }
        }
        this.open();
      }
    },
  },
  methods: {
    showDatastoreDocs() {
      const argonFile = this.argonFile;
      const version = this.datastore?.version ?? 'unknown';
      const datastoreId = this.datastore?.id ?? 'unknown';
      const url = useDatastoreStore().getDocsUrl(argonFile.credit.datastoreUrl);
      window.open(url, `Docs${datastoreId}${version}`);
    },
    async acceptDatastoreCredit() {
      const argonFile = this.argonFile;
      await useDatastoreStore().installDatastoreByUrl(
        this.datastore,
        argonFile.credit.datastoreUrl,
      );
      const wallet = useWalletStore();
      await wallet.saveCredits({ ...argonFile.credit });
    },
    open() {
      this.modal.open();
    },
    displayNote(note: INote) {
      if (note.noteType.action === 'send') {
        if (note.noteType.to) {
          return `Send to ${note.noteType.to
            .map(x => {
              const localchain = this.wallet.accounts.find(y => y.address === x);
              if (localchain) {
                return `you at ${localchain.name}`;
              }
              return x;
            })
            .join(', ')}`;
        }
        return `Sent un-restricted cash`;
      }
      if (note.noteType.action === 'claim') {
        return `Claim`;
      }
      if (note.noteType.action === 'tax') {
        return `Tax`;
      }
      if (note.noteType.action === 'leaseDomain') {
        return `Lease domain`;
      }
      if (note.noteType.action === 'claimFromMainchain') {
        return `Claim from Mainchain`;
      }
      if (note.noteType.action === 'escrowClaim') {
        return `Escrow Claim`;
      }
      if (note.noteType.action === 'escrowSettle') {
        return `Escrow Settle`;
      }
      if (note.noteType.action === 'escrowHold') {
        return `Escrow Hold`;
      }
      if (note.noteType.action === 'sendToMainchain') {
        return `Send to Mainchain`;
      }
      if (note.noteType.action === 'sendToVote') {
        return `Send to Vote`;
      }
    },
    async acceptArgonFile() {
      const argonFile = this.argonFile;
      const wallet = useWalletStore();
      if (argonFile.send) {
        await wallet.saveSentArgons(argonFile);
      } else if (argonFile.request) {
        const sendFromAddress = this.wallet.accounts.find(
          x => x.name === this.sendFromName,
        )?.address;
        await wallet.approveRequestedArgons(argonFile, sendFromAddress);
      }
      this.modal.close();
    },
  },
});
</script>
