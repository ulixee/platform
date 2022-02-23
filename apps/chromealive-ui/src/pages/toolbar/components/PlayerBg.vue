<template>
  <div class="PlayerBg">
    <div class="bar-base flex flex-row">
      <div class="bar flex-1"></div>
      <div class="ran-since">LAST RAN 3s AGO</div>
    </div>
  </div>
</template>

<script lang="ts">
  import * as Vue from 'vue';

  export default Vue.defineComponent({
    name: 'PlayerBg',
    components: {},
  });

</script>

<style lang="scss" scoped="scoped">
  @import "../variables";

  .bar {
    background-color: #C39ED2;
    height: 16px;
    position: relative;
    border-right: 1px solid #FAF4FF;
    &:after {
      content: '';
      position: absolute;
      top: 0;
      right: -7px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 7px solid #C39ED2;
    }
  }

  .ran-since {
    font-size: 12px;
    white-space: nowrap;
    padding: 0 5px 0 10px;
  }
</style>
