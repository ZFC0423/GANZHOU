<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import {
  getNarrativeImage,
  getNarrativeQuote,
  getThemeMeta,
  pickNarrativeText
} from '../utils/immersive-content';

const props = defineProps({
  pageTitle: { type: String, required: true },
  backPath: { type: String, required: true },
  themeCode: { type: String, required: true }
});

const route = useRoute();
const themeMeta = computed(() => getThemeMeta(props.themeCode));
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

const contentBlocks = computed(() => {
  const raw = String(detail.value?.content || '').trim();

  if (!raw || /<\/?[a-z][\s\S]*>/i.test(raw)) {
    return [];
  }

  return raw.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
});

async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getArticleDetailApi(route.params.id);
    detail.value = response.data;
  } catch (error) {
    detail.value = null;
    errorMessage.value = error.response?.data?.message || '专题内容加载失败，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function resolveHeroImage() {
  return resolveAssetUrl(
    getNarrativeImage(detail.value, 'article') || themeMeta.value.heroImage,
    detail.value?.title
  );
}

watch(
  () => route.params.id,
  () => {
    loadDetail();
  },
  { immediate: true }
);
</script>

<template>
  <SiteLayout>
    <div class="page-shell chapter-detail-page">
      <div class="chapter-detail-page__nav">
        <router-link :to="backPath" class="chapter-detail-page__back">返回章节目录</router-link>
        <span>{{ pageTitle }}</span>
      </div>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        class="page-alert page-alert--block"
      />
      <div v-if="errorMessage" class="page-alert-actions">
        <el-button @click="loadDetail">重新加载</el-button>
        <router-link :to="backPath"><el-button>返回目录</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <section class="chapter-detail-hero">
          <div class="chapter-detail-hero__media">
            <img
              :src="resolveHeroImage()"
              :alt="detail.title"
              @error="(event) => applyImageFallback(event, detail.title)"
            />
          </div>
          <div class="chapter-detail-hero__overlay">
            <div class="chapter-detail-hero__copy">
              <div class="chapter-mark">{{ themeMeta.chapterNo }} / Reading Room</div>
              <h1 class="page-title">{{ detail.title }}</h1>
              <p class="page-subtitle">{{ pickNarrativeText(detail.summary, themeMeta.opening) }}</p>
              <blockquote class="display-quote">
                “{{ getNarrativeQuote(detail, 'article') || themeMeta.quote }}”
              </blockquote>
            </div>

            <div class="chapter-detail-hero__note">
              <div class="section-label">章节线索</div>
              <p>{{ themeMeta.routeLabel }}</p>
            </div>
          </div>
        </section>

        <div class="section-inner chapter-detail-layout editorial-columns">
          <article class="editorial-columns__main chapter-detail-article">
            <div class="section-copy">
              <span class="section-eyebrow">Reading Room</span>
              <h2 class="section-title">先理解，再继续往下走。</h2>
              <p class="section-desc">{{ themeMeta.curatorNote }}</p>
            </div>

            <div v-if="contentBlocks.length" class="chapter-detail-article__content">
              <p v-for="(paragraph, index) in contentBlocks" :key="index">{{ paragraph }}</p>
            </div>

            <div
              v-else
              class="chapter-detail-article__html"
              v-html="detail.content || detail.summary || '当前暂无正文内容。'"
            />
          </article>

          <aside class="editorial-columns__side is-sticky chapter-detail-sidebar">
            <div class="panel-soft-card chapter-detail-sidebar__card">
              <div class="section-label">策展说明</div>
              <p>{{ themeMeta.thesis }}</p>
            </div>

            <div v-if="detail.tags?.length" class="panel-soft-card chapter-detail-sidebar__card">
              <div class="section-label">关键词</div>
              <div class="chapter-detail-sidebar__tags">
                <span v-for="tag in detail.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>

            <div class="panel-note-muted chapter-detail-sidebar__card">
              <div class="section-label">来源与整理</div>
              <p>{{ detail.source || '平台策展整理' }} / {{ detail.author || '赣州长卷内容组' }}</p>
            </div>
          </aside>
        </div>

        <section class="section-inner chapter-detail-related">
          <div class="chapter-detail-related__head">
            <div>
              <span class="section-eyebrow">Related Works</span>
              <h2 class="section-title">同一章里的其他展品。</h2>
            </div>
            <p class="section-desc">如果这一篇已经建立了气质，下面这些条目会继续把它展开。</p>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="当前暂无关联条目。" />

          <div v-else class="chapter-detail-related__grid">
            <router-link
              v-for="item in detail.relatedList"
              :key="item.id"
              :to="`${backPath}/${item.id}`"
              class="chapter-detail-related__card"
            >
              <div class="chapter-detail-related__card-media media-node">
                <img
                  :src="resolveAssetUrl(getNarrativeImage(item, 'article') || item.coverImage, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
              </div>
              <div class="chapter-detail-related__card-body">
                <h3>{{ item.title }}</h3>
                <p>{{ pickNarrativeText(item.summary, themeMeta.opening) }}</p>
              </div>
            </router-link>
          </div>
        </section>

        <section class="topic-next-steps">
          <div class="next-steps-container">
            <div class="section-label align-center">把这篇带走</div>
            <p class="next-steps-desc">
              你可以继续沿章节目录阅读，也可以把这篇里的线索交给 AI 导览，让它继续变成更清晰的地点与路线。
            </p>
            <div class="next-steps-actions">
              <router-link to="/ai-chat" class="link-reset">
                <el-button type="primary" size="large" plain>用 AI 继续讲解这篇内容</el-button>
              </router-link>
            </div>
          </div>
        </section>
      </template>

      <el-empty v-else description="当前未获取到相关专题内容。" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.chapter-detail-page {
  display: grid;
  gap: 40px;
}

