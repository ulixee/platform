<template>
  <div class="Fields Component">
    <ul class="fields">
      <li v-for="name of Object.keys(schema)">
        <Field :name="name" :field="schema[name]" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import Field from './Field.vue';

export default Vue.defineComponent({
  components: {
    Field,
  },
  props: {
    schema: {
      default: {},
    },
  },
});
</script>

<style lang="scss">
@import '../assets/scss/reset';
.Fields {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);

  ul.fields {
    @include reset-ul();
    & {
      border-left: 1px dashed rgba(0, 0, 0, 0.2);
    }
    & > li {
      padding-left: 20px;
      position: relative;
      &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 13px;
        margin-top: 1px;
        height: 1px;
        width: 15px;
        border-top: 1px dashed rgba(0, 0, 0, 0.2);
      }
    }
  }
}
</style>
