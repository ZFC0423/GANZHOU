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
    errorMessage.value = error.response?.data?.message || 'Failed to load scenic list.';
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
          <h1 class="page-title scenic-hero__title">探索全景</h1>
          <p class="page-subtitle scenic-hero__desc">
            从千年宋城街巷到悠远客家山林，寻找属于您的赣州印记。
          </p>
        </div>
      </section>

      <el-card class="filter-card" shadow="never">
        <div class="filter-bar">
          <el-input v-model="filters.keyword" clearable placeholder="输入景点名称或导读寻找..." @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-input v-model="filters.region" clearable placeholder="例: 章贡区" @keyup.enter="handleSearch">
            <template #prepend>属地</template>
          </el-input>
          
          <el-input v-model="filters.tag" clearable placeholder="例: 文化" @keyup.enter="handleSearch">
            <template #prepend>标签</template>
          </el-input>
          
          <el-button type="primary" class="filter-btn" @click="handleSearch">全网检索</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 24px;" />
      <div v-if="errorMessage" style="margin-bottom: 24px;">
        <el-button @click="loadList">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
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
              <p class="scenic-card__intro">{{ item.intro || '暂无详细导读，敬请期待。' }}</p>
              <div class="scenic-card__tags" v-if="item.tags && item.tags.length">
                <el-tag v-for="tag in item.tags" :key="tag" size="small" type="success" effect="plain">{{ tag }}</el-tag>
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

.scenic-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-wrap {
  margin-top: 40px;
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
