<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">SCENIC EDIT</span>
        <h1 class="admin-placeholder__title">景点编辑入口</h1>
        <p class="admin-placeholder__desc">
          当前版本将景点编辑集中在统一的景点管理工作台中，保证搜索、修改、AI 辅助和状态切换全部在同一个页面内完成。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前建议</div>
          <p class="admin-placeholder__tips-text">
            毕业设计首版优先保证闭环和可演示性，这种集中式工作台比多页面拆分更稳，也更容易向老师解释内容维护逻辑。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
