<script setup>
import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { postAiTripPlanApi } from '../api/ai';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { getContextCard, pickNarrativeText } from '../utils/immersive-content';

const interestOptions = [
  { label: '自然风光', value: 'natural' },
  { label: '红色文化', value: 'red_culture' },
  { label: '客家文化', value: 'hakka_culture' },
  { label: '非遗文化', value: 'heritage' },
  { label: '美食体验', value: 'food' },
  { label: '亲子休闲', value: 'family' },
  { label: '拍照漫游', value: 'photography' }
];

const paceLabelMap = {
  relaxed: '轻松漫游',
  normal: '适中铺陈',
  compact: '紧凑推进'
};

const transportLabelMap = {
  public_transport: '公共交通',
  self_drive: '自驾'
};

const slotLabelMap = {
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  evening: '傍晚'
};

const dayFrames = [
  '/immersive/scenic-details/P0-07_Yugutai_official_02.jpg',
  '/immersive/scenic-details/P0-09_HakkaCultureCity_official_01.jpg',
  '/immersive/scenic-details/P0-11_Sanbaishan_media_02.jpg',
  '/immersive/scenic-details/P0-10_Fushougou_media_01.jpg'
];

const formState = reactive({
  days: 2,
  interests: ['red_culture', 'food'],
  pace: 'normal',
  transport: 'public_transport',
  notes: ''
});

const loading = ref(false);
const errorMessage = ref('');
const result = ref(null);

const routeDays = computed(() => result.value?.days || []);
const contextCards = computed(() => {
  if (Array.isArray(result.value?.citations) && result.value.citations.length) {
    return result.value.citations.map(getContextCard).filter(Boolean);
  }

  return (result.value?.matchedContext || []).map(getContextCard).filter(Boolean);
});

const routeWarnings = computed(() => {
  if (Array.isArray(result.value?.routeWarnings) && result.value.routeWarnings.length) {
    return result.value.routeWarnings;
  }

  if (Array.isArray(result.value?.adjustmentSuggestions)) {
    return result.value.adjustmentSuggestions;
  }

  return result.value?.adjustmentSuggestions ? [result.value.adjustmentSuggestions] : [];
});

const packingTips = computed(() => {
  if (Array.isArray(result.value?.packingTips) && result.value.packingTips.length) {
    return result.value.packingTips;
  }

  return result.value?.travelTips || [];
});

function validateForm() {
  if (!Number.isInteger(formState.days) || formState.days < 1 || formState.days > 5) {
    ElMessage.warning('出行天数需要在 1 到 5 天之间');
    return false;
  }

  if (!formState.interests.length) {
    ElMessage.warning('请至少选择一个兴趣方向');
    return false;
  }

  if ((formState.notes || '').length > 300) {
    ElMessage.warning('补充说明请控制在 300 字以内');
    return false;
  }

  return true;
}

async function submitTripPlan() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await postAiTripPlanApi({
      days: formState.days,
      interests: formState.interests,
      pace: formState.pace,
      transport: formState.transport,
      notes: formState.notes
    });

    result.value = response.data || null;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '行程推荐服务暂时繁忙，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function formatTimeSlot(value) {
  return slotLabelMap[value] || value || '时段建议';
}

function formatContextType(value) {
  return value === 'scenic' ? '景点' : '专题';
}

function resolveDayFrame(day, index) {
  const image = day?.coverImage || dayFrames[index % dayFrames.length];
  return resolveAssetUrl(image, day?.coverSpot || day?.title || '赣州路线');
}

function resolveCardImage(card) {
  return resolveAssetUrl(card?.image, card?.title || '赣州导览素材');
}
</script>

