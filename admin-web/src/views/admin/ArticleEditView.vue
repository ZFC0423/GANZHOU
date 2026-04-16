<script setup>
import AdminShell from '../../components/AdminShell.vue';
</script>

<template>
  <AdminShell>
    <div class="admin-placeholder">
      <el-card class="admin-placeholder__card">
        <span class="admin-placeholder__eyebrow">ARTICLE EDIT</span>
        <h1 class="admin-placeholder__title">文章编辑入口</h1>
        <p class="admin-placeholder__desc">
          当前版本已经把文章编辑收回到统一的文章管理弹窗中，这样可以保证搜索、修改、保存和状态切换都在同一个工作面里完成。
        </p>
        <div class="admin-placeholder__tips">
          <div class="admin-placeholder__tips-title">当前建议</div>
          <p class="admin-placeholder__tips-text">
            如果后续文章结构升级成分块编辑，再考虑把这里扩展成独立编辑页；在此之前，统一工作台会更稳也更容易演示。
          </p>
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
