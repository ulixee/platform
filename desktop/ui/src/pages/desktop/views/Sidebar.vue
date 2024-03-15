<template>
  <div>
    <div class="fixed inset-y-0 flex w-64 flex-col">
      <div class="flex min-h-0 flex-1 flex-col bg-gray-800 pt-10">
        <div class="flex flex-1 flex-col overflow-y-auto">
          <nav class="flex-1 space-y-1 px-2 py-4">
            <router-link
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              :class="[
                item.href === $route.path ||
                  $route.path.startsWith(item.href.slice(0, -1)) ||
                  item.alias === $route.path
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium',
              ]"
            >
              <component
                :is="item.icon"
                :class="[
                  'text-gray-400 group-hover:text-gray-300',
                  'mr-3 h-6 w-6 flex-shrink-0',
                ]"
                aria-hidden="true"
              />
              {{ item.name }}
            </router-link>
          </nav>
        </div>

        <div
          class="group flex flex-shrink-0 p-4"
          :class="[walletActive ? 'bg-gray-600' : 'bg-gray-700 ']"
        >
          <router-link to="/wallet" class="block w-full flex-shrink-0">
            <div class="flex items-center">
              <div>
                <ArgonIcon
                  class="inline-block h-8 w-8 text-gray-200"
                  :class="{ 'group-hover:text-gray-300': !walletActive }"
                />
              </div>
              <div class="ml-3 overflow-hidden">
                <p
                  class="text-lg text-gray-200 w-full overflow-hidden text-ellipsis "
                  :class="{ 'group-hover:text-gray-300': !walletActive }"
                >
                  Wallet
                  <span
                    class="ml-1 font-bold text-xl text-white"
                    :class="{ 'group-hover:text-gray-300': !walletActive }"
                  >
                    {{ wallet.formattedBalance }}
                  </span>
                </p>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
    <ReceiveArgonsModal :argon-file="argonFile" />
    <DropModal :is-open="isDragging" />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import ArgonIcon from '@/assets/icons/argon.svg';
import {
  BellIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronDownIcon,
  CloudIcon,
  FolderIcon,
  HomeIcon,
  RocketLaunchIcon,
  InboxIcon,
  UsersIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue';
import { MagnifyingGlassIcon } from '@heroicons/vue/20/solid';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { useCloudsStore } from '@/pages/desktop/stores/CloudsStore';
import { useDatastoreStore } from '@/pages/desktop/stores/DatastoresStore';
import { useWalletStore } from '@/pages/desktop/stores/WalletStore';
import { storeToRefs } from 'pinia';
import Replays from './Replays.vue';
import Clouds from './Clouds.vue';
import Datastores from './Datastores.vue';
import Overview from './Overview.vue';
import Wallet from './Wallet.vue';
import DropModal from './DropModal.vue';
import ReceiveArgonsModal from './ReceiveArgonsModal.vue';

export default Vue.defineComponent({
  name: 'DesktopHome',
  components: {
    ArgonIcon,
    RocketLaunchIcon,
    MagnifyingGlassIcon,
    Replays,
    Clouds,
    Datastores,
    Overview,
    ChevronDownIcon,
    Dialog,
    DialogPanel,
    DropModal,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    TransitionChild,
    TransitionRoot,
    BellIcon,
    BuildingStorefrontIcon,
    CalendarIcon,
    ChartBarIcon,
    FolderIcon,
    VideoCameraIcon,
    Wallet,
    HomeIcon,
    InboxIcon,
    UsersIcon,
    XMarkIcon,
    ReceiveArgonsModal,
  },
  setup() {
    const navigation = Vue.ref([
      { name: 'Getting Started', href: '/getting-started', icon: RocketLaunchIcon, alias: '/' },
      {
        name: 'Datastores',
        href: '/datastores',
        icon: BuildingStorefrontIcon,
      },
      { name: 'Hero Replays', href: '/replays', icon: VideoCameraIcon },
      { name: 'Clouds', href: '/clouds', icon: CloudIcon },
    ]);

    const datastoreStore = useDatastoreStore();
    const walletStore = useWalletStore();
    const { wallet } = storeToRefs(walletStore);

    return {
      datastoreStore,
      navigation,
      datastoresRef: Vue.ref<typeof Datastores>(null),
      walletActive: Vue.ref(false),
      isDragging: Vue.ref(false),
      wallet,
      argonFile: Vue.ref<IArgonFile>(null),
    };
  },
  watch: {
    '$route.path': function (value) {
      this.walletActive = value === '/wallet';
    },
  },
  methods: {
    dragover(e) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
    },
    dragging(e) {
      e.preventDefault();
      e.stopPropagation();
    },
    dragend(e) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
    },
  },

  mounted() {
    document.addEventListener('drop', async e => {
      this.dragend(e);

      for (const f of e.dataTransfer.files) {
        const path = (f as any).path;
        if (!path.endsWith('.arg')) {
          alert(`Unexpected File Drop (${path})`);
          continue;
        }
        try {
          await window.desktopApi.send('Argon.dropFile', path);
        } catch (err) {
          alert((err as any).message);
        }
      }
    });
    document.addEventListener('dragstart', this.dragging);
    document.addEventListener('dragover', this.dragover);
    document.addEventListener('dragend', this.dragend);
    document.addEventListener('dragleave', this.dragend);

    if (window.openedArgonFile) {
      this.argonFile = window.openedArgonFile;
    }
    window.desktopApi.on('Argon.opened', data => {
      this.argonFile = data;
    });
  },
  unmounted() {
    useCloudsStore().disconnect();
  },
});
</script>

<style lang="scss" scoped>
@use 'sass:math';

.tabbar {
  @apply bg-slate-100;
  box-shadow: 1px 0 2px rgba(0, 0, 0, 0.2);
}
</style>
