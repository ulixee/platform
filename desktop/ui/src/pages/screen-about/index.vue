<template>
  <div class="container-md mx-auto">
    <div v-if="mode === 'circuits'" id="circuits">
      <h1>About Circuits</h1>
      <p>
        Circuits allow you to define and then detect what Location or State your Hero World is in.
      </p>
      <p>
        Locations and States are called "Gates". Each Gate can contain 1 or more assertions that
        make it a unique state.
      </p>
      <p>
        Superhero comes with a visual designer to help you sort various World's you've encountered
        into Gates
      </p>
      <p>
        Gates help you create branches of code for dealing with the different states you might
        encounter, such as:
      </p>

      <ul>
        <li>Redirections</li>
        <li>Popups</li>
        <li>Blocked</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from 'vue';
import { ChevronRightIcon } from '@heroicons/vue/24/solid';

export default Vue.defineComponent({
  name: 'About',
  components: { ChevronRightIcon },
  setup() {
    return {
      mode: Vue.ref<string>('circuits'),
    };
  },
  methods: {},
  mounted() {
    this.mode = location.pathname.split('/').pop();
  },
});
</script>

<style lang="scss">
#app {
  display: flex;
}
h1 {
  @apply font-bold py-3;
}
p {
  @apply py-2;
}
li {
  @apply list-disc px-1 mx-5;
}
</style>
