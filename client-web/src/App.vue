<script setup>
import { RouterView } from 'vue-router';
import SiteLayout from './components/SiteLayout.vue';
</script>

<template>
  <div class="app-root">
    <SiteLayout>
      <div class="app-router-stage">
        <RouterView v-slot="{ Component, route }">
          <Transition name="route-stage" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </SiteLayout>
  </div>
</template>

<style>
.app-root {
  min-height: 100vh;
}

.app-router-stage {
  position: relative;
  isolation: isolate;
  min-width: 0;
}
</style>
