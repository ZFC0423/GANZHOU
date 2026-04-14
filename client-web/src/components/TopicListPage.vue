<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { View, Search } from '@element-plus/icons-vue';

const props = defineProps({
  pageTitle: { type: String, required: true },
  pageDescription: { type: String, required: true },
  categoryCode: { type: String, required: true },
  detailBasePath: { type: String, required: true },
  pageEyebrow: { type: String, default: '' },
  listTitle: { type: String, default: '' },
  guideText: { type: String, default: '' }
});

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const listData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 6,
  total: 0
});
const filters = reactive({
  keyword: ''
});

async function loadList() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getArticleListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      categoryCode: props.categoryCode
    });

    listData.value = response.data.list;
    pagination.total = response.data.total;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '主题内容加载失败，请稍后重试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadList();
}

function goDetail(id) {
  router.push(`${props.detailBasePath}/${id}`);
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="topic-hero">
        <div class="topic-hero__accent-line"></div>
        <div class="topic-hero__content">
          <div class="topic-hero__badge">
            {{ pageEyebrow || (categoryCode === 'food' ? '地道美食' : categoryCode === 'heritage' ? '非遗传承' : '红色记忆') }}
          </div>
          <h1 class="page-title topic-hero__title">{{ pageTitle }}</h1>
          <p class="page-subtitle topic-hero__desc">{{ pageDescription }}</p>
        </div>
      </section>

      <el-card class="topic-search" shadow="never">
        <div class="topic-search__bar">
          <el-input v-model="filters.keyword" placeholder="输入关键词，筛选该主题下的文化线索..." clearable @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" class="search-btn" @click="handleSearch">筛选内容</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert" />
      <div v-if="errorMessage" class="page-alert-actions">
        <el-button @click="loadList">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="暂无符合该主题的相关文化线索" />

        <div v-else>
          <div class="reading-guide-box">
            <strong>浏览提示：</strong>{{ guideText || '本页按主题组织已有内容，为您提供清晰的探索入口。当前展示基于平台现有资料，部分原始条目保留了外文命名。' }}
          </div>
          
          <h2 v-if="listTitle" class="topic-list-heading">{{ listTitle }}</h2>
          
          <div class="card-grid">
            <el-card v-for="item in listData" :key="item.id" class="topic-card" shadow="hover" @click="goDetail(item.id)">
              <div class="topic-card__image-wrapper">
                <img
                  class="image-cover topic-card__image"
                  :src="resolveAssetUrl(item.coverImage, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
              </div>
              <div class="topic-card__body">
                <div class="topic-card__meta">
                  <span class="meta-cat">{{ item.categoryName }}</span>
                  <span class="meta-view"><el-icon><View /></el-icon> {{ item.viewCount }}</span>
                </div>
                <h3 class="topic-card__title">{{ item.title }}</h3>
                <p class="topic-card__summary">{{ item.summary || '暂无核心线索说明。' }}</p>
                <div class="topic-card__tags" v-if="item.tags && item.tags.length">
                  <el-tag v-for="tag in item.tags" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag>
                </div>
              </div>
            </el-card>
          </div>
        </div>

        <div class="topic-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            background
          />
        </div>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.topic-hero {
  position: relative;
  margin-bottom: 32px;
  padding: clamp(32px, 6vw, 52px);
  border-radius: var(--radius-panel);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 248, 0.94));
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.topic-hero::after {
  content: '';
  position: absolute;
  right: -72px;
  bottom: -112px;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(255, 56, 92, 0.16), transparent 70%);
}

.topic-hero__accent-line {
  position: relative;
  z-index: 1;
  width: 80px;
  height: 4px;
  margin-bottom: 16px;
  border-radius: 999px;
  background: var(--color-accent);
}

.topic-hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
}

.topic-hero__badge {
  margin-bottom: 16px;
}

.topic-hero__title {
  margin: 0 0 16px;
}

.topic-hero__desc {
  max-width: 620px;
}

.topic-search {
  margin-bottom: 32px;
}

.topic-search__bar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-btn {
  min-width: 132px;
}

.topic-card {
  cursor: pointer;
  height: 100%;
}

:deep(.topic-card .el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.topic-card__image-wrapper {
  height: 240px;
}

.topic-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.meta-cat {
  color: var(--color-accent);
  font-weight: 600;
}

.meta-view {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-tertiary);
}

.topic-card__title {
  margin: 0 0 12px;
  font-size: clamp(18px, 1.4vw, 20px);
  font-weight: 700;
  line-height: 1.28;
}

.topic-card__summary {
  margin: 0 0 20px;
  flex: 1;
}

.topic-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-pagination {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

.topic-list-heading {
  margin: 0 0 20px;
  color: var(--color-text-primary);
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 700;
  letter-spacing: var(--tracking-tight-1);
}

.page-alert {
  margin-bottom: 16px;
}

.page-alert-actions {
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .topic-hero {
    padding: 32px 24px;
  }
  
  .topic-search__bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-btn {
    width: 100%;
  }
}

.reading-guide-box strong {
  color: var(--color-accent);
}
</style>
