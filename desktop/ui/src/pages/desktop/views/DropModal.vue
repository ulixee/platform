<template>
  <TransitionRoot
    :show="isOpen"
    enter="ease-out duration-300"
    enter-from="opacity-0"
    enter-to="opacity-100"
    leave="ease-in duration-200"
    leave-from="opacity-100"
    leave-to="opacity-0"
  >
    <div
      class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity flex items-center justify-center w-full"
    >
      <PlusCircleIcon class="text-white h-12" />
    </div>
  </TransitionRoot>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { PlusCircleIcon } from '@heroicons/vue/24/outline';
import { TransitionChild, TransitionRoot } from '@headlessui/vue';

export default Vue.defineComponent({
  name: 'DropModal',
  components: {
    TransitionChild,
    TransitionRoot,
    PlusCircleIcon,
  },
  props: {
    closeHandler: {
      type: Function as PropType<(reason: string) => boolean>,
    },
    isOpen: Boolean,
  },
});
</script>
