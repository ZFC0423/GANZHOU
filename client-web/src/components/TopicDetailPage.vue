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

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin: 20px 0;" />
      <div v-if="errorMessage" style="margin-bottom: 20px; display: flex; gap: 12px;">
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
              <router-link to="/ai-chat" style="text-decoration: none;">
                <el-button type="primary" size="large" plain>
                  关于此主题，向 AI 咨询
                </el-button>
              </router-link>
              <router-link to="/ai-trip" style="text-decoration: none;">
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
  margin-bottom: 24px;
}

.nav-back {
  color: var(--gz-text-regular);
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}

.nav-back:hover {
  color: var(--gz-brand-primary);
}

.detail-article {
  max-width: 860px;
  margin: 0 auto 56px;
  animation: fadeIn 0.6s ease-out;
}

.detail-article__header {
  text-align: center;
  margin-bottom: 32px;
}

.detail-article__meta-top {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.view-count {
  font-size: 13px;
  color: var(--gz-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-article__title {
  font-size: 38px;
  font-weight: 800;
  color: var(--gz-brand-secondary);
  line-height: 1.3;
  margin: 0 0 24px;
  letter-spacing: -0.5px;
}

.topic-overview-text {
  margin: 24px auto 0;
  max-width: 680px;
  color: var(--gz-text-regular);
  font-size: 15px;
  line-height: 1.7;
  text-align: left;
  background: var(--gz-bg-page);
  padding: 16px 24px;
  border-radius: var(--gz-radius-sm);
  border: 1px solid var(--gz-border-light);
}

.topic-section {
  margin-bottom: 40px;
}

.section-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--gz-brand-primary);
  margin-bottom: 16px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--gz-border-light);
  padding-bottom: 8px;
  display: inline-block;
}

.section-label.align-center {
  display: block;
  text-align: center;
  border-bottom: none;
  font-size: 14px;
  margin-bottom: 24px;
}

.core-clues {
  background: #f8fafc;
  padding: 24px;
  border-radius: var(--gz-radius-md);
  border-left: 4px solid var(--gz-brand-primary);
}

.core-clues .section-label {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 12px;
}

.core-clues-text {
  color: var(--gz-text-regular);
  font-size: 16px;
  line-height: 1.8;
}

.detail-article__tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-article__hero {
  border-radius: var(--gz-radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.detail-article__cover {
  width: 100%;
  height: 440px;
  object-fit: cover;
  display: block;
}

.detail-article__body {
  max-width: 760px;
  margin: 0 auto;
}

.reading-guide-box {
  background: var(--gz-bg-page, #f8fafc);
  padding: 16px 20px;
  border-radius: var(--gz-radius-sm);
  color: var(--gz-text-regular);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 24px;
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

.content-source-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  color: var(--gz-text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gz-border-light);
}

.detail-article__html {
  font-size: 16px;
  line-height: 2.1;
  color: #334155;
  word-wrap: break-word;
  white-space: pre-line;
}

.detail-article__html :deep(img) {
  max-width: 100%;
  border-radius: var(--gz-radius-md);
  margin: 20px 0;
}

.detail-related {
  max-width: 1000px;
  margin: 0 auto;
  border-top: 1px solid var(--gz-border-light);
  padding-top: 48px;
}

.detail-related__header {
  text-align: center;
  margin-bottom: 32px;
}

.detail-related__header p {
  margin: 0;
  color: var(--gz-text-secondary);
  font-size: 15px;
}

.topic-next-steps {
  max-width: 800px;
  margin: 56px auto 0;
  padding-top: 40px;
  border-top: 1px dashed var(--gz-border-light);
  text-align: center;
}

.next-steps-container {
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  padding: 40px;
  border-radius: var(--gz-radius-lg);
}

.next-steps-desc {
  color: var(--gz-text-regular);
  font-size: 15px;
  margin: 0 0 24px;
}

.next-steps-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.related-card {
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.related-card .el-card__body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.related-image-box {
  overflow: hidden;
}

.related-card__body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.related-card__body h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--gz-brand-secondary);
  line-height: 1.4;
}

.related-card__body p {
  margin: 0;
  color: var(--gz-text-regular);
  line-height: 1.7;
  font-size: 14px;
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
  }
}
</style>
