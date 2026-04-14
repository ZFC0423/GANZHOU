<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">AI CHAT LOGS</span>
        <h1 class="admin-placeholder__title">AI 问答日志</h1>
        <p class="admin-placeholder__desc">
          这里预留给问答日志的独立分页页，后续可以补关键词筛选、时间范围筛选、日志表格和详情弹窗。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            如果后续不打算单独维护分页页，也可以继续以总日志页为主，这个页面保留为后续扩展入口。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
