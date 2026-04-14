<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { View } from '@element-plus/icons-vue';

const props = defineProps({
  pageTitle: { type: String, required: true },
  backPath: { type: String, required: true }
});

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getArticleDetailApi(route.params.id);
    detail.value = response.data;
  } catch (error) {
    detail.value = null;
    errorMessage.value = error.response?.data?.message || '专题内容加载失败，请稍后重试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function goRelated(id) {
  router.push(`${props.backPath}/${id}`);
}

watch(() => route.params.id, loadDetail);
onMounted(loadDetail);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <div class="topic-detail-nav">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="backPath">{{ pageTitle }}</el-breadcrumb-item>
          <el-breadcrumb-item>内容概览</el-breadcrumb-item>
        </el-breadcrumb>
        <router-link :to="backPath" class="nav-back">返回列表</router-link>
      </div>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert page-alert--block" />
      <div v-if="errorMessage" class="page-alert-actions topic-detail-actions">
        <el-button @click="loadDetail">重试请求</el-button>
        <router-link :to="backPath"><el-button>返回列表</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <article class="detail-article">
          <header class="detail-article__header">
            <div class="detail-article__meta-top">
              <el-tag size="small" effect="plain" type="info">{{ detail.categoryName || '主题导览' }}</el-tag>
              <span class="view-count"><el-icon><View /></el-icon> 阅读量: {{ detail.viewCount }}</span>
            </div>
            
            <h1 class="detail-article__title">{{ detail.title }}</h1>
            
            <div class="detail-article__tags" v-if="detail.tags && detail.tags.length">
              <el-tag v-for="tag in detail.tags" :key="tag" type="info" size="small" round># {{ tag }}</el-tag>
            </div>

            <div class="topic-overview-text">
              内容概览：本页围绕当前主题串联相关内容与文化线索，为您从已有资料中建立基础导读。
            </div>
          </header>

          <div class="detail-article__hero">
            <img
              class="detail-article__cover"
              :src="resolveAssetUrl(detail.coverImage, detail.title)"
              :alt="detail.title"
              @error="(event) => applyImageFallback(event, detail.title)"
            />
          </div>

          <div class="detail-article__body">
            <!-- 核心线索 -->
            <div class="topic-section core-clues" v-if="detail.summary">
              <div class="section-label">核心线索</div>
              <div class="core-clues-text">{{ detail.summary }}</div>
            </div>

            <!-- 主题说明缓冲 -->
            <div class="topic-section main-content">
              <div class="section-label">主题说明</div>
              
              <div class="reading-guide-box">
                <span class="guide-badge">阅读提示</span>
                本页以主题化方式组织已有内容，帮助用户更快理解相关景点与文化线索。<br/>
                当前内容以现有平台资料为基础进行导览展示，部分原始条目仍保留既有语言描述方式。
              </div>

              <div class="content-source-info" v-if="detail.source || detail.author">
                <span v-if="detail.source">内容说明：{{ detail.source }}</span>
                <span v-if="detail.author">线索整理：{{ detail.author }}</span>
              </div>
              
              <div class="detail-article__html" v-html="detail.content || detail.summary || '暂无详细主题说明。'" />
            </div>
          </div>
        </article>

        <!-- 延伸了解 -->
        <section class="detail-related topic-section">
          <div class="detail-related__header">
            <div class="section-label align-center">相关内容与景点</div>
            <p>本页基于当前主题所关联的更多平台内容线索。</p>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="暂无相关内容" />

          <div v-else class="card-grid">
            <el-card v-for="item in detail.relatedList" :key="item.id" class="related-card" shadow="hover" @click="goRelated(item.id)">
              <div class="related-image-box">
                <img
                  class="image-cover"
                  :src="resolveAssetUrl(item.coverImage, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
              </div>
              <div class="related-card__body">
                <h3>{{ item.title }}</h3>
                <p>{{ item.summary || '暂无说明线索。' }}</p>
              </div>
            </el-card>
          </div>
        </section>

        <!-- 下一步探索 -->
        <section class="topic-next-steps">
          <div class="next-steps-container">
            <div class="section-label align-center">下一步探索</div>
            <p class="next-steps-desc">您可以带着当前主题的线索，前往 AI 导览入口获取更多建议。</p>
            <div class="next-steps-actions">
              <router-link to="/ai-chat" class="link-reset">
                <el-button type="primary" size="large" plain>
                  关于此主题，向 AI 咨询
                </el-button>
              </router-link>
              <router-link to="/ai-trip" class="link-reset">
                <el-button type="success" size="large" plain>
                  将此主题转为参考行程
                </el-button>
              </router-link>
            </div>
          </div>
        </section>
      </template>

      <el-empty v-else description="暂未获取到相关内容" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.topic-detail-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.nav-back {
  color: var(--color-text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: color var(--transition-base);
}

.nav-back:hover {
  color: var(--color-accent);
}

.detail-article {
  max-width: var(--container-narrow);
  margin: 0 auto 56px;
}

.detail-article__header {
  text-align: center;
  margin-bottom: 32px;
}

.detail-article__meta-top {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.detail-article__title {
  margin: 0 0 24px;
  color: var(--color-text-primary);
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: var(--tracking-tight-2);
}

.topic-overview-text {
  margin: 24px auto 0;
  max-width: 680px;
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: var(--line-relaxed);
  text-align: left;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.96));
  padding: 18px 22px;
  border-radius: var(--radius-card);
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.core-clues {
  padding: 24px;
  border-radius: var(--radius-card);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.96));
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.core-clues .section-label {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 12px;
}

.core-clues-text {
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: var(--line-loose);
}

.detail-article__tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-article__hero {
  border-radius: var(--radius-panel);
  overflow: hidden;
  margin-bottom: 40px;
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-floating);
}

.detail-article__cover {
  width: 100%;
  height: min(56vw, 460px);
  min-height: 280px;
  object-fit: cover;
  display: block;
}

.detail-article__body {
  max-width: var(--container-reading);
  margin: 0 auto;
}

.detail-article__html {
  font-size: 16px;
  line-height: 2;
  color: var(--color-text-focused);
  word-break: break-word;
  white-space: pre-line;
}

.detail-article__html :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-card);
  margin: 24px 0;
  box-shadow: var(--shadow-card);
}

.detail-related {
  max-width: 1000px;
  margin: 0 auto;
}

.related-card {
  cursor: pointer;
  height: 100%;
}

:deep(.related-card .el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.related-image-box {
  height: 220px;
}

.related-card__body h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.related-card__body p {
  margin: 0;
}

.page-alert--block {
  margin: 20px 0;
}

.topic-detail-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .topic-detail-nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .detail-article__title {
    font-size: 28px;
  }
  
  .detail-article__cover {
    height: 240px;
    min-height: 240px;
  }
}
</style>
