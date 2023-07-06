<template>
  <div class='HOMEPAGE'>
    <div class='CANVAS-WRAPPER content-stretch'>
      <div class='CANVAS flex flex-col'>

        <div id='LOGO-MARK-OBSERVER'></div>
        <div class='LOGO-MARK'>
          <inline-svg :src="require('@/assets/logos/ulixee.svg')" />
        </div>

        <div id='LOGO-TEXT-OBSERVER'></div>
        <h1 class='LOGO-TEXT'>
          <inline-svg :src="require('@/assets/logos/ulixee.svg')" />
          <span>Ulixee</span>
        </h1>

        <div class='HEADER-FADE'></div>
        <div class='HEADER grow flex justify-center items-center'>
          <div>
            <h2 class='text-7xl font-black uppercase leading-[1.2em]'>
              A Project to Rehabilitate<br />
              The Internet's Economic Model
            </h2>
            <router-link to='/dispatches/hello-world' class='LETTER font-light relative top-3'>Read Our Launch Announcement »</router-link>
          </div>
          <div class='HEADER-BORDER'></div>
        </div>

        <div id='NAV-OBSERVER' class='absolute bottom-[53px]'></div>
        <div class='NAV sticky top-0 flex flow-row text-center pb-10 font-extralight overflow-hidden'>
          <router-link to='/datanet'>
            <header>Datanet</header>
            <p class='text-gray-500'>Turn any website into a<br />revenue generating data API.</p>
            <button class='bg-ulixee-purple rounded-xl px-10 pb-0.5 mt-5 text-sm text-white'>Go</button>
          </router-link>
          <router-link to='/mainchain'>
            <header>Mainchain</header>
            <p class='text-gray-500'>The world’s most efficient<br />proof-of-work blockchain.</p>
            <button class='bg-ulixee-purple rounded-xl px-10 pb-0.5 mt-5 text-sm text-white'>Go</button>
          </router-link>
          <router-link to='/argon'>
            <header>Argon</header>
            <p class='text-gray-500'>A digital currency that uses<br />sound money principles.</p>
            <button class='bg-ulixee-purple rounded-xl px-10 pb-0.5 mt-5 text-sm text-white'>Go</button>
          </router-link>
          <div class='BOTTOM-FADE'></div>
          <div class='NAV-BORDER'></div>
        </div>

        <div class='SCROLL-ARROW py-10 text-center'>
          <inline-svg @click='scrollToNav' height='30px' class='inline-block cursor-pointer' :src="require('@/assets/homepage-icons/scroll-arrow.svg')" />
        </div>
      </div>
    </div>
    <MainNav :class='{ show: showNav }' />
    <DatanetIndex id='DatanetIndex' class='h-100 z-10' />
    <Footer />
  </div>
</template>

<script lang='ts'>
import * as Vue from "vue";
import { useRouter } from 'vue-router';
import MainNav from '@/layouts/MainNav.vue';
import Footer from '@/layouts/Footer.vue';
import DatanetIndex from '@/pages/datanet/Index.vue';

let lastScroll = 0;
function setScrollVar() {
  const documentElement = document.documentElement
  const navObserverElement = document.querySelector('#NAV-OBSERVER') as HTMLElement;
  const navRect = navObserverElement.getBoundingClientRect();
  const navTopDistance = navRect.top + documentElement.scrollTop;
  const percentOfScreenHeightScrolled = documentElement.scrollTop / navTopDistance;
  const scroll = Math.min(percentOfScreenHeightScrolled * 100, 100);
  documentElement.style.setProperty('--scroll', scroll.toString());

  const currentPos = documentElement.scrollTop;
  if (currentPos !== lastScroll && currentPos !== 0 && currentPos !== navTopDistance) {
    if (documentElement.scrollTop > lastScroll) navScroll('down', navTopDistance);
    else navScroll('up', 0);
    lastScroll = documentElement.scrollTop;
  }

  if (scroll > 25) {
    document.querySelector('.NAV')?.classList.add('After25');
  } else {
    document.querySelector('.NAV')?.classList.remove('After25');
  }
}

let isScrolling = false;
function navScroll(direction: 'up' | 'down', toPos: number) {
  if (isScrolling) return;
  isScrolling = true;
  // window.scrollTo(0, toPos);
  isScrolling = false;

  // setTimeout(() => {
  //   navScroll(direction);
  // }, 16);
}