.chapter-detail-page__nav {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.chapter-detail-page__back {
  color: var(--color-accent);
}

.chapter-detail-hero {
  position: relative;
  min-height: min(74vh, 720px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.chapter-detail-hero__media,
.chapter-detail-hero__media img {
  width: 100%;
  height: 100%;
}

.chapter-detail-hero__media {
  position: absolute;
  inset: 0;
}

.chapter-detail-hero__media img {
  object-fit: cover;
}

.chapter-detail-hero__overlay {
  position: relative;
  min-height: min(74vh, 720px);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.6fr);
  align-items: end;
  gap: 24px;
  padding: 42px;
  color: #f8f0df;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0.14), rgba(17, 22, 27, 0.86));
}

.chapter-detail-hero__copy {
  display: grid;
  gap: 16px;
  max-width: 760px;
}

.chapter-detail-hero__copy :deep(.page-title),
.chapter-detail-hero__copy :deep(.page-subtitle),
.chapter-detail-hero__copy :deep(.display-quote) {
  color: inherit;
}

.chapter-detail-hero__note {
  display: grid;
  gap: 10px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(248, 240, 223, 0.12);
  border: 1px solid rgba(248, 240, 223, 0.12);
}

.chapter-detail-hero__note p {
  margin: 0;
  color: rgba(248, 240, 223, 0.84);
  line-height: 1.8;
}

.chapter-detail-article {
  display: grid;
  gap: 18px;
}

.chapter-detail-article__content,
.chapter-detail-article__html {
  display: grid;
  gap: 18px;
  color: var(--color-text-focused);
  font-size: 16px;
  line-height: 2;
}

.chapter-detail-article__content p {
  margin: 0;
}

.chapter-detail-article__html :deep(p) {
  margin: 0 0 18px;
}

.chapter-detail-sidebar {
  display: grid;
  gap: 16px;
}

.chapter-detail-sidebar__card {
  padding: 22px;
}

.chapter-detail-sidebar__card p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.chapter-detail-sidebar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chapter-detail-sidebar__tags span {
  padding: 8px 12px;
  border-radius: var(--radius-round);
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
  font-size: 13px;
}

.chapter-detail-related {
  display: grid;
  gap: 24px;
}

.chapter-detail-related__head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
}

.chapter-detail-related__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.chapter-detail-related__card {
  display: grid;
  gap: 0;
  border-radius: 28px;
  overflow: hidden;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.chapter-detail-related__card-media {
  min-height: 240px;
}

.chapter-detail-related__card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chapter-detail-related__card-body {
  display: grid;
  gap: 10px;
  padding: 20px;
}

.chapter-detail-related__card-body h3 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 28px;
  line-height: 1.15;
}

.chapter-detail-related__card-body p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

@media (max-width: 1023px) {
  .chapter-detail-hero__overlay,
  .chapter-detail-related__head,
  .chapter-detail-related__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .chapter-detail-page__nav {
    display: grid;
  }

  .chapter-detail-hero,
  .chapter-detail-hero__overlay {
    min-height: 66svh;
  }

  .chapter-detail-hero__overlay,
  .chapter-detail-sidebar__card {
    padding: 22px;
  }

  .chapter-detail-related__card-media {
    min-height: 220px;
  }
}
</style>
