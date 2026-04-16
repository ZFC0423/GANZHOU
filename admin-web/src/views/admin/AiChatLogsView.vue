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
          这里预留给问答日志的独立分页页。后续如果需要按关键词、时间范围或命中内容做专项排查，可以在这里继续拆细。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            现阶段以“AI 日志查看”总页为主更高效，这一页更适合作为后续扩展入口，不必急着重复造一套日志表格。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
