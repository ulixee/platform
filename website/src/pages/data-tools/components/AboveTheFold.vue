<template>
  <div class="ABOVE-THE-FOLD border-b border-gray-300 py-16 px-24 leading-relaxed font-light">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.ABOVE-THE-FOLD {
  background: linear-gradient(to bottom, #F2F4F5, white);
  box-shadow: 0 1px 5px rgba(0,0,0,0.1);
}
</style>