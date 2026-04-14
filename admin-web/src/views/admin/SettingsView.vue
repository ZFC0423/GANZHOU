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
          这里预留给站点信息、AI 模型参数和基础系统配置，后续可以继续拆成表单区、保存按钮和配置说明区。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            在真正补功能前，先把站点信息、AI 配置、管理员基础资料三类字段整理清楚，再决定页面表单结构。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
