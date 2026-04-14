<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken } from '../utils/auth';

const route = useRoute();
const router = useRouter();

const menus = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/home-recommend', label: 'Home Recommend' },
  { path: '/admin/scenic', label: 'Scenic' },
  { path: '/admin/article', label: 'Article' },
  { path: '/admin/banner', label: 'Banner' },
  { path: '/admin/ai-copywriting', label: 'AI Copywriting' },
  { path: '/admin/ai-logs', label: 'AI Logs' },
  { path: '/admin/settings', label: 'Settings' }
];

const activePath = computed(() => route.path);

function logout() {
  clearToken();
  router.push('/admin/login');
}
</script>

<template>
  <el-container class="admin-shell">
    <el-aside width="220px" class="admin-shell__aside">
      <div class="admin-shell__brand">
        <div class="admin-shell__brand-title">Admin Panel</div>
      </div>
      <el-menu class="admin-shell__menu" :default-active="activePath" router>
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
      <div class="admin-shell__logout">
        <el-button plain type="danger" class="admin-shell__logout-btn" @click="logout">Logout</el-button>
      </div>
    </el-aside>
    <el-container class="admin-shell__body">
      <el-header class="admin-shell__header">
        <div class="admin-shell__header-title">{{ route.meta.title || 'Admin' }}</div>
      </el-header>
      <el-main class="admin-shell__main">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>
