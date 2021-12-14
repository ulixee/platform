<template>
  <div id="popup-box">
    <div id="content" ref="contentElem">
      <div v-if="state.circuitIsEmpty">
        <h5>Empty Circuit Found</h5>
        <p>You must define a gate before your script can continue. Learn more.</p>
        <div class="flex flex-row">
          <button @click.prevent="dismissAlert()">Dismiss</button>
          <button @click.prevent="openCircuitPanel()">Connect Current Page</button>
        </div>
      </div>

      <div v-if="state.circuitIsBroken">
        <h5>Broken Circuit Found</h5>
        <p>Your script has a circuit that did not match the current page. Learn more.</p>
        <div class="flex flex-row">
          <button @click.prevent="dismissAlert()">Dismiss</button>
          <button @click.prevent="openCircuitPanel()">Fix It</button>
        </div>
      </div>

      <div v-if="state.selectorIsEmpty">
        <h5>Empty Selector Found</h5>
        <p>You must define the selector before your script can continue. Learn more.</p>
        <div class="flex flex-row">
          <button @click.prevent="dismissAlert()">Dismiss</button>
          <button @click.prevent="openSelectorPanel()">Setup Selector</button>
        </div>
      </div>

      <div v-if="state.selectorIsBroken">
        <h5>Broken Selector Found</h5>
        <p>Your script has a magic selector that did not match an element. Learn more.</p>
        <div class="flex flex-row">
          <button @click.prevent="dismissAlert()">Dismiss</button>
          <button @click.prevent="openSelectorPanel()">Fix It</button>
        </div>
      </div>

      <div v-if="state.selectorIsBroken">
        <h5>Magic Selector Started</h5>
        <p>The selector currently has 1 element</p>
        <div class="flex flex-row">
          <button @click.prevent="dismissAlert()">Dismiss</button>
          <button @click.prevent="openSelectorPanel()">Open Selector Mode</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';

export default Vue.defineComponent({
  name: 'PopupAlert',
  components: {},
  setup() {
    const state = Vue.reactive({
      circuitIsEmpty: false,
      circuitIsBroken: false,
      selectorIsEmpty: false,
      selectorIsBroken: false,
      selectorElements: true
    });
    function setState(update) {
      Object.assign(state, update);
    }
    (window as any).setState = setState;

    const initialState = (window as any).initialState;
    if (initialState) setState(initialState);

    return {
      contentElem: Vue.ref<HTMLElement>(),
      state,
    };
  },
  methods: {
    openCircuitPanel() {
      (window as any).openCircuitPanel();
    },
    dismissAlert() {
      (window as any).dismissAlert();
    }
  },
  mounted() {
    const height = this.contentElem.scrollHeight;
    (window as any).setAlertContentHeight(height);
  }
});
</script>

<style lang="scss">
@import '../../assets/style/common-mixins';
@import '../../assets/style/resets';

:root {
  --toolbarBackgroundColor: #faf4ff;
  --toolbarBorder:  1px solid rgba(0, 0, 0, 0.3);
  --toolbarBorderRadius: 5px;
  --toolbarBoxShadow: 1px 1px 5px 3px rgba(0, 0, 0, 0.1);
}

#content {
  padding: 10px;

  h5 {
    font-size: 14px;
    text-transform: uppercase;
    margin-top: 0px;
    @apply font-bold;
  }

  p {
    @apply font-light;
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
  margin: 0;
  pointer-events: none;
}

#app {
  position: relative;
  pointer-events: auto;
}

body.left {
  #popup-box {
    border-radius: var(--toolbarBorderRadius);
    border: var(--toolbarBorder);
    border-right: none;
    margin-left: 8px;
    width: auto;
  }
}

#popup-box {
  flex: auto;
  flex-direction: column;
  box-sizing: border-box;
  width: calc(100% - 9px);
  height: calc(100% - 9px);
  overflow: hidden;
  background: var(--toolbarBackgroundColor);
  border: var(--toolbarBorder);
  border-left: none;
  box-shadow: var(--toolbarBoxShadow);
  border-radius: 0 var(--toolbarBorderRadius) var(--toolbarBorderRadius) 0;
}
</style>
