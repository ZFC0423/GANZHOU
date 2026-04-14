<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">HOME RECOMMEND</span>
        <h1 class="admin-placeholder__title">首页推荐配置</h1>
        <p class="admin-placeholder__desc">
          这里预留给首页推荐模块的后台配置页，后续可以继续补充推荐位类型、内容来源、排序规则和启用状态。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            先保持这个页面作为统一占位入口，等首页推荐的数据结构冻结后，再补表格、筛选区和编辑弹窗。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
