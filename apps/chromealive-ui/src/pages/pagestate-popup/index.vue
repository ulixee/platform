<template>
  <img :src="ICON_CARET" class="caret" />
  <div id="pagestate-popup">
    <div class="wrapper">
      <h5 v-if="!pageState.isResolving">{{ pageState.message }}</h5>
      <h5 v-else>Page State <span class="loading"> </span></h5>

      <button @click.prevent="openPageState()">Open Generator</button>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

const ICON_CARET = require('@/assets/icons/caret.svg');

export default Vue.defineComponent({
  name: 'PageStatePopup',
  components: {},
  setup() {
    const pageState = Vue.reactive({ message: 'New Page State Found', isResolving: false });
    function onPageStateUpdated(state) {
      Object.assign(pageState, state);
    }
    (window as any).onPageStateUpdated = onPageStateUpdated;
    const startstate = (window as any).pageState;
    if (startstate) onPageStateUpdated(startstate);

    return {
      pageState,
      ICON_CARET,
    };
  },
  methods: {
    openPageState() {
      (window as any).openPageState();
    },
  },
  computed: {},
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

:root {
  --toolbarBackgroundColor: #faf4ff;
}

html {
  padding: 0;
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  font-size: 13px;
  background: transparent;
  &::-webkit-scrollbar {
    display: none;
  }
}

body {
  padding: 0;
  margin: 10px 0 0;
  pointer-events: none;
}
#app {
  position: relative;
  pointer-events: auto;
}
.caret {
  position: absolute;
  box-sizing: border-box;
  top: -15px;
  right: 70px;
  width: 20px;
  height: 20px;
  pointer-events: none;
}

#pagestate-popup {
  flex: auto;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: var(--toolbarBackgroundColor);

  h5 {
    font-size: 23px;
    text-align: center;
    text-transform: uppercase;
    margin-top: 20px;

    .loading {
      opacity: 0.6;
      cursor: not-allowed;
      background-image: url('~@/assets/icons/loading-bars.svg');
      background-position: center right;
      background-repeat: no-repeat;
      width: 16px;
      height: 16px;
      display: inline-block;
      margin-left: 5px;
    }
  }

  button {
    cursor: pointer;
    position: relative;
    transition: 0.2s background-color;
    backface-visibility: hidden;
    background-color: transparent;
    border-radius: 4px;
    border-width: 1px;
    padding: 2px 5px;
    line-height: 25px;
    display: block;
    float: right;
    margin-right: 50px;
  }
}
</style>
