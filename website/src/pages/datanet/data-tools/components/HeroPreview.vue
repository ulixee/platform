<template>
  <div class="BROWSER-WRAPPER">
    <div class="absolute top-0 left-0 bg-[#f8f9fa] z-20 leading-tight text-gray-600">
      Unique fingerprints are<br> generated for every session
    </div>

    <div class="absolute top-10 right-0 text-right bg-[#f8f9fa] z-20 leading-tight text-gray-600">
      Flow Handlers provide reactive<br> control over website change
    </div>

    <div class="BROWSER">
      <div class="TITLEBAR">
        <div class="DOT bg-red-500"></div>
        <div class="DOT bg-yellow-500"></div>
        <div class="DOT bg-green-500"></div>
        <span class="ml-2">NodeJs</span>
      </div>
      <div class="flex flex-row">
        <div class="lines px-2 mr-3 border-r border-slate-300 text-right text-slate-400 font-mono text-sm font-light">
          4<br>
          5<br>
          6<br>
          7<br>
          8<br>
          9<br>
          10<br>
          11<br>
          12<br>
          13<br>
          14<br>
          15<br>
        </div>
        <div class="code flex-1 font-mono text-sm font-light">
          <br>
          <div class="relative inline-block">
            const hero = new Hero();
            <div class="CALLOUT LEFT">1</div>
            <div class="CALLOUT-LINE LEFT" style="height: 185px"></div>
          </div><br>
          <br>
          <div class="flex flex-row">
            <div>await hero.registerFlowHandler(recaptcha);</div>
            <div class="flex-1 relative">
              <div class="CALLOUT RIGHT">2</div>
              <div class="CALLOUT-LINE RIGHT" style="height: 185px"></div>
            </div>
          </div>
          <br>
          <div>await hero.goto('https://ulixee.org/');</div>
          <br>
          <div>
            const formElem = document.querySelector('form#register');
          </div>
          <div class="relative inline-block">
            await formElem.querySelector('button.register').click();
            <div class="CALLOUT">3</div>
            <div class="CALLOUT-LINE BOTTOM z-20" style="height: 110px"></div>
          </div><br>
        </div>
      </div>
      
    </div>

    <div class="absolute bottom-0 left-0 bg-white z-20">
      Access the DOM as if you're<br> coding directly in the browser
    </div>
  </div>
</template>

<style lang="scss" scoped>

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
    &:after {
      right: -2px;
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
    width: 5px;
    background: rgba(0,0,0,0.3);
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 2px solid white;
    border-right: 2px solid white;
  }
  &:after { // horizontal
    content: '';
    height: 1px;
    background: rgba(0,0,0,0.3);
    position: absolute;
    top: 0;
    right: 2px;
    width: 100%;
  }
}
.BROWSER-WRAPPER {
  @apply relative pt-40 pb-16;
}

.BROWSER {
  margin: 0 10%;
  border: 1px solid rgba(0,0,0,0.4);
  border-radius: 7px;
  background: white;
  width: 80%;
  min-height: 300px;
  box-shadow: 0 0 10px rgba(0,0,0,0.2);

  &:after {
    content: '';
    width: calc(100% - 10px);
    height: 30%;
    background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, white 90%);
    position: absolute;
    bottom: 54px;
    left: calc(5% - 10px);
  }

  .TITLEBAR {
    background: #F2F4F5;
    border-radius: 6px 6px 0 0;
    box-shadow: inset 1px 1px 0 white;
    border-bottom: 1px solid rgba(0,0,0,0.1);
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
</style>