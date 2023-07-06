<template>
  <ul class='flex flex-row space-x-2'>
    <li v-for="i of 10" :key="i" class='w-[10%]'>
      <div class='h-20 border border-gray-700 border-2'></div>
    </li>
  </ul>
</template>