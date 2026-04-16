<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken } from '../utils/auth';

const route = useRoute();
const router = useRouter();

const menuGroups = [
  {
    title: '总览',
    items: [
      { path: '/admin/dashboard', label: '工作台' }
    ]
  },
  {
    title: '前台内容',
    items: [
      { path: '/admin/home-recommend', label: '首页与章节' },
      { path: '/admin/scenic', label: '景点管理' },
      { path: '/admin/article', label: '专题文章' },
      { path: '/admin/banner', label: '横幅素材' }
    ]
  },
  {
    title: 'AI 能力',
    items: [
      { path: '/admin/ai-copywriting', label: 'AI 文案生成' },
      { path: '/admin/ai-logs', label: 'AI 日志中心' }
    ]
  },
  {
    title: '系统',
    items: [
      { path: '/admin/settings', label: '系统设置' }
    ]
  }
];

const activePath = computed(() => route.path);
const pageTitle = computed(() => route.meta.title || '后台管理');
const pageSubtitle = computed(() => route.meta.subtitle || '保持内容、AI 与前台体验的一致性。');

function logout() {
  clearToken();
  router.push('/admin/login');
}

function isGroupActive(items) {
  return items.some((item) => route.path.startsWith(item.path));
}
</script>

<template>
  <el-container class="admin-shell">
    <el-aside width="268px" class="admin-shell__aside">
      <div class="admin-shell__brand">
        <span class="admin-shell__brand-kicker">Ganzhou Scroll Admin</span>
        <div class="admin-shell__brand-title">赣州长卷后台</div>
        <p class="admin-shell__brand-desc">内容、章节、AI 与前台体验在这里统一维护。</p>
      </div>

      <div class="admin-shell__menu-groups">
        <section
          v-for="group in menuGroups"
          :key="group.title"
          :class="['admin-shell__group', { 'admin-shell__group--active': isGroupActive(group.items) }]"
        >
          <div class="admin-shell__group-title">{{ group.title }}</div>
          <el-menu class="admin-shell__menu" :default-active="activePath" router>
            <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
              {{ item.label }}
            </el-menu-item>
          </el-menu>
        </section>
      </div>

      <div class="admin-shell__aside-footer">
        <div class="admin-shell__aside-note">建议先维护首页章节，再补景点与专题细节。</div>
        <el-button plain type="danger" class="admin-shell__logout-btn" @click="logout">退出登录</el-button>
      </div>
    </el-aside>

    <el-container class="admin-shell__body">
      <el-header class="admin-shell__header">
        <div class="admin-shell__header-main">
          <div class="admin-shell__header-kicker">运营工作区</div>
          <div class="admin-shell__header-title">{{ pageTitle }}</div>
          <p class="admin-shell__header-subtitle">{{ pageSubtitle }}</p>
        </div>
        <div class="admin-shell__header-side">
          <div class="admin-shell__header-chip">本地演示模式</div>
        </div>
      </el-header>

      <el-main class="admin-shell__main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>
