<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">AI TRIP LOGS</span>
        <h1 class="admin-placeholder__title">AI 行程推荐日志</h1>
        <p class="admin-placeholder__desc">
          这里预留给行程推荐日志的独立分页页，后续可以补出发地、天数、节奏等筛选条件和结果详情展示。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            等你确定日志查询维度后，再补筛选表单，避免前期反复改字段和页面结构。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
