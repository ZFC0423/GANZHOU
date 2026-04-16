<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElAlert, ElButton, ElEmpty, ElIcon, ElInput, ElMessage, ElPagination, ElSkeleton } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { getScenicListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { getNarrativeImage, getNarrativeQuote, getScenicGroup } from '../utils/narrative-meta';
import { pickNarrativeText } from '../utils/narrative-text';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const listData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0
});
const filters = reactive({
  keyword: ''
});

const groupMetaMap = {
  city: {
    title: '城中旧线',
    desc: '适合先建立老城印象，再走进更具体的空间关系和日常纹理。'
  },
  cultural: {
    title: '文化据点',
    desc: '石窟、客乡与人文入口在这里形成更清晰的阅读视角。'
  },
  mountain: {
    title: '山水外部',
    desc: '当城市叙事展开之后，再把呼吸交给山地、水线与更辽阔的留白。'
  }
};

const leadSpot = computed(() => listData.value[0] || null);

const atlasGroups = computed(() => {
  const groups = {
    city: [],
    cultural: [],
    mountain: []
  };

  listData.value.forEach((item) => {
    groups[getScenicGroup(item)].push(item);
  });

  return Object.entries(groups)
    .filter(([, items]) => items.length)
    .map(([key, items]) => ({
      key,
      ...groupMetaMap[key],
      lead: items[0],
      items: items.slice(1, 4)
    }));
});

async function loadList() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getScenicListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword
    });

    listData.value = response.data.list || [];
    pagination.total = response.data.total || 0;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '景点图谱加载失败，请稍后再试。';
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

function resolveScenicImage(item) {
  return resolveAssetUrl(
    item?.media?.coverImage || getNarrativeImage(item, 'scenic') || item?.coverImage,
    item?.name
  );
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <div class="page-shell scenic-atlas-page">
      <section class="scenic-atlas-hero">
        <div class="scenic-atlas-hero__media">
          <img src="/immersive/hero/P0-01_Yugutai_official_01.jpg" alt="赣州景点图谱" />
        </div>
        <div class="scenic-atlas-hero__overlay">
          <div class="scenic-atlas-hero__copy">
            <div class="chapter-mark">Scenic Atlas</div>
            <h1 class="page-title">先记住地方，再记住信息。</h1>
            <p class="page-subtitle">
              这里不是后台式列表，而是一张把老城、文化据点与山水外部重新编排后的赣州地方图谱。
            </p>
          </div>

          <div class="scenic-atlas-hero__note">
            <strong>探索方式</strong>
            <p>先看一处代表地点，再按空间气质进入不同组块。实用字段留在后面，首屏先建立场域感。</p>
          </div>
        </div>
      </section>

      <section class="section-inner scenic-atlas-lens">
        <div class="section-copy">
          <span class="section-eyebrow">Atlas Lens</span>
          <h2 class="section-title">用关键词收窄视线，但不要破坏探索感。</h2>
        </div>

        <div class="scenic-atlas-lens__panel filter-card">
          <div class="scenic-atlas-lens__head">
            <div>
              <div class="line-label">景点索引</div>
              <p>输入地点名、区域或你记得的线索，让图谱重新聚焦。</p>
            </div>
            <span>{{ pagination.total || 0 }} 个地点</span>
          </div>

          <div class="scenic-atlas-lens__bar">
            <el-input
              v-model="filters.keyword"
              clearable
              placeholder="输入关键词，例如：古城、浮桥、客家、山水"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <button type="button" class="scenic-atlas-lens__button" @click="handleSearch">更新图谱</button>
          </div>
        </div>
      </section>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="page-alert" />
      <div v-if="errorMessage" class="page-alert-actions">
        <el-button @click="loadList">重新请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="当前暂无符合筛选条件的景点。" />

        <template v-else>
          <section v-if="leadSpot" class="section-inner--wide scenic-atlas-lead">
            <button type="button" class="scenic-atlas-lead__media media-node" @click="goDetail(leadSpot.id)">
              <img
                :src="resolveScenicImage(leadSpot)"
                :alt="leadSpot.name"
                @error="(event) => applyImageFallback(event, leadSpot.name)"
              />
            </button>

            <div class="scenic-atlas-lead__copy">
              <span class="section-eyebrow">Lead Spot</span>
              <h2 class="section-title">{{ leadSpot.name }}</h2>
              <p class="section-desc">
                {{ pickNarrativeText(leadSpot.heroCaption, leadSpot.intro || '从这里开始建立对赣州地方空间的第一印象。') }}
              </p>
              <blockquote class="display-quote">
                “{{ getNarrativeQuote(leadSpot, 'scenic') || '先记住地方，后面的路线才会变得清楚。' }}”
              </blockquote>
              <div class="scenic-atlas-lead__facts">
                <span>{{ pickNarrativeText(leadSpot.region, '赣州') }}</span>
                <span>{{ pickNarrativeText(leadSpot.categoryName, '精选地点') }}</span>
                <span>{{ pickNarrativeText(leadSpot.routeLabel, '地方线索') }}</span>
              </div>
              <button type="button" class="scenic-atlas-lead__button" @click="goDetail(leadSpot.id)">进入这个地方</button>
            </div>
          </section>

          <section class="section-inner scenic-atlas-groups">
            <article v-for="group in atlasGroups" :key="group.key" class="scenic-atlas-group">
              <div class="scenic-atlas-group__head">
                <div>
                  <div class="chapter-mark chapter-mark--dark">{{ group.key }}</div>
                  <h2 class="section-title">{{ group.title }}</h2>
                </div>
                <p class="section-desc">{{ group.desc }}</p>
              </div>

              <div class="scenic-atlas-group__layout">
                <button
                  type="button"
                  class="scenic-atlas-group__lead media-node"
                  @click="goDetail(group.lead.id)"
                >
                  <img
                    :src="resolveScenicImage(group.lead)"
                    :alt="group.lead.name"
                    @error="(event) => applyImageFallback(event, group.lead.name)"
                  />
                  <div class="scenic-atlas-group__lead-copy">
                    <span>{{ pickNarrativeText(group.lead.routeLabel, group.lead.region || '地方线索') }}</span>
                    <strong>{{ group.lead.name }}</strong>
                  </div>
                </button>

                <div class="scenic-atlas-group__trail">
                  <button
                    v-for="item in group.items"
                    :key="item.id"
                    type="button"
                    class="scenic-atlas-group__trail-item"
                    @click="goDetail(item.id)"
                  >
                    <strong>{{ item.name }}</strong>
                    <p>{{ pickNarrativeText(item.heroCaption, item.intro || '继续沿着这组地方线索往下走。') }}</p>
                    <small>{{ pickNarrativeText(item.routeLabel, item.region || '赣州') }}</small>
                  </button>
                </div>
              </div>
            </article>
          </section>

          <div class="scenic-atlas-pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              layout="total, prev, pager, next"
              :total="pagination.total"
              background
            />
          </div>
        </template>
      </template>
  </div>
</template>

<style scoped>
.scenic-atlas-page {
  display: grid;
  gap: 42px;
}

.scenic-atlas-hero {
  position: relative;
  min-height: min(74vh, 720px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.scenic-atlas-hero__media,
.scenic-atlas-hero__media img {
  width: 100%;
  height: 100%;
}

.scenic-atlas-hero__media {
  position: absolute;
  inset: 0;
}

.scenic-atlas-hero__media img {
  object-fit: cover;
}

.scenic-atlas-hero__overlay {
  position: relative;
  min-height: min(74vh, 720px);
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.56fr);
  align-items: end;
  gap: 24px;
  padding: 42px;
  color: #fff3e1;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0.16), rgba(17, 22, 27, 0.82));
}

.scenic-atlas-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 780px;
}

.scenic-atlas-hero__copy :deep(.page-title),
.scenic-atlas-hero__copy :deep(.page-subtitle) {
  color: inherit;
}

.scenic-atlas-hero__note {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 243, 225, 0.12);
  border: 1px solid rgba(255, 243, 225, 0.12);
}

