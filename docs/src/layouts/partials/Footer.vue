<template>
  <footer class="font-light py-3 px-5 text-gray-600 opacity-50 text-sm flex flex-row w-full">
    <div>
      An open source project by
      <g-link to="https://github.com/calebjclark">@calebjclark</g-link> and
      <g-link to="https://github.com/blakebyrnes">@blakebyrnes</g-link>
    </div>
    <div class="hidden md:block text-right flex-1">
      Because knowledge deserves to be free.
    </div>
  </footer>
</template>

<style lang="scss">
  footer {
    font-size: 0.75rem;
    background-color: var(--bg);
    border-top: 1px solid var(--border-color);
    margin-top: -1px;
    padding: 20px;
    z-index: 10;
  }
</style>
