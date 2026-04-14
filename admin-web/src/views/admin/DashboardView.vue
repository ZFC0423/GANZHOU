<script setup>
import { onMounted, reactive, ref } from 'vue';
import AdminShell from '../../components/AdminShell.vue';
import { getScenicListApi } from '../../api/scenic';
import { getArticleListApi } from '../../api/article';
import { getBannerListApi } from '../../api/banner';

const loading = ref(false);
const summary = reactive({
  scenicTotal: 0,
  articleTotal: 0,
  bannerTotal: 0
});

async function loadSummary() {
  loading.value = true;

  try {
    const [scenicRes, articleRes, bannerRes] = await Promise.all([
      getScenicListApi({ page: 1, pageSize: 1 }),
      getArticleListApi({ page: 1, pageSize: 1 }),
      getBannerListApi({ page: 1, pageSize: 1 })
    ]);

    summary.scenicTotal = scenicRes.data.total;
    summary.articleTotal = articleRes.data.total;
    summary.bannerTotal = bannerRes.data.total;
  } catch (error) {
    // message handled by request interceptor
  } finally {
    loading.value = false;
  }
}

onMounted(loadSummary);
</script>

<template>
  <AdminShell>
    <div class="admin-page">
      <el-row class="admin-metrics" :gutter="16" v-loading="loading">
        <el-col :span="8">
          <el-card>
            <div class="admin-metric-card__label">Scenic Total</div>
            <div class="admin-metric-card__value">{{ summary.scenicTotal }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <div class="admin-metric-card__label">Article Total</div>
            <div class="admin-metric-card__value">{{ summary.articleTotal }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <div class="admin-metric-card__label">Banner Total</div>
            <div class="admin-metric-card__value">{{ summary.bannerTotal }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </AdminShell>
</template>