.scenic-atlas-hero__note p,
.scenic-atlas-hero__note strong {
  margin: 0;
}

.scenic-atlas-hero__note p {
  color: rgba(255, 243, 225, 0.82);
  line-height: 1.85;
}

.scenic-atlas-lens {
  display: grid;
  grid-template-columns: minmax(0, 0.84fr) minmax(360px, 1fr);
  gap: 24px;
}

.scenic-atlas-lens__panel {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.scenic-atlas-lens__head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.scenic-atlas-lens__head p {
  margin: 8px 0 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.scenic-atlas-lens__head span {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.scenic-atlas-lens__bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.scenic-atlas-lens__button,
.scenic-atlas-lead__button {
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-round);
  background: var(--color-accent);
  color: #fff3ea;
  font-weight: 600;
  cursor: pointer;
}

.scenic-atlas-lead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 24px;
  align-items: center;
}

.scenic-atlas-lead__media {
  min-height: 620px;
}

.scenic-atlas-lead__copy {
  display: grid;
  gap: 16px;
}

.scenic-atlas-lead__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.scenic-atlas-lead__facts span {
  padding: 8px 12px;
  border-radius: var(--radius-round);
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
  font-size: 13px;
}

.scenic-atlas-groups {
  display: grid;
  gap: 30px;
}

.scenic-atlas-group {
  display: grid;
  gap: 18px;
}

.scenic-atlas-group__head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: end;
}

.scenic-atlas-group__layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1fr);
  gap: 18px;
}

.scenic-atlas-group__lead {
  min-height: 420px;
}

.scenic-atlas-group__lead img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scenic-atlas-group__lead-copy {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 6px;
  padding: 20px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(10, 13, 17, 0), rgba(10, 13, 17, 0.86));
}

.scenic-atlas-group__lead-copy span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 242, 222, 0.72);
}

.scenic-atlas-group__lead-copy strong,
.scenic-atlas-group__trail-item strong {
  font-family: var(--font-family-display);
}

.scenic-atlas-group__lead-copy strong {
  font-size: 2rem;
  line-height: 1.06;
}

.scenic-atlas-group__trail {
  display: grid;
  gap: 14px;
}

.scenic-atlas-group__trail-item {
  display: grid;
  gap: 8px;
  padding: 18px 0;
  border-top: 1px solid var(--border-subtle);
  text-align: left;
  background: transparent;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  cursor: pointer;
}

.scenic-atlas-group__trail-item strong {
  font-size: 1.55rem;
  line-height: 1.08;
}

.scenic-atlas-group__trail-item p,
.scenic-atlas-group__trail-item small {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.scenic-atlas-pagination {
  display: flex;
  justify-content: center;
}

@media (max-width: 1023px) {
  .scenic-atlas-hero__overlay,
  .scenic-atlas-lens,
  .scenic-atlas-lead,
  .scenic-atlas-group__head,
  .scenic-atlas-group__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .scenic-atlas-hero,
  .scenic-atlas-hero__overlay {
    min-height: 66svh;
  }

  .scenic-atlas-hero__overlay,
  .scenic-atlas-lens__panel {
    padding: 22px;
  }

  .scenic-atlas-lens__bar {
    grid-template-columns: 1fr;
  }

  .scenic-atlas-lead__media,
  .scenic-atlas-group__lead {
    min-height: 280px;
  }
}
</style>