<template>
  <SiteLayout>
    <div class="page-shell route-studio-page">
      <section class="route-studio-hero">
        <div class="route-studio-hero__media">
          <img src="/immersive/hero/P0-01_AncientWall_official_03.jpg" alt="路线工作室" />
        </div>
        <div class="route-studio-hero__overlay">
          <div class="route-studio-hero__copy">
            <div class="chapter-mark">Route Studio</div>
            <h1 class="page-title">把兴趣、天数与节奏，整理成一条可进入的赣州路线。</h1>
            <p class="page-subtitle">
              这里不是生成表单结果，而是把你的偏好编排成一份有章节感、有重点、可继续讲述的游览作品。
            </p>
          </div>

          <div class="route-studio-hero__note">
            <div class="section-label">工作方式</div>
            <p>先在左侧定调，再在右侧查看路线长卷。结果会结合站内景点与专题内容生成，而不是脱离内容的空泛建议。</p>
          </div>
        </div>
      </section>

      <section class="page-workspace route-studio-workspace">
        <aside class="page-workspace__aside route-studio-workspace__aside">
          <div class="route-studio-form filter-card">
            <div class="route-studio-form__head">
              <span class="section-eyebrow">Calibration</span>
              <h2 class="section-title">先定这次如何进入赣州。</h2>
            </div>

            <el-form label-position="top">
              <div class="route-studio-form__grid">
                <el-form-item label="游览天数">
                  <el-input-number v-model="formState.days" :min="1" :max="5" />
                </el-form-item>

                <el-form-item label="行程节奏">
                  <el-radio-group v-model="formState.pace">
                    <el-radio-button label="relaxed">轻松</el-radio-button>
                    <el-radio-button label="normal">适中</el-radio-button>
                    <el-radio-button label="compact">紧凑</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </div>

              <el-form-item label="交通方式">
                <el-radio-group v-model="formState.transport">
                  <el-radio-button label="public_transport">公共交通</el-radio-button>
                  <el-radio-button label="self_drive">自驾</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="兴趣方向">
                <el-checkbox-group v-model="formState.interests" class="route-studio-form__checkboxes">
                  <el-checkbox v-for="item in interestOptions" :key="item.value" :label="item.value" border>
                    {{ item.label }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="补充说明">
                <el-input
                  v-model="formState.notes"
                  type="textarea"
                  :rows="4"
                  maxlength="300"
                  show-word-limit
                  placeholder="例如：希望步行强度适中，尽量安排老城夜景和有文化解释的内容。"
                />
              </el-form-item>
            </el-form>

            <el-button type="primary" :loading="loading" @click="submitTripPlan">
              {{ loading ? '正在生成路线' : '生成路线作品' }}
            </el-button>
          </div>

          <div class="panel-note-muted route-studio-note">
            <div class="section-label">填写建议</div>
            <p>兴趣越明确，生成结果越容易形成章节差异。你也可以反复调整参数，比较不同版本的路线气质。</p>
          </div>

          <el-alert
            v-if="errorMessage"
            :title="errorMessage"
            type="error"
            show-icon
            :closable="false"
            class="page-alert page-alert--block"
          />
        </aside>

        <div class="page-workspace__main route-studio-workspace__main">
          <section v-if="!loading && !result" class="route-studio-empty panel-soft-card">
            <span class="section-eyebrow">Route Canvas</span>
            <h2 class="section-title">左侧定调之后，右侧会展开一条带节奏的路线长页。</h2>
            <p class="section-desc">
              系统会根据你的偏好整合景点与专题内容，输出路线定位、每天安排、亮点和提示，适合继续展示和讲解。
            </p>
          </section>

          <section v-if="loading" class="route-studio-loading panel-soft-card">
            <div class="route-studio-loading__pulse"></div>
            <div>
              <strong>路线工作室正在编排章节</strong>
              <p>正在检索站内内容并生成更贴近你的游览节奏。</p>
            </div>
          </section>

          <template v-if="result && !loading">
            <section class="route-studio-summary">
              <div class="route-studio-summary__hero panel-soft-card">
                <div class="section-eyebrow">Route Positioning</div>
                <div class="route-studio-summary__mood">
                  {{ result.routeMood || `${formState.days} 天 / ${paceLabelMap[formState.pace]} / ${transportLabelMap[formState.transport]}` }}
                </div>
                <h2>{{ result.routeTitle || result.pathPositioning || '这是一条以地方理解为核心的赣州路线。' }}</h2>
                <p>{{ result.introNote || result.summary }}</p>
              </div>

              <div class="route-studio-summary__meta">
                <div class="route-studio-summary__meta-card">
                  <span>行程节奏</span>
                  <strong>{{ paceLabelMap[formState.pace] }}</strong>
                </div>
                <div class="route-studio-summary__meta-card">
                  <span>交通方式</span>
                  <strong>{{ transportLabelMap[formState.transport] }}</strong>
                </div>
                <div class="route-studio-summary__meta-card">
                  <span>适合人群</span>
                  <strong>{{ result.suitableFor || '适合作为首轮赣州导览路线' }}</strong>
                </div>
              </div>
            </section>

            <section v-if="result.routeHighlights?.length" class="route-studio-highlights panel-note-accent">
              <div class="section-label">路线亮点</div>
              <ul>
                <li v-for="(item, index) in result.routeHighlights" :key="index">{{ item }}</li>
              </ul>
            </section>

            <section class="route-studio-days">
              <article v-for="(day, index) in routeDays" :key="day.dayIndex" class="route-studio-day">
                <div class="route-studio-day__frame">
                  <img
                    :src="resolveDayFrame(day, index)"
                    :alt="day.coverSpot || day.title"
                    @error="(event) => applyImageFallback(event, day.coverSpot || day.title)"
                  />
                  <div class="route-studio-day__frame-caption">
                    <span>{{ day.chapterTitle || `Day ${day.dayIndex}` }}</span>
                    <strong>{{ day.coverSpot || day.title }}</strong>
                  </div>
                </div>

                <div class="route-studio-day__content">
                  <div class="section-eyebrow">{{ day.chapterTitle || `Day ${day.dayIndex}` }}</div>
                  <h2>{{ day.title }}</h2>

                  <div class="route-studio-day__items">
                    <article
                      v-for="(item, itemIndex) in day.items"
                      :key="`${day.dayIndex}-${item.timeSlot}-${itemIndex}`"
                      class="route-studio-day__item"
                    >
                      <div class="route-studio-day__item-slot">{{ formatTimeSlot(item.timeSlot) }}</div>
                      <div class="route-studio-day__item-body">
                        <div class="route-studio-day__item-head">
                          <h3>{{ item.name }}</h3>
                          <span>{{ formatContextType(item.type) }}</span>
                        </div>
                        <p>{{ item.reason }}</p>
                        <div class="route-studio-day__item-meta">
                          <small>{{ item.visualHint || '作为这一天的叙事节点' }}</small>
                          <div class="route-studio-day__item-tip">{{ item.tips }}</div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </article>
            </section>

            <section class="route-studio-bottom">
              <div class="panel-soft-card route-studio-bottom__card">
                <div class="section-label">调整建议</div>
                <ul>
                  <li v-for="(item, index) in routeWarnings" :key="index">{{ item }}</li>
                </ul>
              </div>

              <div class="panel-note-muted route-studio-bottom__card">
                <div class="section-label">通用提示</div>
                <ul>
                  <li v-for="(tip, index) in packingTips" :key="index">{{ tip }}</li>
                </ul>
              </div>
            </section>

            <section v-if="contextCards.length" class="route-studio-context">
              <div class="route-studio-context__head">
                <span class="section-eyebrow">Cited Material</span>
                <h2 class="section-title">这条路线引用了哪些站内内容？</h2>
              </div>

              <div class="route-studio-context__grid">
                <router-link
                  v-for="card in contextCards"
                  :key="`${card.type}-${card.id}`"
                  :to="card.path || '/scenic'"
                  class="route-studio-context__card"
                >
                  <div class="route-studio-context__card-media media-node">
                    <img
                      :src="resolveCardImage(card)"
                      :alt="card.title"
                      @error="(event) => applyImageFallback(event, card.title)"
                    />
                  </div>
                  <div class="route-studio-context__card-body">
                    <span>{{ card.type === 'scenic' ? '景点' : '专题' }}</span>
                    <h3>{{ card.title }}</h3>
                    <p>{{ pickNarrativeText(card.caption, card.summary || '作为这次路线生成的参考素材。') }}</p>
                  </div>
                </router-link>
              </div>
            </section>
          </template>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.route-studio-page {
  display: grid;
  gap: 40px;
}

.route-studio-hero {
  position: relative;
  min-height: min(74vh, 720px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.route-studio-hero__media,
.route-studio-hero__media img {
  width: 100%;
  height: 100%;
}

.route-studio-hero__media {
  position: absolute;
  inset: 0;
}

.route-studio-hero__media img {
  object-fit: cover;
}

.route-studio-hero__overlay {
  position: relative;
  min-height: min(74vh, 720px);
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.58fr);
  align-items: end;
  gap: 24px;
  padding: 42px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0.16), rgba(17, 22, 27, 0.84));
}

