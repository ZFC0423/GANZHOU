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
          这里预留给后台运营侧的 AI 文案生成工作台，后续可以接入目标类型、目标对象、补充说明和生成结果编辑区。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            优先复用景点和文章已经存在的字段，不要一开始就把表单做得很重。先保证文案生成、人工编辑、保存入库这条链路讲得清楚。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
