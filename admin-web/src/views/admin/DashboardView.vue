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

const quickLinks = [
  {
    title: '首页与章节配置',
    desc: '先维护首页主视觉、章节标题和推荐位，这里决定整站第一印象。',
    path: '/admin/home-recommend'
  },
  {
    title: '景点管理',
    desc: '补充首图题注、路线标签和景点叙事字段，让前台详情页真正有内容层次。',
    path: '/admin/scenic'
  },
  {
    title: '专题文章',
    desc: '统一摘要、引语和专题内容状态，保证专题页与 AI 引用内容一致。',
    path: '/admin/article'
  }
];

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
    // 请求提示由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

onMounted(loadSummary);
</script>

<template>
  <AdminShell>
    <div class="admin-page">
      <section class="admin-overview" v-loading="loading">
        <div class="admin-overview__hero">
          <span class="admin-overview__eyebrow">Content Ops</span>
          <h2>先保证内容结构清晰，再推进前台体验稳定落地。</h2>
          <p>
            这个后台不只是录入数据，而是负责把首页章节、景点叙事、专题内容和 AI 能力组织成统一的前台体验。
          </p>
        </div>

        <div class="admin-overview__metrics">
          <el-card shadow="never" class="admin-metric-card">
            <div class="admin-metric-card__label">景点总数</div>
            <div class="admin-metric-card__value">{{ summary.scenicTotal }}</div>
          </el-card>
          <el-card shadow="never" class="admin-metric-card">
            <div class="admin-metric-card__label">专题文章</div>
            <div class="admin-metric-card__value">{{ summary.articleTotal }}</div>
          </el-card>
          <el-card shadow="never" class="admin-metric-card">
            <div class="admin-metric-card__label">横幅素材</div>
            <div class="admin-metric-card__value">{{ summary.bannerTotal }}</div>
          </el-card>
        </div>
      </section>

      <section class="admin-quick-links">
        <div class="admin-section-head">
          <div class="admin-section-title">常用入口</div>
          <div class="admin-section-desc">
            按照“首页章节 -> 景点 -> 专题”的顺序维护，最容易保证前台呈现一致，也更适合答辩时讲清楚后台工作流。
          </div>
        </div>

        <div class="admin-quick-links__grid">
          <router-link v-for="item in quickLinks" :key="item.path" :to="item.path" class="admin-quick-link-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </router-link>
        </div>
      </section>
    </div>
  </AdminShell>
</template>
