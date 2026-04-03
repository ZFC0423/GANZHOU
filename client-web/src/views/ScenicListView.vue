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

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 24px;" />
      <div v-if="errorMessage" style="margin-bottom: 24px;">
        <el-button @click="loadList">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <div class="scenic-guide-box">
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
                <div v-else style="flex:1;"></div>
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
        <section class="scenic-next-steps">
          <div class="next-steps-container">
            <h3 class="next-steps-title">对当前内容有进一步疑问？</h3>
            <p class="next-steps-desc">您可以带着浏览中发现的主题与文化线索，向智慧问答入口获取更多信息。</p>
            <div class="next-steps-actions">
              <router-link to="/ai-chat" style="text-decoration: none;">
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
  padding: 48px 40px;
  border-radius: var(--gz-radius-lg);
  background: linear-gradient(135deg, #f0fdf4, #ccfbf1);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.04);
}

.scenic-hero__title {
  color: var(--gz-brand-secondary);
  font-size: 38px;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.scenic-hero__desc {
  color: #475569;
  font-size: 16px;
  margin: 0;
  max-width: 600px;
  line-height: 1.6;
}

.filter-card {
  margin-bottom: 32px;
  border-radius: var(--gz-radius-md);
  background: #f8fafc;
  border: 1px solid var(--gz-border-light);
}

.filter-bar {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr auto;
  gap: 16px;
  align-items: center;
}

.filter-btn {
  padding: 0 32px;
  font-weight: 600;
}

.scenic-card {
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--gz-radius-md);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

:deep(.scenic-card .el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scenic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.scenic-card:hover .scenic-card__image {
  transform: scale(1.04);
}

.scenic-card__cover-box {
  overflow: hidden;
  height: 220px;
}

.scenic-card__image {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.scenic-card__body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
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
  font-size: 20px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  line-height: 1.4;
}

.scenic-card__region {
  color: #0f766e;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f0fdf4;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.scenic-card__intro {
  margin: 0 0 20px;
  color: var(--gz-text-regular);
  line-height: 1.7;
  font-size: 14px;
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
  color: var(--gz-text-secondary);
  font-weight: 500;
}

.scenic-card__action {
  font-size: 14px;
  font-weight: 600;
  color: var(--gz-brand-primary);
  transition: color 0.3s;
  white-space: nowrap;
}

.scenic-card:hover .scenic-card__action {
  color: #0d9488;
}

.scenic-guide-box {
  background: var(--gz-bg-page, #f8fafc);
  padding: 16px 20px;
  border-radius: var(--gz-radius-sm);
  color: var(--gz-text-regular);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 32px;
  border: 1px dashed #cbd5e1;
}

.guide-badge {
  color: #0f766e;
  font-weight: 600;
  margin-right: 8px;
  background: #ccfbf1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.list-section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--gz-border-light);
  padding-bottom: 12px;
}

.list-section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
}

.list-section-desc {
  font-size: 14px;
  color: var(--gz-text-secondary);
}

.pagination-wrap {
  margin-top: 48px;
  display: flex;
  justify-content: center;
}

.scenic-next-steps {
  margin-top: 64px;
  padding-top: 40px;
  border-top: 1px dashed var(--gz-border-light);
  text-align: center;
}

.next-steps-container {
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  padding: 40px;
  border-radius: var(--gz-radius-lg);
  max-width: 800px;
  margin: 0 auto;
}

.next-steps-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin: 0 0 12px;
}

.next-steps-desc {
  color: var(--gz-text-regular);
  font-size: 15px;
  margin: 0 0 24px;
}

.next-steps-actions {
  display: flex;
  justify-content: center;
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
