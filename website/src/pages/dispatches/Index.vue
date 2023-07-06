<template>
  <div>
    <div class='DispatchesIndex Page mt-[52px] pt-12 pb-10 mx-[7%]'>
      <h1 class="font-bold text-lg text-ulixee-darker md:text-2xl xl:text-2xl tracking-[0.2em] uppercase">Dispatches</h1>

      <p class='font-light text-base mt-3 leading-normal w-9/12'>
        A blog-of-sorts about Ulixee and the Argon. Check back for the latest news, updates, and software release notes.
      </p>

      <ul class='mt-12 border-t border-slate-300 pt-16'>
        <li>
          <router-link to='/dispatches/hello-world'>
            <span>Latest Post</span>
            <div class='flex flex-row font-light text-slate-400 whitespace-nowrap'>
              <i class='w-full'>January 15, 2024, 5 minute read</i>
              <i>Launch</i>
            </div>
            <header>Hello World</header>
            <p>The internet needs a new business model. Advertising and clickbait is the dominant means of revenue generation.</p>
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang='ts'>
</script>

<style lang='scss'>
.DispatchesIndex {
  li {
    a {
      @apply rounded py-5 px-8 relative no-underline block;
      background: #F8FAFF;
      border: 1px solid rgba(151, 151, 151, 0.5);

      &:hover {
        border: 1px solid rgba(151, 151, 151, 0.7);
        box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
      }
    }
    header {
      @apply font-bold text-xl mt-4 mb-1;
    }
    p {
      @apply text-base font-light;
    }
    span {
      @apply absolute inline-block bg-white text-slate-400 px-6 py-1 rounded border border-slate-300 font-bold uppercase;
      top: 0;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}
</style>