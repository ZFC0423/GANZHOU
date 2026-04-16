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
          这里预留给行程推荐日志的独立分页页。后续如果你想单独做“按天数、出发地、节奏”筛选的专门工作台，可以从这里继续扩展。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前阶段建议</div>
          <p class="admin-placeholder__tips-text">
            在毕业设计首版里，优先把总日志页做扎实更重要。等你把筛选维度完全稳定下来，再单独拆分日志页会更省返工成本。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
