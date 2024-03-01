<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog
      as="div"
      class="relative z-10"
      @close="handleClose($event, true)"
    >
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div
          class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative my-8 transform overflow-hidden rounded-lg bg-white p-6 px-4 pt-5 pb-4 text-left shadow-xl transition-all"
              :class="dialogClass"
            >
              <h3 class="ml-2 text-lg">
                {{ title }}
              </h3>
              <div class="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  class="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  @click="handleClose($event, false)"
                >
                  <span class="sr-only">Close</span>
                  <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div class="mt-5 max-w-fit border-t border-slate-200">
                <slot />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { PropType } from 'vue';

export default Vue.defineComponent({
  name: 'Modal',
  components: {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
    XMarkIcon,
  },
  props: {
    title: String,
    dialogClass: String,
    closeHandler: {
      type: Function as PropType<(didClickBackdrop: boolean) => void>,
    },
  },
  setup() {
    return { isOpen: Vue.ref(false) };
  },
  methods: {
    close() {
      this.isOpen = false;
    },
    open() {
      this.isOpen = true;
    },
    handleClose(event, didClickBackdrop: boolean) {
      if (this.closeHandler) return this.closeHandler(didClickBackdrop);
      this.close();
    },
  },
});
</script>
