<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">ARTICLE CREATE</span>
        <h1 class="admin-placeholder__title">新建文章入口</h1>
        <p class="admin-placeholder__desc">
          当前后台已经把“文章管理”作为统一工作台，因此不再建议维护一套独立的新建页。后续如果你需要单页式创建流程，可以从文章管理页抽出公共表单再扩展。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前建议</div>
          <p class="admin-placeholder__tips-text">
            直接进入“专题文章管理”完成新增、编辑和状态维护，会更适合毕业设计首版的可讲解性和维护效率。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
