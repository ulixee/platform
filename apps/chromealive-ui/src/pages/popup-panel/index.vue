<template>
  <div class="wrapper" :class="{ 'dragging-session': !!draggingSessionId }">
    <Circuit />
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Circuit from './views/Circuit.vue';

export default Vue.defineComponent({
  name: 'PopupPanel',
  components: { Circuit },
});
</script>

<style lang="scss">
:root {
  --panelBackgroundColor: #FDFBFF;
  --toolbarBackgroundColor: #faf4ff;
  --toolbarBorder:  1px solid rgba(0, 0, 0, 0.3);
  --toolbarBorderRadius: 5px;
  --toolbarBoxShadow: 1px 1px 5px 3px rgba(0, 0, 0, 0.1);
  --buttonActiveBackgroundColor: rgba(176, 173, 173, 0.4);
  --buttonHoverBackgroundColor: rgba(255, 255, 255, 0.08);
}

body {
  height: 100vh;
  margin: 0;
  border-top: 0 none;
  width: 100%;
}

.wrapper {
  box-sizing: border-box;
  background: white;
  margin: 8px 0 0 8px;
  background: var(--panelBackgroundColor);
  width: calc(100% - 17px);
  height: calc(100% - 17px);
  border: var(--toolbarBorder);
  box-shadow: var(--toolbarBoxShadow);
  border-radius: var(--toolbarBorderRadius);
}
</style>
