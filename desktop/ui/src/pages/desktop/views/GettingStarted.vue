<template>
  <div class="h-full">
    <div class="">
      <nav class="my-3 flex" aria-label="Breadcrumb">
        <ol role="list" class="flex items-center space-x-4">
          <li>
            <div>
              <span class="text-2xl font-semibold text-gray-900 hover:text-gray-700">Getting Started with Ulixee</span>
            </div>
          </li>
        </ol>
      </nav>
      <div class="mt-5 flex flex-row">
        <nav aria-label="Progress" class="basis-1/3">
          <ol role="list" class="overflow-hidden pr-3">
            <li
              v-for="(step, stepIdx) in steps"
              :key="step.name"
              :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']"
            >
              <div
                v-if="stepIdx !== steps.length - 1"
                class="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5"
                :class="[step.isComplete ? 'bg-fuchsia-800' : ' bg-gray-300']"
                aria-hidden="true"
              />
              <router-link
                :to="'/getting-started/' + step.href"
                class="group relative flex items-start"
              >
                <span class="flex h-9 items-center">
                  <span
                    class="relative z-10 flex h-8 w-8 items-center justify-center rounded-full"
                    :class="[
                      step.isComplete
                        ? 'bg-fuchsia-800 group-hover:bg-fuchsia-700'
                        : isCurrent(step, stepIdx)
                          ? 'border-2 border-fuchsia-800 bg-white'
                          : 'border-2 border-gray-300 bg-white group-hover:border-gray-400',
                    ]"
                  >
                    <CheckIcon
                      v-if="step.isComplete"
                      class="h-5 w-5 text-white"
                      aria-hidden="true"
                    />
                    <span
                      v-else-if="isCurrent(step, stepIdx)"
                      class="h-2.5 w-2.5 rounded-full bg-fuchsia-800"
                    />
                    <span
                      v-else
                      class="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300"
                    />
                  </span>
                </span>
                <span class="ml-4 flex min-w-0 flex-col">
                  <span
                    class="text-sm font-medium"
                    :class="[
                      isCurrent(step, stepIdx)
                        ? 'text-fuchsia-800'
                        : step.isComplete
                          ? ''
                          : 'text-gray-500',
                    ]"
                  >{{ step.name }}</span>
                  <span class="text-sm text-gray-500">{{ step.description }}</span>
                </span>
              </router-link>
            </li>
          </ol>
        </nav>
        <div
          class="max-w-2/3 basis-2/3 overflow-hidden border border-gray-200 px-8 py-7 shadow-inner"
        >
          <div class="transition-opacity duration-150 ease-linear">
            <router-view />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script type="ts">
import { defineComponent } from 'vue';
import { CheckIcon } from '@heroicons/vue/24/solid';
import { useGettingStartedStore } from '@/pages/desktop/stores/GettingStartedStore';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';

export default defineComponent({
  name: 'GettingStarted',
  components: {
    CheckIcon
  },
  setup() {
    const gettingStartedStore = useGettingStartedStore();
    const { steps } = storeToRefs(gettingStartedStore);
    const route = useRoute();

    // redirect to first incomplete step if this is default url
    if ((route.path === '/' || route.path === '/getting-started') && steps.value[0].isComplete) {
      gettingStartedStore.gotoNextIncompleteStep();
    }
    return {
      steps,
    };
  },
  methods: {
    isCurrent(step,stepIdx) {
      return this.$route.path.endsWith(step.href) || (this.$route.path === '/' && stepIdx === 0)|| (this.$route.path === '/getting-started' && stepIdx === 0);
    },
  }
});
</script>