.route-studio-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 800px;
}

.route-studio-hero__copy :deep(.page-title),
.route-studio-hero__copy :deep(.page-subtitle) {
  color: inherit;
}

.route-studio-hero__note {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 242, 222, 0.12);
  border: 1px solid rgba(255, 242, 222, 0.12);
}

.route-studio-hero__note p {
  margin: 0;
  color: rgba(255, 242, 222, 0.8);
  line-height: 1.85;
}

.route-studio-form {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.route-studio-form__head {
  display: grid;
  gap: 6px;
}

.route-studio-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.route-studio-form__checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.route-studio-note {
  padding: 20px;
}

.route-studio-note p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

.route-studio-empty,
.route-studio-loading {
  display: grid;
  gap: 16px;
  padding: 28px;
}

.route-studio-loading__pulse {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: soft-pulse 1.2s ease-in-out infinite;
}

.route-studio-summary,
.route-studio-days,
.route-studio-bottom,
.route-studio-context {
  display: grid;
  gap: 18px;
}

.route-studio-summary__hero,
.route-studio-summary__meta-card,
.route-studio-bottom__card {
  padding: 22px;
}

.route-studio-summary__hero {
  display: grid;
  gap: 12px;
}

.route-studio-summary__hero h2,
.route-studio-day__content h2,
.route-studio-context__card-body h3 {
  margin: 0;
  font-family: var(--font-family-display);
}

.route-studio-summary__mood {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.route-studio-summary__hero p,
.route-studio-context__card-body p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.88;
}

.route-studio-summary__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.route-studio-summary__meta-card {
  display: grid;
  gap: 8px;
  border-radius: 24px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.route-studio-summary__meta-card span,
.route-studio-context__card-body span,
.route-studio-day__frame-caption span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.route-studio-summary__meta-card span,
.route-studio-context__card-body span {
  color: var(--color-accent);
}

.route-studio-highlights {
  padding: 22px;
}

.route-studio-highlights ul,
.route-studio-bottom__card ul {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-secondary);
  line-height: 1.9;
}

.route-studio-day {
  display: grid;
  grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1fr);
  gap: 22px;
  align-items: stretch;
}

