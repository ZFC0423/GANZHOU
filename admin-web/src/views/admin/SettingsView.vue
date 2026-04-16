<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">SETTINGS</span>
        <h1 class="admin-placeholder__title">系统设置</h1>
        <p class="admin-placeholder__desc">
          这里预留给站点信息、AI 模型参数和基础系统配置。后续可以按“站点设置 / AI 配置 / 管理员资料”三个分组来逐步落地。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            在真正补功能之前，先把需要长期维护的配置字段整理清楚，再决定表单结构。这样既便于答辩，也能减少后续字段反复变动。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
