<template>
  <div id="wrapper">
    <h1>Superhero</h1>

    <ul>
      <li>
        <img class="icon" src="/icons/circuits.svg" />
        <div class="label">Circuits</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/selectors.svg" />
        <div class="label">Selectors</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/worlds.svg" />
        <div class="label">Worlds</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/output.svg" />
        <div class="label">Output</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>

      <li>
        <img class="icon" src="/icons/timetravel.svg" />
        <div class="label">Timetravel</div>
        <div class="count">5</div>
        <ChevronRightIcon class="arrow" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/solid';

export default Vue.defineComponent({
  name: 'Toolbar',
  components: { ChevronRightIcon },
  methods: {
  },
});
</script>

<style lang="scss" scoped>
  #wrapper {
    background: #FAF4FF;
    border: 1px solid rgba(0,0,0,0.3);
    border-left: none;
    box-shadow: 1px 1px 5px 3px rgba(0,0,0,0.1);
    border-radius: 0 5px 5px 0;
    position: fixed;
    top: 0;
    left: 0;
    width: calc(100% - 8px);
    height: calc(100% - 8px);
  }

  h1 {
    @apply font-bold py-3 px-2;
  }
  li {
    @apply flex flex-row border-t py-3 pl-3 pr-2 text-sm;
    text-shadow: 1px 1px 0 white;
    &:hover {
      @apply bg-purple-100;
    }
    .icon {
      @apply w-5 mr-2;
    }
    .label {
      @apply flex-1;
    }
    .count {
      opacity: 0.4;
    }
    .arrow {
      @apply w-4 ml-2;
    }
  }
</style>
