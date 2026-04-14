<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getScenicListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { Search, Location } from '@element-plus/icons-vue';

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
  keyword: '',
  region: '',
  tag: ''
});

async function loadList() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getScenicListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      region: filters.region,
      tag: filters.tag
    });

    listData.value = response.data.list;
    pagination.total = response.data.total;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '景点列表加载失败，请稍后重试。';
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
  router.push(`/scenic/${id}`);
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="scenic-hero">
        <div class="scenic-hero__content">
          <h1 class="page-title scenic-hero__title">景点浏览</h1>
          <p class="page-subtitle scenic-hero__desc">
            从这里开始探索赣州的文化遗存与自然景观，为您建立进一步了解的入口。
          </p>
        </div>
      </section>

      <el-card class="filter-card" shadow="never">
        <div class="filter-bar">
          <el-input v-model="filters.keyword" clearable placeholder="输入景点名称或片段..." @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-input v-model="filters.region" clearable placeholder="例: 章贡区" @keyup.enter="handleSearch">
            <template #prepend>属地</template>
          </el-input>
          
          <el-input v-model="filters.tag" clearable placeholder="例: 红色文化" @keyup.enter="handleSearch">
            <template #prepend>主题</template>
          </el-input>
          
          <el-button type="primary" class="filter-btn" @click="handleSearch">筛选查看</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert" />
      <div v-if="errorMessage" class="page-alert-actions">
        <el-button @click="loadList">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <div class="reading-guide-box">
          <span class="guide-badge">阅读提示</span>本页从景点浏览出发，帮助您逐步进入相关主题与文化线索。<br/>您可以先查阅代表性景点，再由详情页深入探索。当前内容基于现有平台资料进行缓冲展示，部分未完全中文化的条目保留原始信息语言。
        </div>
        
        <div class="list-section-header">
          <h2 class="list-section-title">景点与关联主题</h2>
          <span class="list-section-desc">基于已有平台资料，提供 {{ pagination.total }} 个浏览入口</span>
        </div>

        <el-empty v-if="!listData.length" description="抱歉，未发现符合您期待的景点记录" />

        <div v-else class="card-grid">
          <el-card v-for="item in listData" :key="item.id" class="scenic-card" shadow="hover" @click="goDetail(item.id)">
            <div class="scenic-card__cover-box">
              <img
                class="image-cover scenic-card__image"
                :src="resolveAssetUrl(item.coverImage, item.name)"
                :alt="item.name"
                @error="(event) => applyImageFallback(event, item.name)"
              />
            </div>
            <div class="scenic-card__body">
              <div class="scenic-card__head">
                <h3 class="scenic-card__title">{{ item.name }}</h3>
                <span class="scenic-card__region">
                  <el-icon><Location /></el-icon> {{ item.region || '未知' }}
                </span>
              </div>
              <p class="scenic-card__intro">{{ item.intro || '该景点的缓冲导读尚未完全收录。' }}</p>
              
              <div class="scenic-card__footer">
                <div class="scenic-card__tags" v-if="item.tags && item.tags.length">
                  <span class="tag-label">相关主题：</span>
                  <el-tag v-for="tag in item.tags" :key="tag" size="small" type="success" effect="plain" round>{{ tag }}</el-tag>
                </div>
                <div v-else class="scenic-card__spacer"></div>
                <div class="scenic-card__action">
                  查看详情 &rarr;
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            background
          />
        </div>

        <!-- 探索入口层 -->
        <section class="topic-next-steps scenic-next-steps">
          <div class="next-steps-container">
            <h3 class="next-steps-title">对当前内容有进一步疑问？</h3>
            <p class="next-steps-desc">您可以带着浏览中发现的主题与文化线索，向智慧问答入口获取更多信息。</p>
            <div class="next-steps-actions">
              <router-link to="/ai-chat" class="link-reset">
                <el-button type="primary" plain size="large">围绕以上线索咨询 AI</el-button>
              </router-link>
            </div>
          </div>
        </section>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.scenic-hero {
  margin-bottom: 32px;
  padding: clamp(32px, 6vw, 52px);
  border-radius: var(--radius-panel);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.14), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.96));
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.scenic-hero__title {
  margin: 0 0 12px;
}

.scenic-hero__desc {
  max-width: 600px;
}

.filter-card {
  margin-bottom: 32px;
}

.filter-bar {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr auto;
  gap: 16px;
  align-items: center;
}

.filter-btn {
  min-width: 132px;
}

.reading-guide-box {
  margin-bottom: 32px;
}

.scenic-card {
  cursor: pointer;
  height: 100%;
}

:deep(.scenic-card .el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scenic-card__cover-box {
  height: 240px;
}

.scenic-card__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.scenic-card__title {
  margin: 0;
  font-size: clamp(18px, 1.4vw, 20px);
  font-weight: 700;
  line-height: 1.28;
}

.scenic-card__region {
  white-space: nowrap;
}

.scenic-card__intro {
  margin: 0 0 20px;
  flex: 1;
}

.scenic-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: auto;
  gap: 12px;
}

.scenic-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.tag-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.scenic-card__action {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  transition: color var(--transition-base);
  white-space: nowrap;
}

.scenic-card:hover .scenic-card__action {
  color: var(--color-accent-hover);
}

.pagination-wrap {
  margin-top: 48px;
  display: flex;
  justify-content: center;
}

.scenic-card__spacer {
  flex: 1;
}

.page-alert {
  margin-bottom: 16px;
}

.page-alert-actions {
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .filter-bar {
    grid-template-columns: 1fr;
  }
  
  .filter-btn {
    width: 100%;
  }
}
</style>
