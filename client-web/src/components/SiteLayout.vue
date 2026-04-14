<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const activeMenu = computed(() => {
  if (route.path.startsWith('/scenic')) return '/scenic';
  if (route.path.startsWith('/food')) return '/food';
  if (route.path.startsWith('/heritage')) return '/heritage';
  if (route.path.startsWith('/red-culture')) return '/red-culture';
  if (route.path.startsWith('/ai-chat')) return '/ai-chat';
  if (route.path.startsWith('/ai-trip')) return '/ai-trip';
  if (route.path.startsWith('/about')) return '/about';
  return route.path;
});
</script>

<template>
  <div>
    <header class="site-header">
      <div class="site-header__inner">
        <router-link class="site-logo" to="/">赣州文旅智慧服务平台</router-link>
        <el-menu :default-active="activeMenu" mode="horizontal" router class="site-menu">
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/scenic">景点浏览</el-menu-item>
          <el-sub-menu index="topic">
            <template #title>专题探索</template>
            <el-menu-item index="/red-culture">红色文化</el-menu-item>
            <el-menu-item index="/heritage">非遗传承</el-menu-item>
            <el-menu-item index="/food">城市风味</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/ai-chat">智慧问答</el-menu-item>
          <el-menu-item index="/ai-trip">行程建议</el-menu-item>
          <el-menu-item index="/about">平台介绍</el-menu-item>
        </el-menu>
      </div>
      <div class="mobile-nav-helper">
        探索赣州的文化线索、代表性景点与智慧导览服务。
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="site-footer">
      <div class="footer-main">
        <div class="footer-main__inner">
          <div class="footer-brand">
            <div class="footer-brand__name">赣州旅游文化智慧服务平台</div>
            <p class="footer-brand__desc">
              以主题化内容组织、景点导览与智慧服务能力，连接城市文化记忆与旅行探索体验。
            </p>
          </div>

          <div class="footer-nav">
            <div class="footer-nav__title">快速入口</div>
            <router-link to="/scenic">浏览精选景点</router-link>
            <router-link to="/red-culture">探索专题内容</router-link>
            <router-link to="/ai-chat">开启智慧问答</router-link>
            <router-link to="/ai-trip">获取行程建议</router-link>
            <router-link to="/about">进入平台介绍</router-link>
          </div>

          <div class="footer-nav">
            <div class="footer-nav__title">文化主题</div>
            <router-link to="/red-culture">红色文化</router-link>
            <router-link to="/heritage">非遗传承</router-link>
            <router-link to="/heritage">客家文化</router-link>
            <router-link to="/food">城市风味</router-link>
            <router-link to="/food">老城记忆</router-link>
            <router-link to="/scenic">山水探索</router-link>
          </div>

          <div class="footer-nav">
            <div class="footer-nav__title">探索指引</div>
            <p class="footer-brand__desc footer-brand__desc--compact">
              从内容理解出发，在浏览、问答与路径建议之间，逐步进入赣州。
            </p>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom__inner">
          <div class="footer-bottom__row">赣州旅游文化智慧服务平台 · 毕业设计项目展示</div>
          <div class="footer-bottom__row copyright-note">内容展示以平台现有资料为基础，部分原始条目暂保留既有命名方式。</div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(236, 231, 223, 0.92);
  box-shadow: 0 6px 20px rgba(34, 34, 34, 0.04);
  transition: var(--transition-base);
}

.site-header__inner {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 12px var(--page-gutter-current);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 76px;
}

.site-logo {
  position: relative;
  padding-left: 18px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  letter-spacing: var(--tracking-tight-1);
}

.site-logo::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 6px rgba(255, 56, 92, 0.12);
  transform: translateY(-50%);
}

.site-menu {
  border-bottom: none;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
  background: transparent;
}

:deep(.site-menu.el-menu--horizontal) {
  gap: 8px;
  border-bottom: none;
}

:deep(.el-menu--horizontal > .el-menu-item),
:deep(.el-menu--horizontal > .el-sub-menu > .el-sub-menu__title) {
  height: 44px;
  padding: 0 14px;
  border-bottom: none !important;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  line-height: 44px;
  color: var(--color-text-secondary);
  transition: var(--transition-base);
}

:deep(.el-menu--horizontal > .el-menu-item:hover),
:deep(.el-menu--horizontal > .el-sub-menu > .el-sub-menu__title:hover) {
  background: rgba(255, 56, 92, 0.06);
  color: var(--color-text-primary);
}

:deep(.el-menu--horizontal > .el-menu-item.is-active),
:deep(.el-menu--horizontal > .el-sub-menu.is-active > .el-sub-menu__title) {
  color: var(--color-accent) !important;
  background: rgba(255, 56, 92, 0.08);
  border-bottom: none !important;
  font-weight: 600;
}

/* ================================================
   全站收束层 Footer
   ================================================ */
.site-footer {
  margin-top: 80px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), #f7f4ef);
  border-top: 1px solid rgba(236, 231, 223, 0.92);
  color: var(--color-text-secondary);
}

/* 第一层：主体内容 */
.footer-main {
  border-bottom: 1px solid rgba(221, 216, 209, 0.8);
}

.footer-main__inner {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: clamp(48px, 7vw, 64px) var(--page-gutter-current) clamp(36px, 6vw, 56px);
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 0.9fr;
  gap: 32px 40px;
}

/* 平台身份 */
.footer-brand__name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tight-1);
  margin-bottom: 14px;
}

.footer-brand__desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: var(--line-loose);
  max-width: 360px;
}

.footer-brand__desc--compact {
  margin-top: 4px;
}

/* 导航列 */
.footer-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-nav__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: var(--tracking-wide);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.footer-nav a {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: inline-block;
  width: fit-content;
  position: relative;
  transition: color var(--transition-base);
}

.footer-nav a:hover {
  color: var(--color-text-primary);
}

.footer-nav a::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--color-accent);
  transition: width var(--transition-base);
}

.footer-nav a:hover::after {
  width: 100%;
}

.footer-bottom__inner {
  max-width: var(--container-page);
  margin: 0 auto;
  padding: 22px var(--page-gutter-current) 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  text-align: center;
}

.copyright-note {
  font-size: 12px;
}

.mobile-nav-helper {
  display: none;
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: rgba(255, 255, 255, 0.76);
  padding: 10px var(--page-gutter-current);
  text-align: center;
  border-top: 1px solid rgba(236, 231, 223, 0.72);
}

/* ================================================
   响应式
   ================================================ */
@media (max-width: 900px) {
  .site-header__inner {
    flex-direction: column;
    align-items: stretch;
    padding-bottom: 12px;
    min-height: auto;
  }

  .site-menu {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    padding-bottom: 4px;
  }

  .mobile-nav-helper {
    display: block;
  }

  .site-menu::-webkit-scrollbar {
    display: none;
  }

  :deep(.site-menu.el-menu--horizontal > .el-menu-item) {
    flex-shrink: 0;
  }

  :deep(.site-menu.el-menu--horizontal > .el-sub-menu) {
    flex-shrink: 0;
  }

  .footer-main__inner {
    grid-template-columns: 1fr 1fr;
    gap: 32px 24px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .footer-main__inner {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .footer-brand__desc {
    max-width: 100%;
  }

  .footer-bottom__inner {
    align-items: flex-start;
    text-align: left;
    gap: 8px;
  }
}
</style>
