<template>
  <div id="timeline-hover" :style="{ left: left() + 'px', ...cssVars }" ref="containerElement">
    <img :src="ICON_CARET" class="caret" />
    <div class="url">{{ hoverEvent.url || '...' }}</div>
    <div class="changes">
      {{ runtime() }}; {{ hoverEvent.domChanges }} dom changes, {{
        hoverEvent.storageChanges
      }}
      storage changes
    </div>
    <div class="screenshot">
      <img v-if="hoverEvent.imageBase64" :src="`data:image/jpg;base64,${hoverEvent.imageBase64}`" />
      <div class="status" v-if="hoverEvent.status">{{ hoverEvent.status }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { defineComponent, PropType } from 'vue';
import { ITimelineStats } from '@/components/Timeline.vue';

const ICON_CARET = require('@/assets/icons/caret.svg');

export interface ITimelineHoverEvent {
  offset: number;
  pageX: number;
  url: string;
  imageBase64: string;
  status: string;
  domChanges: number;
  storageChanges:number;
}
export interface ITimelineChangeEvent {
  offset: string;
  oldValue: string;
  value: number;
}

export default defineComponent({
  name: 'TimelineHover',
  components: {},
  props: {
    runtimeMs: Number,
    hoverEvent: {
      type: Object as PropType<ITimelineStats & { offset: number; pageX: number }>,
    },
  },
  setup() {
    let containerElement = Vue.ref<HTMLDivElement>(null);
    let containerMiddle: number;
    let boxWidth = 400;
    let cssVars = Vue.ref({
      '--box-width': `${boxWidth}px`,
    });

    return {
      ICON_CARET,
      containerElement,
      containerMiddle,
      cssVars,
      boxWidth,
    };
  },
  methods: {
    runtime(): string {
      const millis = Math.round((this.hoverEvent.offset / 100) * this.runtimeMs);
      if (millis > 1e3) {
        const runtimeSecs = Math.round(100 * (millis / 1000)) / 100;
        return `${runtimeSecs}s`;
      }
      return `${millis}ms`;
    },
    left(): number {
      return this.hoverEvent.pageX - this.boxWidth / 2;
    },
  },
});
</script>

<style lang="scss">
@import '../assets/style/resets';

#timeline-hover {
  pointer-events: none;
  display: none;
  flex: auto;
  flex-direction: column;
  box-sizing: border-box;
  padding: 2px 3px;
  width: var(--box-width);
  height: 250px;
  position: relative;
  top: -2px;
  background: white;
  border-radius: 5px;
  border: 1px solid #d9d9d9;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);

  .caret {
    position: absolute;
    box-sizing: border-box;
    top: -16px;
    left: 190px;
    width: 20px;
    height: 20px;
    filter: drop-shadow(-1px -1px 2px rgba(0, 0, 0, 0.3));
    pointer-events: none;
  }

  .url {
    margin-top: 5px;
    padding-bottom: 3px;
    padding-left: 3px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    box-sizing: border-box;
    margin-bottom: 3px;
  }
  .changes {
    padding-left: 3px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.8);
    box-sizing: border-box;
    padding-bottom: 3px;
  }

  .screenshot {
    display: flex;
    text-transform: uppercase;
    justify-content: center;
    text-align: center;
    box-sizing: border-box;
    padding: 0;
    align-content: center;
    align-items: center;
    flex: 3;
    margin-bottom: 5px;
    position: relative;

    img {
      position: absolute;
      left: 0;
      top: 0;
      object-fit: cover;
      width: 100%;
      height: 100%;
    }

    .status {
      font-weight: bold;
      color: #aaaaaa;
      font-size: 1.4em;
      opacity: 0.5;
      z-index: 2;
    }

    img ~ .status {
      position: absolute;
      top: 5px;
      font-size: 1em;
    }
  }
}
</style>
