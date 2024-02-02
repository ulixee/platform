<template>
  <div
    class="select-overview"
    :class="{ active: activeItem === 'selectOverview' }"
    @mousedown="handleMouseDown($event, 'selectOverview')"
  >
    <div class="text">3.4s SELECTED</div>
  </div>
</template>

<style lang="scss" scoped="scoped">
.select-overview {
  position: absolute;
  display: none;
  bottom: calc(100% - 7px);
  left: calc(50% - 100px);
  width: 200px;
  text-align: center;
  pointer-events: none;
  &.active .text {
    background: white;
    border: 1px dashed black;
    color: black;
  }
  .text {
    pointer-events: auto;
    position: relative;
    display: inline-block;
    padding: 2px 10px;
    border-radius: 5px;
    white-space: nowrap;
    text-align: center;
    background: #b38ec2;
    border: 1px solid black;
    color: white;
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
  }
}
</style>
