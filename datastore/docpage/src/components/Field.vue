<template>
  <div class="Field Component">
    <div class="details">
      <div class="left">
        <div class="name">
          {{ name }}<span>{{ field.optional ? '?' : '' }}</span>
        </div>
      </div>
      <div class="line"></div>
      <div class="right">
        <span class="desc" v-if="field.description">{{ field.description }}</span>
        <span class="desc" v-for="attr of attributes">{{ attr }}({{ field[attr] }})</span>
        <span class="type">{{ field.typeName?.toLowerCase() }}</span>
      </div>
    </div>
    <ul class="children">
      <li v-for="[name, property] of nestedFields">
        <Field :name="name" :field="property" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { PropType } from 'vue';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';

export default Vue.defineComponent({
  name: 'Field',
  components: {},
  props: {
    name: {
      default: '',
    },
    field: {
      type: Object as PropType<IAnySchemaJson>,
      default: () => ({} as IAnySchemaJson),
    },
  },
  setup(props) {
    const nestedFields: [string, IAnySchemaJson][] = [];
    if (props.field?.typeName === 'array') {
      for (const [name, field] of Object.entries(props.field.element.fields)) {
        nestedFields.push([name, field]);
      }
    } else if (props.field?.typeName === 'record') {
      if (props.field.keys) nestedFields.push(['keys', props.field.keys]);
      nestedFields.push(['values', props.field.values]);
    } else if (props.field?.typeName === 'object') {
      for (const [name, field] of Object.entries(props.field.fields)) {
        nestedFields.push([name, field]);
      }
    }
    return {
      attributes: Vue.ref(
        Object.keys(props.field).filter(
          x =>
            x !== 'description' &&
            x !== 'typeName' &&
            x !== 'element' &&
            x !== 'field' &&
            x !== 'optional',
        ),
      ),
      nestedFields: Vue.ref(nestedFields),
    };
  },
});
</script>

<style lang="scss">
@import '../assets/scss/reset';
.Field {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);

  .type {
    display: inline-block;
    background: #929292;
    border-radius: 3px;
    color: white;
    text-shadow: none;
    padding: 0 5px 1px;
    line-height: 14px;
    box-sizing: border-box;
    min-width: 55px;
    text-align: center;
  }
  .details {
    position: relative;
    display: table;
    white-space: nowrap;
    height: 26px;
    line-height: 26px;

    & > div {
      vertical-align: middle;
    }
    .left {
      display: table-cell;
    }
    .line {
      display: table-cell;
      width: 100%;
      &:after {
        content: '';
        height: 1px;
        display: block;
        margin: 4px 5px 0;
        position: relative;
        border-top: 1px dashed rgba(0, 0, 0, 0.2);
      }
    }
    .right {
      display: table-cell;
    }
    .name span {
      margin-left: 3px;
    }
    .desc {
      color: rgba(0, 0, 0, 0.5);
      margin-right: 8px;
    }
  }
  ul.children {
    @include reset-ul();
    border-left: 1px dashed rgba(0, 0, 0, 0.2);
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