export default Vue.defineComponent({
  components: {
    DatanetIndex,
    MainNav,
    Footer,
  },
  setup() {
    const $router = useRouter();
    const showNav = Vue.ref(false);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const klass = entry.target.id.replace('-OBSERVER', '');
        if (entry.isIntersecting) {
          document.querySelector(`.${klass}`)?.classList.remove('activated');
          showNav.value = false;
        } else {
          // $router.push(`/datanet`);
          document.querySelector(`.${klass}`)?.classList.add('activated');
          showNav.value = true;
        }
      });
    }, {
      rootMargin: '0px',
      threshold: 0,
    });
    return {
      observer,
      showNav,
    }
  },

  mounted() {
    // setTimeout(() => window.scrollTo(0, 0), 1);
    window.addEventListener('scroll', setScrollVar)
    window.addEventListener('resize', setScrollVar)

    this.observer.observe(document.querySelector('#NAV-OBSERVER') as HTMLElement);

    setScrollVar();
  },
  beforeUnmount() {
    window.removeEventListener('scroll', setScrollVar);
    window.removeEventListener('resize', setScrollVar);

  },
  methods: {
    scrollToNav($event: any, count = 0) {
      if (count > 1) return;
      const documentElement = document.documentElement
      const navObserverElement = document.querySelector('#DatanetIndex') as HTMLElement;
      const navRect = navObserverElement.getBoundingClientRect();
      const navTopDistance = navRect.top + documentElement.scrollTop;
      window.scrollTo(0, navTopDistance - 53);
      setTimeout(() => {
        this.scrollToNav($event, count + 1);
      }, 1);
    },
  },
});
</script>

