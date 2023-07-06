<template>
  <div class="CHROME-ALIVE-PREVIEW BROWSER-WRAPPER">
    <div class="absolute top-0 left-0 bg-[#f8f9fa] z-20">
      Unique fingerprints are<br> generated for every session
    </div>

    <div class="absolute top-10 right-0 text-right bg-[#f8f9fa] z-20">
      Flow Handlers provide reactive<br> control over website change
    </div>

    <div class="BROWSER">
      <div class="TITLEBAR">
        <div class="DOT bg-red-500"></div>
        <div class="DOT bg-yellow-500"></div>
        <div class="DOT bg-green-500"></div>
        <span class="TAB ml-3">
          <inline-svg :src="require('@/assets/illustrations/corner.svg')" class="inline-block" />
          Website Title
          <inline-svg :src="require('@/assets/illustrations/corner.svg')" class="inline-block" />
        </span>
      </div>
      <div class="CHROMEBAR bg-white h-10 border-b border-gray-300">

      </div>
      <div class="CONTENT flex flex-row h-60">
        
      </div>

      <div class="DEVTOOLS border-t border-gray-300 min-h-full">

      </div>
    </div>

    <div class="absolute bottom-0 left-0 bg-white z-20">
      Access the DOM as if you're<br> coding directly in the browser
    </div>
  </div>
</template>

<style lang="scss">
.CHROME-ALIVE-PREVIEW {
  @apply relative pt-40 pb-16;

  .TAB {
    background: white;
    border: 1px solid rgb(204, 204, 204);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    padding: 5px 15px;
    position: relative;
    top: 4.5px;
    svg {
      width: 9px;
      height: 9px;
      bottom: -1.5px;
      position: absolute;
      path {
        stroke: rgb(204, 204, 204) !important;
        stroke-width: 1;
      }
    }
    svg:first-child {
      left: -7px;
      transform: scaleX(-1);
    }
    svg:last-child {
      right: -3px;
    }
  }

  .CALLOUT {
    background: white;
    border: 1px solid rgba(0,0,0,0.2);
    box-shadow: 1px 1px 5px rgba(0,0,0,0.1);
    border-radius: 50%;
    color: #A716B9;
    font-weight: bold;
    font-size: 20px;
    display: inline-block;
    width: 35px;
    height: 35px;
    text-align: center;
    line-height: 33px;
    position: absolute;
    top: 50%;
    margin-top: -18px;
    &.LEFT {
      right: -25px;
    }
    &.RIGHT {
      left: -25px;
    }
  }

  .CALLOUT-LINE {
    width: 100%;
    position: absolute;
    &.LEFT {
      right: -10px;
      bottom: calc(100% + 9px);
      &:before {
        right: 0;
      }
    }
    &.RIGHT {
      left: -10px;
      bottom: calc(100% + 9px);
      &:before {
        left: 0;
      }
    }

    &.BOTTOM {
      right: -20px;
      top: calc(100% + 9px);
      &:before {
        right: 0;
      }
      &:after {
        top: auto;
        bottom: 0;
      }
    }

    &:before { // vertical
      content: '';
      width: 1px;
      background: rgba(0,0,0,0.3);
      position: absolute;
      top: 0;
      height: 100%;
    }
    &:after { // horizontal
      content: '';
      height: 1px;
      background: rgba(0,0,0,0.3);
      position: absolute;
      top: 0;
      right: 0;
      width: 100%;
    }
  }

  .BROWSER {
    margin: 0 10%;
    border: 1px solid rgba(0,0,0,0.4);
    border-radius: 7px;
    background: white;
    width: 80%;
    min-height: 500px;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);

    .TITLEBAR {
      background: #F2F4F5;
      border-radius: 6px 6px 0 0;
      box-shadow: inset 1px 1px 0 white;
      border-bottom: 1px solid rgb(204, 204, 204);
      padding: 5px;
      margin-bottom: 1px;
    }

    .DOT {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-left: 5px;
    }
  }
}
</style>