<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getScenicDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getScenicDetailApi(route.params.id);
    detail.value = response.data;
  } catch (error) {
    detail.value = null;
    errorMessage.value = error.response?.data?.message || 'Failed to load scenic detail.';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function goRelated(id) {
  router.push(`/scenic/${id}`);
}

watch(() => route.params.id, loadDetail);
onMounted(loadDetail);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item to="/scenic">景点列表</el-breadcrumb-item>
        <el-breadcrumb-item>详情</el-breadcrumb-item>
      </el-breadcrumb>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin: 20px 0;" />
      <div v-if="errorMessage" style="margin-bottom: 20px; display: flex; gap: 12px;">
        <el-button @click="loadDetail">重试请求</el-button>
        <router-link to="/scenic"><el-button>返回列表</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <section class="detail-hero">
          <div class="detail-hero__gallery">
            <el-carousel v-if="detail.galleryImages?.length" height="360px">
              <el-carousel-item v-for="item in detail.galleryImages" :key="item">
                <img
                  class="detail-hero__image"
                  :src="resolveAssetUrl(item, detail.name)"
                  :alt="detail.name"
                  @error="(event) => applyImageFallback(event, detail.name)"
                />
              </el-carousel-item>
            </el-carousel>
            <img
              v-else
              class="detail-hero__image"
              :src="resolveAssetUrl(detail.coverImage, detail.name)"
              :alt="detail.name"
              @error="(event) => applyImageFallback(event, detail.name)"
            />
          </div>

          <div class="detail-hero__info">
            <div class="detail-hero__meta">{{ detail.categoryName }} - {{ detail.region }}</div>
            <h1 class="page-title">{{ detail.name }}</h1>
            <p class="page-subtitle">{{ detail.intro || 'No introduction yet.' }}</p>
            <div class="detail-hero__tags">
              <el-tag v-for="tag in detail.tags" :key="tag" type="success">{{ tag }}</el-tag>
            </div>
            <div class="detail-hero__summary">
              <div><strong>开放时间：</strong> {{ detail.openTime || '未知' }}</div>
              <div><strong>门票信息：</strong> {{ detail.ticketInfo || '未知' }}</div>
              <div><strong>建议游玩：</strong> {{ detail.suggestedDuration || '未知' }}</div>
              <div><strong>具体地址：</strong> {{ detail.address || '未知' }}</div>
            </div>
          </div>
        </section>

        <section class="detail-grid">
          <el-card shadow="never">
            <template #header>基本介绍</template>
            <p class="detail-paragraph">{{ detail.intro || '暂无基本介绍。' }}</p>
          </el-card>
          <el-card shadow="never">
            <template #header>历史与文化背景</template>
            <p class="detail-paragraph">{{ detail.cultureDesc || '暂无文化背景。' }}</p>
          </el-card>
          <el-card shadow="never">
            <template #header>交通指南</template>
            <p class="detail-paragraph">{{ detail.trafficGuide || '暂无交通指南。' }}</p>
          </el-card>
          <el-card shadow="never">
            <template #header>游玩小贴士</template>
            <p class="detail-paragraph">{{ detail.tips || '暂无游玩提示。' }}</p>
          </el-card>
        </section>

        <section class="related-section">
          <div class="related-section__header">
            <h2>周边/相关景点推荐</h2>
            <router-link to="/scenic">返回全部景点</router-link>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="暂无相关推荐" />

          <div v-else class="card-grid">
            <el-card v-for="item in detail.relatedList" :key="item.id" class="related-card" shadow="hover" @click="goRelated(item.id)">
              <img
                class="image-cover"
                :src="resolveAssetUrl(item.coverImage, item.name)"
                :alt="item.name"
                @error="(event) => applyImageFallback(event, item.name)"
              />
              <div class="related-card__body">
                <h3>{{ item.name }}</h3>
                <p>{{ item.region }}</p>
              </div>
            </el-card>
          </div>
        </section>
      </template>

      <el-empty v-else description="Scenic detail is not available right now" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.detail-hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 24px;
  margin-top: 20px;
  margin-bottom: 28px;
}

.detail-hero__gallery,
.detail-hero__info {
  border-radius: 24px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.detail-hero__image {
  width: 100%;
  height: 360px;
  object-fit: cover;
}

.detail-hero__info {
  padding: 32px;
}

.detail-hero__meta {
  color: #0f766e;
  font-weight: 700;
  margin-bottom: 14px;
}

.detail-hero__tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 18px 0;
}

.detail-hero__summary {
  display: grid;
  gap: 12px;
  color: #374151;
  line-height: 1.7;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detail-paragraph {
  margin: 0 0 16px;
  line-height: 1.9;
  color: #4b5563;
}

.related-section {
  margin-top: 34px;
}

.related-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.related-section__header h2 {
  margin: 0;
}

.related-card {
  cursor: pointer;
  height: 100%;
}

.related-card__body h3 {
  margin: 14px 0 6px;
}

.related-card__body p {
  margin: 0;
  color: #6b7280;
}

@media (max-width: 900px) {
  .detail-hero,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
