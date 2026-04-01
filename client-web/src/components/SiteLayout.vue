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

    <!-- ======================================== -->
    <!-- 全站收束层 Footer -->
    <!-- ======================================== -->
    <footer class="site-footer">
      <!-- 第一层：主体内容区 -->
      <div class="footer-main">
        <div class="footer-main__inner">
          <!-- 平台身份 -->
          <div class="footer-brand">
            <div class="footer-brand__name">赣州游智慧服务</div>
            <p class="footer-brand__desc">
              融合千年宋城底蕴与客家山水风情，以 AI 智慧导览为核心，打造赣州文旅一站式探索平台。
            </p>
          </div>

          <!-- 快速入口：文旅探索 -->
          <div class="footer-nav">
            <div class="footer-nav__title">文旅探索</div>
            <router-link to="/scenic">景点探索</router-link>
            <router-link to="/food">美食专题</router-link>
            <router-link to="/heritage">非遗专题</router-link>
            <router-link to="/red-culture">红色文化</router-link>
          </div>

          <!-- 快速入口：智慧服务 -->
          <div class="footer-nav">
            <div class="footer-nav__title">智慧服务</div>
            <router-link to="/ai-chat">智能问答</router-link>
            <router-link to="/ai-trip">行程推荐</router-link>
            <router-link to="/about">平台介绍</router-link>
          </div>

          <!-- 快速入口：关于平台 -->
          <div class="footer-nav">
            <div class="footer-nav__title">了解更多</div>
            <router-link to="/about">设计理念</router-link>
            <router-link to="/">返回首页</router-link>
          </div>
        </div>
      </div>

      <!-- 第二层：文化关键词带 -->
      <div class="footer-keywords">
        <div class="footer-keywords__inner">
          <span>千年宋城</span>
          <span class="footer-keywords__dot">·</span>
          <span>客家摇篮</span>
          <span class="footer-keywords__dot">·</span>
          <span>红色故都</span>
          <span class="footer-keywords__dot">·</span>
          <span>非遗匠心</span>
          <span class="footer-keywords__dot">·</span>
          <span>智慧服务</span>
        </div>
      </div>

      <!-- 第三层：版权底栏 -->
      <div class="footer-bottom">
        <div class="footer-bottom__inner">
          <span>© 2025 赣州旅游文化智慧服务平台</span>
          <span class="footer-bottom__sep">|</span>
          <span>毕业设计作品</span>
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

/* ================================================
   全站收束层 Footer
   ================================================ */
.site-footer {
  margin-top: 80px;
  background: #0c1222;
  color: #cbd5e1;
}

/* 第一层：主体内容 */
.footer-main {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.footer-main__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 64px 20px 56px;
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 0.8fr;
  gap: 48px;
}

/* 平台身份 */
.footer-brand__name {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.footer-brand__desc {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.85;
  max-width: 320px;
}

/* 导航列 */
.footer-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-nav__title {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.footer-nav a {
  font-size: 14px;
  color: #94a3b8;
  display: inline-block;
  width: fit-content;
  position: relative;
  transition: color 0.25s ease;
}

.footer-nav a:hover {
  color: #ffffff;
}

.footer-nav a::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.6);
  transition: width 0.3s ease;
}

.footer-nav a:hover::after {
  width: 100%;
}

/* 第二层：文化关键词带 */
.footer-keywords {
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.footer-keywords__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  letter-spacing: 2px;
}

.footer-keywords__dot {
  color: #475569;
  margin: 0 4px;
}

/* 第三层：版权底栏 */
.footer-bottom__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.footer-bottom__sep {
  color: #334155;
}

/* ================================================
   响应式
   ================================================ */
@media (max-width: 900px) {
  .site-header__inner {
    flex-direction: column;
    align-items: stretch;
    padding-top: 12px;
    height: auto;
  }

  .site-menu {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    padding-bottom: 4px;
  }

  .site-menu::-webkit-scrollbar {
    display: none;
  }

  :deep(.site-menu.el-menu--horizontal > .el-menu-item) {
    flex-shrink: 0;
    padding: 0 14px;
  }

  .footer-main__inner {
    grid-template-columns: 1fr 1fr;
    gap: 40px 32px;
    padding: 48px 20px 40px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .footer-main__inner {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 20px 32px;
  }

  .footer-brand {
    grid-column: auto;
  }

  .footer-brand__desc {
    max-width: 100%;
  }

  .footer-keywords__inner {
    gap: 4px;
    font-size: 12px;
    letter-spacing: 1px;
  }

  .footer-bottom__inner {
    flex-direction: column;
    gap: 4px;
  }

  .footer-bottom__sep {
    display: none;
  }
}
</style>
