<script setup>
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="app-root" :data-shell="route.meta?.shell || 'default'">
    <RouterView />
  </div>
</template>

<style>
.app-root {
  min-height: 100vh;
}
</style>
