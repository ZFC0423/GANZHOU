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
    errorMessage.value = error.response?.data?.message || '景点详情加载失败，请稍后重试。';
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

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert page-alert--block" />
      <div v-if="errorMessage" class="page-alert-actions detail-alert-actions">
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
            <div class="detail-hero__meta">{{ detail.categoryName || '主题分类' }} &bull; {{ detail.region || '所属区域' }}</div>
            <h1 class="page-title">{{ detail.name }}</h1>
            <p class="page-subtitle">{{ detail.intro || '此处暂无提取到的概要说明。' }}</p>
            <div class="detail-hero__tags">
              <el-tag v-for="tag in detail.tags" :key="tag" type="success" effect="plain" round># {{ tag }}</el-tag>
            </div>
            <div class="detail-hero__summary">
              <div><strong>开放时间：</strong> {{ detail.openTime || '暂未收录' }}</div>
              <div><strong>门票信息：</strong> {{ detail.ticketInfo || '暂未收录' }}</div>
              <div><strong>建议游玩：</strong> {{ detail.suggestedDuration || '暂未收录' }}</div>
              <div><strong>具体地址：</strong> {{ detail.address || '暂未收录' }}</div>
            </div>
          </div>
        </section>

        <div class="reading-guide-box">
          <span class="guide-badge">导览提示</span>本页围绕当前景点梳理相关内容与文化线索，帮助您从平台已有资料中建立基础理解。<br/>内容展示以平台收录的资料为缓冲基础，部分原始条目仍保留既有语言描述方式。
        </div>

        <section class="topic-section">
          <h2 class="section-label">推荐了解</h2>
          <div class="detail-grid">
            <el-card shadow="never" class="info-card">
              <template #header><div class="card-title">导览信息</div></template>
              <p class="detail-paragraph">{{ detail.intro || '该景点的基础导览信息尚未完全收录。' }}</p>
            </el-card>
            <el-card shadow="never" class="info-card">
              <template #header><div class="card-title">文化背景</div></template>
              <p class="detail-paragraph">{{ detail.cultureDesc || '暂未收录与其相关的特定文化或历史线索摘要。' }}</p>
            </el-card>
            <el-card shadow="never" class="info-card">
              <template #header><div class="card-title">交通与到达</div></template>
              <p class="detail-paragraph">{{ detail.trafficGuide || '暂未整理具体的交通指引信息。' }}</p>
            </el-card>
            <el-card shadow="never" class="info-card">
              <template #header><div class="card-title">游玩提示</div></template>
              <p class="detail-paragraph">{{ detail.tips || '暂无该景点的提示记录。' }}</p>
            </el-card>
          </div>
        </section>

        <section class="topic-section detail-related">
          <div class="detail-related__header">
            <div class="section-label align-center">相关内容与景点</div>
            <p>从当前景点出发，您可以延伸了解本平台内的其他相关文化地点。</p>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="当前景点侧暂无主动关联的其他信息" />

          <div v-else class="card-grid">
            <el-card v-for="item in detail.relatedList" :key="item.id" class="related-card" shadow="hover" @click="goRelated(item.id)">
              <div class="related-image-box">
                <img
                  class="image-cover"
                  :src="resolveAssetUrl(item.coverImage, item.name)"
                  :alt="item.name"
                  @error="(event) => applyImageFallback(event, item.name)"
                />
              </div>
              <div class="related-card__body">
                <h3 class="related-card__title">{{ item.name }}</h3>
                <p class="related-card__region">{{ item.region || '平台已收录点' }}</p>
              </div>
            </el-card>
          </div>
        </section>

        <!-- 下一步探索 -->
        <section class="topic-next-steps">
          <div class="next-steps-container">
            <div class="section-label align-center">继续探索</div>
            <p class="next-steps-desc">您可以带着当前景点的相关内容与线索，前往导览助手获取更多信息，或将其组合至行程。</p>
            <div class="next-steps-actions">
              <router-link to="/ai-chat" class="link-reset">
                <el-button type="primary" size="large" plain>
                  进入智慧问答
                </el-button>
              </router-link>
              <router-link to="/ai-trip" class="link-reset">
                <el-button type="success" size="large" plain>
                  前往行程规划
                </el-button>
              </router-link>
            </div>
          </div>
        </section>
      </template>

      <el-empty v-else description="暂未获取到该景点的详情内容" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.detail-hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 24px;
  margin-top: 20px;
  margin-bottom: 32px;
}

.detail-hero__gallery,
.detail-hero__info {
  border-radius: var(--radius-panel);
  overflow: hidden;
  background: var(--surface-card);
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.detail-hero__image {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
}

.detail-hero__info {
  padding: 32px;
}

.detail-hero__meta {
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
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.detail-hero__summary > div {
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.94));
  border: 1px solid rgba(236, 231, 223, 0.9);
}

.info-card {
  height: 100%;
}

.reading-guide-box {
  margin-bottom: 40px;
}

.detail-paragraph {
  margin: 0;
  line-height: var(--line-loose);
  color: var(--color-text-secondary);
  font-size: 15px;
}

.related-card {
  cursor: pointer;
  height: 100%;
}

:deep(.related-card .el-card__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.related-image-box {
  height: 220px;
}

.related-card__title {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.related-card__region {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.page-alert--block {
  margin: 20px 0;
}

.detail-alert-actions {
  margin-bottom: 20px;
}

@media (max-width: 900px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .detail-hero__image {
    min-height: 280px;
  }
}
</style>
