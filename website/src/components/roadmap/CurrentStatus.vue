<template>
  <div class="border border-slate-400 rounded">
    <ul>
      <li>
        Current version {{version}}
      </li>
      <li>
        Source Code {{source}}
      </li>
      <li>
        Published Pkg {{package}}
      </li>
      <li>
        Status Summary
        <slot />
      </li>
    </ul>
  </div>
</template>


<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  props: [
    'version',
    'source',
    'package'
  ]
});
</script>
