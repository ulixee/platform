<template>
  <div @dblclick="toggleMinimize" class="header flex flex-row border-b pr-2">
    <template v-if="section">
      <div class="go-back-wrapper self-stretch block mr-2">
        <div @click="goBack" class="go-back h-full w-full hover:bg-purple-200">
          <ChevronLeftIcon class="h-7 mx-2" />
        </div>
      </div>
      <img class="icon w-6 ml-2 mr-2" :src="section.icon" />
      <h1 class="flex-1">{{section.title}}</h1>
    </template>
    <template v-else>
      <img src="/icons/ulixee.svg" class="ml-3" v-if="isMinimized" />
      <h1 v-else class="flex-1 ml-3">Superhero</h1>
    </template>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ChevronLeftIcon } from '@heroicons/vue/solid';
import emitter from '../emitter';

export default Vue.defineComponent({
  name: 'Header',
  components: { ChevronLeftIcon },
  props: ['section', 'isMinimized'],
  methods: {
    goBack() {
      emitter.emit('showMain');
    },
    toggleMinimize() {
      emitter.emit('toggleMinimized');
    }
  }
});
</script>

<style lang="scss" scoped>
  h1 {
    @apply font-bold select-none;
  }

  .header {
    -webkit-app-region: drag;
    background: #EEE6F5;
    box-shadow: inset 0 -1px 0 #BFA4D5;
    border-bottom: 1px solid white;
    border-radius: var(--toolbarBorderRadius) var(--toolbarBorderRadius) 0 0 ;
    height: 46px;
    @apply items-center select-none;
    img {
      pointer-events: none;
      @apply w-5 mr-2 relative;
    }
    .go-back-wrapper {
      padding: 2px;
    }
    .go-back {
      padding-top: 8px;
      border-radius: var(--toolbarBorderRadius) 0 0 0 ;
      border-right: 1px solid rgba(0, 0, 0, 0.2);
      box-shadow: 1px 0 0 white, inset -1px 0 0 #EEE6F5;
    }
  }
</style>
