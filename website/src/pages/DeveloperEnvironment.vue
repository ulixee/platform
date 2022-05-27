<template>
  <MainLayout class="DeveloperDesktop">
    <h1 class="text-7xl font-light mb-3">
      Developer Desktop
    </h1>

    <p class="w-8/12">Ulixee Developer Desktop is a native app for Mac, Windows, and Linux that includes everything you need to get started.
      It has a beautiful user interface and a convenient menu bar item without sacrificing the command line.</p>

    <div class="mt-2">
      <button class="DESKTOP-BUTTON">
        <inline-svg :src="require('@/assets/footer-icons/mac.svg')" height="25" class="inline-block relative -top-[2px]" />
        Ulixee for Mac
      </button>
      <button class="DESKTOP-BUTTON">
        <inline-svg :src="require('@/assets/footer-icons/windows.svg')" height="25" class="inline-block mr-1" />
        Ulixee for Windows
      </button>
      <button class="DESKTOP-BUTTON">
        <inline-svg :src="require('@/assets/footer-icons/linux.svg')" height="25" class="inline-block relative -top-[1px]" />
        Ulixee for Linux
      </button>
    </div>

    <h2 class="font-bold text-xl mt-10">Install It à La Carte</h2>
    <p class="w-8/12">You can install most of the Developer Desktop tools as individual npm packages. You won't get the tight OS integrations and UI enhacements, but hey, at least you have options.</p>

    <Prism language="shell" class="w-7/12">
      npm install @ulixee/server
    </Prism>
    <Prism language="shell" class="w-7/12">
      npm install @ulixee/chromealive
    </Prism>
  </MainLayout>
</template>

<script lang="ts">
import * as Vue from "vue";
import Prism from "@/components/Prism.vue";

export default Vue.defineComponent({
    components: { Prism }
});
</script>

<style lang="scss" scoped>
.DESKTOP-BUTTON {
  @apply text-white inline-block rounded border border-[#7f5085] px-5 py-2 mt-5 font-bold text-lg;
  background: rgb(189, 126, 198);
  box-shadow: inset 1px 1px 0 rgba(255,255,255,0.4);
}
</style>
