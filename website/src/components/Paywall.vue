<template>
  <div class='Paywall Component z-20 -top-[130px] pb-20'>
    <div class='relative bg-white border rounded shadow-2xl px-16 py-12 mx-auto w-6/12 top-[100px]'>
      <p class='mb-5'>
        Ulixee's full platform is launching in the 2nd quarter of 2024. In the meantime, you might be interested in exploring the
        <router-link to='/datanet'>Ulixee Datanet</router-link>. It's the core foundation of the Ulixee ecosystem -- a set of tools for sharing, consuming and monetizing data streams.
      </p>
      <p class='mb-5'>
        Or check out some of our whitepapers on the future of stablecoins:
      </p>
      <ul class='WHITEPAPERS'>
        <li class='border-b border-t'>
          <a class='flex flex-row py-5' href='https://ulixee.org/whitepapers/on-the-stabilization-of-stablecoins.pdf'>
            <inline-svg class='mr-4' width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
            <div>
              <header class='font-bold'>On The Stabilization of Stablecoins</header>
              <i>Published January 15, 2024</i>
            </div>
          </a>
        </li>
        <li class='border-b'>
          <div class='flex flex-row py-5 opacity-50'>
            <inline-svg class='mr-4' width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
            <div>
              <header class='font-bold'>Creating a Stabler Stablecoin</header>
              <i>Coming late spring 2024</i>
            </div>
          </div>
        </li>
        <li class='border-b'>
          <div class='flex flex-row py-5 opacity-50'>
            <inline-svg class='mr-4' width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
            <div>
              <header class='font-bold'>Bitcoin Fission Fusion</header>
              <i>Coming early summer 2024</i>
            </div>
          </div>
        </li>
        <li class='border-b'>
          <div class='flex flex-row py-5 opacity-50'>
            <inline-svg class='mr-4' width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
            <div>
              <header class='font-bold'>Proof of Tax</header>
              <i>Coming early summer 2024</i>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss">
  .Paywall {
    background: linear-gradient(to bottom, rgba(239, 242, 248, 0) 0px, rgba(239, 242, 248, 1) 100px);
    min-height: 500px;
    width: 100%;
    text-align: left;

    a {
      text-decoration: none;
    }

    ul.WHITEPAPERS {
      li > div, a {
        @apply pl-5;
      }
      a {
        &:hover {
          background: #f5f5f5;
        }
      }
    }
  }
</style>
<script setup lang='ts'>
</script>