<style lang='scss'>
.HOMEPAGE {
  --scrollAfter25: clamp(0, ((var(--scroll) - 25) / 75) * 100, 100);
  --scrollAfter50: clamp(0, ((var(--scroll) - 75) / 25) * 100, 100);

  .CANVAS-WRAPPER {
    --scrollValue: max(min(1 - (var(--scroll) / 50), 1), 0);
    --paddingValue: max(min(1 - (var(--scroll) / 5), 1), 0);
    min-height: calc((var(--scrollValue) * 100vh) - 25px);
    @apply flex z-20 relative bg-[#EFF2F8];
    padding: calc(var(--paddingValue) * 1.25rem);
  }

  .CANVAS {
    @apply text-center shadow border border-slate-300 rounded-sm pt-16 px-5 text-ulixee-darker bg-[#FAFBFB] w-full relative;
  }

  a {
    text-decoration: none;
  }

  #LOGO-MARK-OBSERVER {
    height: 5px;
  }
  .LOGO-MARK {
    --scrollValue: max(min(1 - (var(--scroll) / 10), 1), 0);
    z-index: 20;
    position: sticky;
    top: 0;
    height: 53px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    svg {
      transform: translateX(calc(var(--scrollValue) * -50%));
      left: calc(max(var(--scrollValue) * 50%, 0%));
      top: 1px;
      position: relative;
      height: calc(23px + var(--scrollValue) * 22px);
    }
  }

  #LOGO-TEXT-OBSERVER {
    height: 5px;
  }
  .LOGO-TEXT {
    --scrollValue: max(min(1 - (var(--scroll) / 16), 1), 0);
    @apply text-ulixee-purple mt-1 font-bold uppercase;
    z-index: 20;
    letter-spacing: calc(0.13em + var(--scrollValue) * 0.02em);
    font-weight: calc(700 + var(--scrollValue) * 200);
    font-size: calc(1rem + var(--scrollValue) * 0.875rem);
    opacity: calc(0.9 + (1 - var(--scrollValue)) * 0.1);
    position: sticky;
    top: 0;
    height: 53px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    svg {
      height: calc(23px + var(--scrollValue) * 22px);
      margin-left: calc(min(var(--scrollValue) * -50px, 0%));
      margin-right: calc(max((1 - var(--scrollValue)) * 8px, 0%));
      position: relative;
      display: inline;
      opacity: 0;
    }
    span {
      transform: translateX(calc(var(--scrollValue) * -50%));
      left: calc(max(var(--scrollValue) * 50%, 0%));
      position: relative;
      top: 0.5px;
    }
  }

  .HEADER-FADE {
    --scrollValue: max(min(1 - (var(--scroll) / 10), 1), 0);
    --heightValue: max(min(1 - (var(--scroll) / 60), 1), 0);
    position: fixed;
    top: calc(var(--scrollValue) * 80px);
    left: 30px;
    width: calc(100% - 60px);
    height: calc(var(--heightValue) * 200px);
    background: linear-gradient(to bottom, rgba(250, 251, 251, 1), rgba(250, 251, 251, 0));
    z-index: 10;
  }
  .HEADER {
    --opacityValue: min(1 - (var(--scroll) / 75), 1);
    --paddingValue: min((var(--scrollAfter25) / 100), 1);
    --marginValue: max(min((var(--scroll) / 100), 1), 0);
    opacity: calc(var(--opacityValue) * 1);
    position: relative;
    margin-top: calc(3.5rem + (var(--marginValue)) * -200px);
    padding-top: calc(var(--paddingValue) * 3rem);
    padding-bottom: calc(var(--paddingValue) * 3rem);
    z-index: 0;

    .LETTER {
      --opacityValue: min(1 - (var(--scroll) / 20), 1);
      opacity: calc(var(--opacityValue) * 1);
    }

    .HEADER-BORDER {
      position: absolute;
      left: 15rem;
      bottom: 0;
      height: 100%;
      width: calc(100% - 30rem);
      border-top-width: 1px;
      border-bottom-width: 1px;
      border-color: rgba(0, 0, 0, calc(var(--scrollValue) * 0.1));
      z-index: -1;
    }
  }

  .NAV {
    --opacityValue: min(1 - (var(--scroll) / 25), 1);
    --scrollValue: max(min(1 - (var(--scroll) / 100), 1), 0);
    ---heightValue: var(--scrollAfter50) / 100;
    ---marginValue: var(--scrollAfter25) / 100;
    z-index: 20;
    position: sticky;
    top: 0;
    max-height: calc((var(--opacityValue)) * 200px);
    margin-left: calc((var(---marginValue)) * 120px);
    min-height: calc((1 - var(---heightValue)) * 110px);
    margin-top: calc(max(1 - var(---marginValue), 0) * 2.5rem);
    padding-left: calc((1 - var(---marginValue)) * 15%);
    padding-right: calc((1 - var(---marginValue)) * 15%);

    &.After25 {
      a p, a button, .BOTTOM-FADE {
        display: none;
      }
    }
    a {
      ---widthValue: var(--scrollAfter25) / 100;
      min-width: calc((1 - var(---widthValue)) * 33.333333%);
      padding-left: calc(0.6rem + var(--scrollValue) * 3rem);
      padding-right: calc(0.6rem + var(--scrollValue) * 3rem);
    }
    header {
      @apply text-lg;
      font-size: calc(1rem + var(--scrollValue) * 0.25rem);
      font-weight: calc(300 + var(--scrollValue) * 400);
      position: relative;
      z-index: 10;
    }
    p, button {
      opacity: calc(var(--opacityValue) * 1);
    }

    .BOTTOM-FADE {
      --value: min(1 - (var(--scroll) / 25), 1);
      position: absolute;
      height: calc((1 - var(--value)) * 100%);
      width: 100%;
      bottom: 0;
      left: 0;
      background: linear-gradient(to bottom, rgba(250, 251, 251, 0) 0em, rgba(250, 251, 251, 1) 2.5em, rgba(250, 251, 251, 1) 100%);
    }

    .NAV-BORDER {
      position: absolute;
      left: 15rem;
      bottom: 0;
      height: 100%;
      width: calc(100% - 30rem);
      border-bottom-width: 1px;
      border-color: rgba(0, 0, 0, calc(var(--scrollValue) * 0.1));
      z-index: -1;
    }
  }

  .SCROLL-ARROW {
    --value: min(1 - (var(--scroll) / 25), 1);
    padding-top: calc(var(--value) * 2.5rem);
    padding-bottom: calc(var(--value) * 2.5rem);
    svg {
      height: calc(var(--value) * 100%);
      opacity: 0.75;
    }
    svg:hover {
      stroke: #8A3B94 !important;
      opacity: 1;
    }
  }

  .MainNav {
    display: none;
    &.show {
      display: block;
    }
  }

  .DatanetIndex {
    --value: min(1 - (var(--scroll) / 25), 1);
    .AboveTheFold {
      padding-top: calc(var(--value) * 53px) !important;
    }
  }
}
</style>