.route-studio-day__frame {
  position: relative;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.route-studio-day__frame img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 420px;
  object-fit: cover;
}

.route-studio-day__frame-caption {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 6px;
  padding: 20px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0), rgba(17, 22, 27, 0.86));
}

.route-studio-day__frame-caption span {
  color: rgba(255, 242, 222, 0.66);
}

.route-studio-day__frame-caption strong {
  font-family: var(--font-family-display);
  font-size: 28px;
  line-height: 1.08;
}

.route-studio-day__content {
  display: grid;
  gap: 16px;
  padding: 22px;
  border-radius: 30px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.route-studio-day__items {
  display: grid;
  gap: 14px;
}

.route-studio-day__item {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.route-studio-day__item-slot {
  padding-top: 8px;
  color: var(--color-accent);
  font-weight: 600;
}

.route-studio-day__item-body {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(142, 48, 40, 0.04);
}

.route-studio-day__item-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: start;
}

.route-studio-day__item-head h3 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 20px;
  line-height: 1.12;
}

.route-studio-day__item-head span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
  font-size: 12px;
}

.route-studio-day__item-body p,
.route-studio-day__item-tip {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.route-studio-day__item-meta {
  display: grid;
  gap: 8px;
}

.route-studio-day__item-meta small {
  color: var(--color-text-tertiary);
}

.route-studio-bottom {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.route-studio-context__head {
  display: grid;
  gap: 8px;
}

.route-studio-context__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.route-studio-context__card {
  display: grid;
  gap: 0;
  border-radius: 26px;
  overflow: hidden;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.route-studio-context__card-media {
  min-height: 220px;
}

.route-studio-context__card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.route-studio-context__card-body {
  display: grid;
  gap: 10px;
  padding: 18px;
}

@media (max-width: 1023px) {
  .route-studio-hero__overlay,
  .route-studio-summary__meta,
  .route-studio-day,
  .route-studio-bottom,
  .route-studio-context__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .route-studio-page {
    gap: 30px;
  }

  .route-studio-hero,
  .route-studio-hero__overlay {
    min-height: 68svh;
  }

  .route-studio-hero__overlay,
  .route-studio-form,
  .route-studio-empty,
  .route-studio-loading,
  .route-studio-summary__hero,
  .route-studio-summary__meta-card,
  .route-studio-day__content,
  .route-studio-bottom__card {
    padding: 22px;
  }

  .route-studio-form__grid,
  .route-studio-day__item {
    grid-template-columns: 1fr;
  }

  .route-studio-day__frame img,
  .route-studio-context__card-media {
    min-height: 220px;
  }
}
</style>
