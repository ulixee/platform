<template>
  <nav class="main-nav flex gap-15">
    <g-link to="/docs/hero">
      <span class="main-nav__label">Hero</span>
    </g-link>
    <g-link to="/docs/databox">
      <span class="main-nav__label">Databox</span>
    </g-link>
    <g-link to="/docs/server">
      <span class="main-nav__label">Server</span>
    </g-link>
  </nav>
</template>

<style lang="scss">
.main-nav {
  flex-wrap: nowrap;
}
@media screen and (max-width: 850px) {
  .main-nav {
    order: 10;
    min-width: 100%;
    a {
      padding-top: 5px;
      padding-bottom: 10px;
    }
  }
}
</style>
