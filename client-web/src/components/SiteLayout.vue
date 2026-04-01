<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const activeMenu = computed(() => {
  if (route.path.startsWith('/scenic')) return '/scenic';
  if (route.path.startsWith('/food')) return '/food';
  if (route.path.startsWith('/heritage')) return '/heritage';
  if (route.path.startsWith('/red-culture')) return '/red-culture';
  if (route.path.startsWith('/about')) return '/about';
  return route.path;
});
</script>

<template>
  <div>
    <header class="site-header">
      <div class="site-header__inner">
        <router-link class="site-logo" to="/">赣州游智慧服务</router-link>
        <el-menu :default-active="activeMenu" mode="horizontal" router class="site-menu">
          <el-menu-item index="/">首页探索</el-menu-item>
          <el-menu-item index="/scenic">景点导览</el-menu-item>
          <el-menu-item index="/food">地道美食</el-menu-item>
          <el-menu-item index="/heritage">非遗传承</el-menu-item>
          <el-menu-item index="/red-culture">红色记忆</el-menu-item>
          <el-menu-item index="/about">平台介绍</el-menu-item>
        </el-menu>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="site-footer">
      <div class="page-shell site-footer__inner">
        <div>
          <div class="site-footer__title">赣州旅游文化智慧服务平台</div>
          <p class="site-footer__desc">
            融合山水胜境、客家风情与红色记忆，为您提供沉浸式的智能文旅探索体验。
          </p>
        </div>
        <div class="site-footer__links">
          <router-link to="/scenic">探索全景</router-link>
          <router-link to="/food">寻味客家</router-link>
          <router-link to="/heritage">守护非遗</router-link>
          <router-link to="/red-culture">传承薪火</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gz-border-light);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  transition: var(--gz-transition-base);
}

.site-header__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 64px;
}

.site-logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--gz-brand-primary);
  white-space: nowrap;
  letter-spacing: 1px;
}

.site-menu {
  border-bottom: none;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
  background: transparent;
}

:deep(.el-menu--horizontal > .el-menu-item) {
  font-size: 15px;
  font-weight: 500;
  color: var(--gz-text-regular);
  transition: var(--gz-transition-base);
}

:deep(.el-menu--horizontal > .el-menu-item.is-active) {
  color: var(--gz-brand-primary) !important;
  border-bottom: 2px solid var(--gz-brand-primary) !important;
  font-weight: 600;
}

.site-footer {
  margin-top: 60px;
  background: var(--gz-brand-secondary);
  color: #e5e7eb;
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  align-items: flex-start;
  padding-top: 56px;
  padding-bottom: 64px;
}

.site-footer__title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.site-footer__desc {
  margin: 0;
  color: #94a3b8;
  line-height: 1.8;
  max-width: 480px;
  font-size: 15px;
}

.site-footer__links {
  display: grid;
  gap: 12px;
  min-width: 160px;
}

.site-footer__links a {
  color: #cbd5e1;
  font-size: 15px;
  position: relative;
  display: inline-block;
  width: fit-content;
}

.site-footer__links a:hover {
  color: #ffffff;
}

.site-footer__links a::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: #ffffff;
  transition: width 0.3s ease;
}

.site-footer__links a:hover::after {
  width: 100%;
}

@media (max-width: 900px) {
  .site-header__inner {
    flex-direction: column;
    align-items: stretch;
    padding-top: 12px;
    height: auto;
  }

  .site-menu {
    justify-content: flex-start;
  }

  .site-footer__inner {
    flex-direction: column;
  }
}
</style>
