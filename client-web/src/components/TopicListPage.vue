<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, View } from '@element-plus/icons-vue';
import SiteLayout from './SiteLayout.vue';
import { getArticleListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import {
  getArticleMeta,
  getNarrativeImage,
  getNarrativeQuote,
  getThemeMeta,
  pickNarrativeText
} from '../utils/immersive-content';

const props = defineProps({
  pageTitle: { type: String, required: true },
  pageDescription: { type: String, required: true },
  categoryCode: { type: String, required: true },
  detailBasePath: { type: String, required: true }
});

const router = useRouter();
const themeMeta = computed(() => getThemeMeta(props.categoryCode));
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

const leadItem = computed(() => listData.value[0] || null);
const supportingItems = computed(() => listData.value.slice(1));
const chapterBands = computed(() => {
  const items = supportingItems.value;
  const bands = [];

  for (let index = 0; index < items.length; index += 2) {
    bands.push(items.slice(index, index + 2));
  }

  return bands;
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

    listData.value = response.data.list || [];
    pagination.total = response.data.total || 0;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '专题内容加载失败，请稍后再试。';
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

function resolveArticleImage(item) {
  return resolveAssetUrl(getNarrativeImage(item, 'article') || item?.coverImage, item?.title);
}

function resolveArticleCaption(item) {
  return getArticleMeta(item?.id)?.quote || item?.summary || themeMeta.value.heroCaption;
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <SiteLayout>
    <div class="page-shell chapter-page">
      <section class="chapter-poster">
        <div class="chapter-poster__media">
          <img :src="themeMeta.heroImage" :alt="pageTitle" />
        </div>
        <div class="chapter-poster__overlay">
          <div class="chapter-poster__copy">
            <div class="chapter-mark">{{ themeMeta.chapterNo }} / {{ themeMeta.chapterEn }}</div>
            <h1 class="page-title">{{ pageTitle }}</h1>
            <p class="page-subtitle">{{ pageDescription }}</p>
          </div>

          <div class="chapter-poster__note">
            <div class="section-label">策展提示</div>
            <p>{{ themeMeta.curatorNote }}</p>
          </div>
        </div>
      </section>

      <section class="section-inner chapter-curation">
        <div class="section-copy">
          <span class="section-eyebrow">Curatorial Thesis</span>
          <h2 class="section-title">{{ themeMeta.chapterLabel }}</h2>
          <p class="section-desc">{{ themeMeta.thesis }}</p>
        </div>

        <div class="chapter-curation__search filter-card">
          <div class="chapter-curation__search-head">
            <div>
              <div class="line-label">章节索引</div>
              <p>按关键词过滤条目，快速找到你想继续深入的线索。</p>
            </div>
            <span>{{ filters.keyword ? '已启用筛选' : '自由漫游' }}</span>
          </div>

          <div class="chapter-curation__search-bar">
            <el-input
              v-model="filters.keyword"
              clearable
              placeholder="输入关键词，例如：街巷、手艺、旧址、味觉"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <button type="button" class="chapter-curation__search-button" @click="handleSearch">更新索引</button>
          </div>
        </div>
      </section>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert" />
      <div v-if="errorMessage" class="page-alert-actions">
        <el-button @click="loadList">重新请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="当前暂无符合筛选条件的条目。" />

        <template v-else>
          <section class="section-inner--wide chapter-lead">
            <div class="chapter-lead__copy">
              <span class="section-eyebrow">Lead Exhibit</span>
              <h2 class="section-title">{{ leadItem.title }}</h2>
              <p class="section-desc">{{ pickNarrativeText(leadItem.summary, themeMeta.opening) }}</p>
              <blockquote class="display-quote">
                “{{ getNarrativeQuote(leadItem, 'article') || themeMeta.quote }}”
              </blockquote>
              <div class="chapter-lead__meta">
                <span>{{ leadItem.categoryName || themeMeta.chapterShort }}</span>
                <span><el-icon><View /></el-icon>{{ leadItem.viewCount || 0 }}</span>
              </div>
              <button type="button" class="chapter-lead__button" @click="goDetail(leadItem.id)">进入这件展品</button>
            </div>

            <button type="button" class="chapter-lead__media media-node" @click="goDetail(leadItem.id)">
              <img
                :src="resolveArticleImage(leadItem)"
                :alt="leadItem.title"
                @error="(event) => applyImageFallback(event, leadItem.title)"
              />
              <div class="chapter-lead__caption">{{ resolveArticleCaption(leadItem) }}</div>
            </button>
          </section>

          <section class="section-inner chapter-bands">
            <div class="chapter-bands__head">
              <div>
                <span class="section-eyebrow">Chapter Bands</span>
                <h2 class="section-title">{{ themeMeta.atlasTitle }}</h2>
              </div>
              <p class="section-desc">{{ themeMeta.atlasNote }}</p>
            </div>

            <div class="chapter-bands__list">
              <div v-for="(band, bandIndex) in chapterBands" :key="bandIndex" class="chapter-band">
                <span class="chapter-band__index">Band {{ bandIndex + 1 }}</span>

                <div class="chapter-band__items">
                  <article
                    v-for="item in band"
                    :key="item.id"
                    class="chapter-band__item"
                    @click="goDetail(item.id)"
                  >
                    <div class="chapter-band__image media-node">
                      <img
                        :src="resolveArticleImage(item)"
                        :alt="item.title"
                        @error="(event) => applyImageFallback(event, item.title)"
                      />
                    </div>
                    <div class="chapter-band__copy">
                      <span>{{ item.categoryName || themeMeta.chapterShort }}</span>
                      <h3>{{ item.title }}</h3>
                      <p>{{ pickNarrativeText(item.summary, themeMeta.opening) }}</p>
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <div class="chapter-bands__pagination">
              <el-pagination
                v-model:current-page="pagination.page"
                layout="total, prev, pager, next"
                :total="pagination.total"
                background
              />
            </div>
          </section>

          <section class="topic-next-steps">
            <div class="next-steps-container">
              <div class="section-label align-center">继续向前</div>
              <p class="next-steps-desc">
                如果这一章已经让你形成了初步印象，可以把它继续带去 AI 导览，让问题、地点与后续路线自然连接起来。
              </p>
              <div class="next-steps-actions">
                <router-link to="/ai-chat" class="link-reset">
                  <el-button type="primary" size="large" plain>带着这一章继续提问</el-button>
                </router-link>
              </div>
            </div>
          </section>
        </template>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.chapter-page {
  display: grid;
  gap: 42px;
}

.chapter-poster {
  position: relative;
  min-height: min(80vh, 820px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.chapter-poster__media,
.chapter-poster__media img {
  width: 100%;
  height: 100%;
}

.chapter-poster__media {
  position: absolute;
  inset: 0;
}

.chapter-poster__media img {
  object-fit: cover;
}

.chapter-poster__overlay {
  position: relative;
  min-height: min(80vh, 820px);
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.64fr);
  align-items: end;
  gap: 24px;
  padding: 42px;
  color: #f9f0e1;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0.12), rgba(17, 22, 27, 0.82));
}

.chapter-poster__copy {
  display: grid;
  gap: 18px;
  max-width: 780px;
}

.chapter-poster__copy :deep(.page-title),
.chapter-poster__copy :deep(.page-subtitle) {
  color: inherit;
}

.chapter-poster__note {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(248, 240, 225, 0.12);
  border: 1px solid rgba(248, 240, 225, 0.12);
}

.chapter-poster__note p {
  margin: 0;
  color: rgba(249, 240, 225, 0.82);
  line-height: 1.85;
}

.chapter-curation {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(320px, 0.92fr);
  gap: 26px;
}

.chapter-curation__search {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.chapter-curation__search-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.chapter-curation__search-head p {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.chapter-curation__search-head span {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.chapter-curation__search-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.chapter-curation__search-button,
.chapter-lead__button {
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-round);
  background: var(--color-accent);
  color: #fff3ea;
  font-weight: 600;
  cursor: pointer;
}

.chapter-lead {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.02fr);
  gap: 28px;
  align-items: center;
}

.chapter-lead__copy {
  display: grid;
  gap: 16px;
}

.chapter-lead__meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.chapter-lead__meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chapter-lead__media {
  position: relative;
  min-height: 560px;
}

.chapter-lead__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chapter-lead__caption {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 20px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(17, 22, 27, 0.72);
  color: rgba(255, 243, 225, 0.86);
  line-height: 1.75;
}

.chapter-bands {
  display: grid;
  gap: 24px;
}

.chapter-bands__head {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: end;
}

.chapter-bands__list {
  display: grid;
  gap: 20px;
}

.chapter-band {
  display: grid;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
}

.chapter-band__index {
  color: var(--color-accent);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.chapter-band__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.chapter-band__item {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 14px;
  cursor: pointer;
}

.chapter-band__image {
  min-height: 200px;
}

.chapter-band__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chapter-band__copy {
  display: grid;
  align-content: start;
  gap: 8px;
}

.chapter-band__copy span {
  color: var(--color-accent);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chapter-band__copy h3 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 1.7rem;
  line-height: 1.08;
}

.chapter-band__copy p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.chapter-bands__pagination {
  display: flex;
  justify-content: center;
}

@media (max-width: 1023px) {
  .chapter-poster__overlay,
  .chapter-curation,
  .chapter-lead,
  .chapter-bands__head,
  .chapter-band__items,
  .chapter-band__item {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .chapter-poster,
  .chapter-poster__overlay {
    min-height: 68svh;
  }

  .chapter-poster__overlay,
  .chapter-curation__search {
    padding: 22px;
  }

  .chapter-curation__search-bar {
    grid-template-columns: 1fr;
  }

  .chapter-lead__media {
    min-height: 360px;
  }

  .chapter-band__image {
    min-height: 220px;
  }
}
</style>
