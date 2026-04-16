<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">SCENIC CREATE</span>
        <h1 class="admin-placeholder__title">新建景点入口</h1>
        <p class="admin-placeholder__desc">
          当前版本已经把景点新增、叙事字段维护和 AI 文案辅助统一到了“景点管理”工作台中，因此独立新建页暂时不再承担主流程。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前建议</div>
          <p class="admin-placeholder__tips-text">
            先保持“列表 + 弹窗编辑”这条链路清晰可用，等后续真的需要更长的创建流程，再把公共表单抽成独立页面。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
