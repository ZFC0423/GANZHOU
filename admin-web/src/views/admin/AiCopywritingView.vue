<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">AI COPYWRITING</span>
        <h1 class="admin-placeholder__title">AI 文案生成</h1>
        <p class="admin-placeholder__desc">
          这里预留给后台运营侧的 AI 文案生成页，后续可以继续补目标类型、目标对象、补充说明和生成结果编辑区。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            建议后续优先复用景点和文章已有字段，不要一开始就把输入表单做得过重，先保证生成闭环。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
