<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getRecommendQuestionsApi, postAiChatApi } from '../api/ai';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { getContextCard, pickNarrativeText } from '../utils/immersive-content';
import { createSceneMotion, createSceneReveals } from '../utils/scene-motion';

const rootRef = ref(null);
const question = ref('');
const loading = ref(false);
const recommendLoading = ref(false);
const errorMessage = ref('');
const recommendQuestions = ref([]);
const chatRecords = ref([]);

let cleanupMotion = () => {};

const latestRecord = computed(() => chatRecords.value[0] || null);
const historyRecords = computed(() => chatRecords.value.slice(1, 4));

function buildAnswerBlocks(data) {
  if (Array.isArray(data.answerBlocks) && data.answerBlocks.length) {
    return data.answerBlocks.filter((item) => item?.content);
  }

  const blocks = [];

  if (data.directAnswer || data.answer) {
    blocks.push({
      type: 'lead',
      title: '导览首答',
      content: data.directAnswer || data.answer
    });
  }

  if (data.culturalContext) {
    blocks.push({
      type: 'context',
      title: '文化线索',
      content: data.culturalContext
    });
  }

  return blocks;
}

function normalizeCards(items = []) {
  return items.map(getContextCard).filter(Boolean);
}

function buildRecord(data, currentQuestion) {
  const citations = normalizeCards(Array.isArray(data.citations) ? data.citations : []);
  const relatedCards = normalizeCards(Array.isArray(data.relatedCards) ? data.relatedCards : []);
  const heroSpotlight = getContextCard(data.heroSpotlight)
    || relatedCards[0]
    || citations[0]
    || null;
  const followupPrompts = Array.isArray(data.followupPrompts) && data.followupPrompts.length
    ? data.followupPrompts
    : data.nextSteps || [];

  return {
    question: currentQuestion,
    leadTitle: pickNarrativeText(data.leadTitle, `关于“${currentQuestion}”的导览回答`),
    answerBlocks: buildAnswerBlocks(data),
    citations: citations.length ? citations : relatedCards,
    followupPrompts,
    heroSpotlight,
    relatedTopics: data.relatedTopics || [],
    relatedSpots: data.relatedSpots || [],
    modelName: data.model_name || ''
  };
}

async function loadRecommendQuestions() {
  recommendLoading.value = true;

  try {
    const response = await getRecommendQuestionsApi();
    recommendQuestions.value = response.data || [];
  } catch (error) {
    recommendQuestions.value = [];
  } finally {
    recommendLoading.value = false;
  }
}

async function submitQuestion(customQuestion) {
  if (loading.value) {
    return;
  }

  const currentQuestion = String(customQuestion ?? question.value).trim();

  if (!currentQuestion) {
    ElMessage.warning('请先输入问题');
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await postAiChatApi({ question: currentQuestion });
    chatRecords.value.unshift(buildRecord(response.data || {}, currentQuestion));
    question.value = '';
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '问答服务暂时繁忙，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleRecommendClick(item) {
  if (loading.value) {
    return;
  }

  question.value = item;
  submitQuestion(item);
}

function resolveCardImage(card) {
  return resolveAssetUrl(card?.image, card?.title || '赣州导览线索');
}

function resolveCardPath(card) {
  return card?.path || '/scenic';
}

function resolveCardType(card) {
  return card?.type === 'scenic' ? '景点' : '专题';
}

function setupMotion() {
  cleanupMotion();

  if (!rootRef.value) {
    return;
  }

  cleanupMotion = createSceneMotion(rootRef.value, ({ gsap, ScrollTrigger }) => {
    gsap
      .timeline({
        defaults: {
          ease: 'power3.out'
        }
      })
      .from('.guide-threshold__media img', { scale: 1.06, duration: 1.4 }, 0)
      .from('.guide-threshold__copy > *', { autoAlpha: 0, y: 24, stagger: 0.08, duration: 0.84 }, 0.14)
      .from('.guide-composer__panel > *', { autoAlpha: 0, y: 18, stagger: 0.05, duration: 0.72 }, 0.28);

    createSceneReveals({
      gsap,
      ScrollTrigger,
      sceneSelector: '.guide-scene'
    });
  });
}

watch(
  () => chatRecords.value.length,
  async () => {
    await nextTick();
    setupMotion();
  }
);

onMounted(async () => {
  await loadRecommendQuestions();
  await nextTick();
  setupMotion();
});

onBeforeUnmount(() => {
  cleanupMotion();
});
</script>

<template>
  <SiteLayout>
    <div ref="rootRef" class="page-shell guide-room">
      <section class="guide-threshold">
        <div class="guide-threshold__media">
          <img src="/immersive/hero/P0-01_JiangnanSongcheng_official_02.jpg" alt="AI 导览室" />
        </div>
        <div class="guide-threshold__veil"></div>

        <div class="guide-threshold__content">
          <div class="guide-threshold__copy">
            <div class="chapter-mark">Guide Room</div>
            <h1 class="page-title">向导览员提问，而不是打开一个普通聊天工具。</h1>
            <p class="page-subtitle">
              AI 在这里负责解释、串联和继续带路。它会先检索站内景点与专题，再把答案组织成更适合阅读的导览脚本。
            </p>
          </div>

          <div class="guide-threshold__note">
            <div class="line-label">提问语气</div>
            <p>可以从地点、主题关系、地方风味、历史路径，或者你想走的一条路线开始。</p>
          </div>
        </div>
      </section>

      <section class="section-inner guide-composer">
        <div class="guide-composer__panel filter-card">
          <div class="guide-composer__head">
            <div>
              <span class="section-eyebrow">Ask The Guide</span>
              <h2 class="section-title">把问题交给导览员。</h2>
            </div>
            <span>{{ recommendLoading ? '正在准备推荐问题' : '支持自由提问' }}</span>
          </div>

          <el-input
            v-model="question"
            type="textarea"
            :rows="6"
            maxlength="200"
            show-word-limit
            placeholder="例如：如果我想从客家文化理解赣州，应该先看哪些景点和专题？"
            @keyup.ctrl.enter="submitQuestion()"
          />

          <div class="guide-composer__actions">
            <div class="guide-composer__prompts">
              <button
                v-for="item in recommendQuestions.slice(0, 4)"
                :key="item"
                type="button"
                class="guide-composer__prompt"
                @click="handleRecommendClick(item)"
              >
                {{ item }}
              </button>
            </div>

            <el-button type="primary" :loading="loading" @click="submitQuestion()">
              {{ loading ? '正在组织回答' : '开始讲解' }}
            </el-button>
          </div>
        </div>
      </section>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        class="page-alert"
      />

      <section v-if="loading" class="section-inner guide-loading panel-soft-card">
        <div class="guide-loading__pulse"></div>
        <div>
          <strong>导览员正在整理线索</strong>
          <p>正在检索站内内容并编排讲解脚本，请稍等。</p>
        </div>
      </section>

      <section v-if="!latestRecord && !loading" class="section-inner guide-empty panel-soft-card">
        <span class="section-eyebrow">Guide Script</span>
        <h2 class="section-title">先问一个问题，导览就会开始。</h2>
        <p class="section-desc">
          推荐从地点、主题关系、地方风味或游览路径切入。第一步不必复杂，关键是把入口打开。
        </p>
      </section>

      <section v-if="latestRecord" class="section-inner--wide guide-session guide-scene guide-session--latest">
        <div class="guide-session__question" data-reveal>
          <span class="section-eyebrow">Current Reading</span>
          <h2 class="section-title">{{ latestRecord.leadTitle }}</h2>
          <p class="guide-session__question-text">{{ latestRecord.question }}</p>

          <div v-if="latestRecord.relatedSpots.length || latestRecord.relatedTopics.length" class="guide-session__tags">
            <span v-for="item in latestRecord.relatedSpots" :key="`spot-${item}`">{{ item }}</span>
            <span v-for="item in latestRecord.relatedTopics" :key="`topic-${item}`">{{ item }}</span>
          </div>

          <small v-if="latestRecord.modelName" class="guide-session__model">{{ latestRecord.modelName }}</small>
        </div>

        <router-link
          v-if="latestRecord.heroSpotlight"
          :to="resolveCardPath(latestRecord.heroSpotlight)"
          class="guide-spotlight"
          data-reveal
        >
          <div class="guide-spotlight__media media-node">
            <img
              :src="resolveCardImage(latestRecord.heroSpotlight)"
              :alt="latestRecord.heroSpotlight.title"
              @error="(event) => applyImageFallback(event, latestRecord.heroSpotlight.title)"
            />
          </div>
          <div class="guide-spotlight__copy">
            <span>{{ resolveCardType(latestRecord.heroSpotlight) }}</span>
            <h3>{{ latestRecord.heroSpotlight.title }}</h3>
            <p>
              {{
                pickNarrativeText(
                  latestRecord.heroSpotlight.caption,
                  latestRecord.heroSpotlight.summary || '这次回答先从这里展开。'
                )
              }}
            </p>
          </div>
        </router-link>

        <div class="guide-session__script">
          <article
            v-for="(block, index) in latestRecord.answerBlocks"
            :key="`${block.title}-${index}`"
            :class="['guide-block', `guide-block--${block.type || 'lead'}`]"
            data-reveal
          >
            <div class="section-label">{{ block.title }}</div>
            <p>{{ block.content }}</p>
          </article>
        </div>

        <div v-if="latestRecord.citations.length" class="guide-citations" data-reveal>
          <div class="guide-citations__head">
            <span class="section-eyebrow">Cited Clues</span>
            <h3>这次回答引用了哪些站内内容？</h3>
          </div>

          <div class="guide-citations__list">
            <router-link
              v-for="card in latestRecord.citations"
              :key="`${card.type}-${card.id}`"
              :to="resolveCardPath(card)"
              class="guide-citations__item"
            >
              <div class="guide-citations__thumb media-node">
                <img
                  :src="resolveCardImage(card)"
                  :alt="card.title"
                  @error="(event) => applyImageFallback(event, card.title)"
                />
              </div>
              <div class="guide-citations__copy">
                <span>{{ resolveCardType(card) }}</span>
                <strong>{{ card.title }}</strong>
                <small>{{ pickNarrativeText(card.caption, card.summary || '作为本次回答的引用线索。') }}</small>
              </div>
            </router-link>
          </div>
        </div>

        <div v-if="latestRecord.followupPrompts.length" class="guide-followups panel-note-muted" data-reveal>
          <div class="section-label">下一步路标</div>
          <div class="guide-followups__list">
            <button
              v-for="(item, index) in latestRecord.followupPrompts"
              :key="`${item}-${index}`"
              type="button"
              class="guide-followups__item"
              @click="submitQuestion(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="historyRecords.length" class="section-inner guide-archive guide-scene">
        <div class="guide-archive__head" data-reveal>
          <span class="section-eyebrow">Previous Threads</span>
          <h2 class="section-title">前面的追问，留作同一条导览轨迹的余光。</h2>
        </div>

        <div class="guide-archive__list">
          <article
            v-for="(record, index) in historyRecords"
            :key="`${record.leadTitle}-${index}`"
            class="guide-archive__item"
            data-reveal
          >
            <h3>{{ record.leadTitle }}</h3>
            <p>{{ record.question }}</p>
            <button
              v-if="record.followupPrompts[0]"
              type="button"
              class="editorial-link guide-archive__action"
              @click="submitQuestion(record.followupPrompts[0])"
            >
              沿着这条线继续问
            </button>
          </article>
        </div>
      </section>

      <section v-if="latestRecord" class="section-inner guide-handoff guide-scene">
        <div class="guide-handoff__panel" data-reveal>
          <div>
            <span class="section-eyebrow">Route Studio</span>
            <h2 class="section-title">如果这次讲解已经打开思路，下一步就把它变成路线。</h2>
            <p class="section-desc">
              把刚刚理清的地点和兴趣带到路线工作室里，让 AI 继续把它们整理成一条更完整的游览节奏。
            </p>
          </div>

          <router-link to="/ai-trip" class="guide-handoff__link">进入路线工作室</router-link>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.guide-room {
  display: grid;
  gap: 36px;
}

.guide-threshold {
  position: relative;
  min-height: min(68vh, 680px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.guide-threshold__media,
.guide-threshold__media img,
.guide-threshold__veil {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.guide-threshold__media img {
  object-fit: cover;
}

.guide-threshold__veil {
  background:
    linear-gradient(90deg, rgba(10, 13, 17, 0.88) 0%, rgba(10, 13, 17, 0.56) 34%, rgba(10, 13, 17, 0.18) 68%, rgba(10, 13, 17, 0.24) 100%),
    linear-gradient(180deg, rgba(10, 13, 17, 0.18) 0%, rgba(10, 13, 17, 0.82) 100%);
}

.guide-threshold__content {
  position: relative;
  z-index: 1;
  min-height: min(68vh, 680px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.5fr);
  align-items: end;
  gap: 24px;
  padding: 42px;
  color: #fff2de;
}

.guide-threshold__copy {
  display: grid;
  gap: 16px;
  max-width: 800px;
}

.guide-threshold__copy :deep(.page-title),
.guide-threshold__copy :deep(.page-subtitle) {
  color: inherit;
}

.guide-threshold__note {
  display: grid;
  gap: 10px;
  padding: 18px 0 0;
  border-top: 1px solid rgba(255, 242, 222, 0.18);
}

.guide-threshold__note p {
  margin: 0;
  color: rgba(255, 242, 222, 0.82);
  line-height: 1.85;
}

.guide-composer__panel {
  display: grid;
  gap: 18px;
  padding: 24px;
}

.guide-composer__head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
}

.guide-composer__head span {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.guide-composer__actions {
  display: grid;
  gap: 14px;
}

.guide-composer__prompts,
.guide-followups__list,
.guide-session__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.guide-composer__prompt,
.guide-followups__item,
.guide-session__tags span {
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 13px;
}

.guide-composer__prompt,
.guide-followups__item {
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background-color var(--transition-base);
}

.guide-composer__prompt {
  border: 1px solid var(--border-subtle);
  background: var(--surface-muted);
  color: var(--color-text-secondary);
}

.guide-composer__prompt:hover,
.guide-followups__item:hover {
  transform: translateY(-2px);
}

.guide-loading,
.guide-empty {
  display: grid;
  gap: 14px;
  padding: 28px;
}

.guide-loading__pulse {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: soft-pulse 1.2s ease-in-out infinite;
}

.guide-loading p,
.guide-session__question-text,
.guide-block p,
.guide-spotlight__copy p,
.guide-citations__copy small,
.guide-archive__item p {
  margin: 0;
  line-height: 1.9;
}

.guide-loading p,
.guide-session__question-text,
.guide-spotlight__copy p,
.guide-citations__copy small,
.guide-archive__item p {
  color: var(--color-text-secondary);
}

.guide-session {
  display: grid;
  gap: 20px;
}

.guide-session__question {
  display: grid;
  gap: 10px;
}

.guide-session__question-text {
  max-width: 48rem;
}

.guide-session__tags span {
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
}

.guide-session__model {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.guide-spotlight {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  padding: 16px;
  border-radius: 30px;
  background: rgba(17, 22, 27, 0.96);
  color: #fff2de;
  box-shadow: var(--shadow-floating);
}

.guide-spotlight__media {
  min-height: 300px;
}

.guide-spotlight__copy {
  display: grid;
  align-content: end;
  gap: 10px;
  padding: 10px 10px 10px 0;
}

.guide-spotlight__copy span {
  color: rgba(255, 242, 222, 0.66);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.guide-spotlight__copy h3,
.guide-citations__head h3,
.guide-archive__item h3 {
  margin: 0;
  font-family: var(--font-family-display);
}

.guide-spotlight__copy h3 {
  font-size: clamp(2rem, 3.1vw, 3rem);
  line-height: 1.04;
}

.guide-spotlight__copy p {
  color: rgba(255, 242, 222, 0.82);
}

.guide-session__script {
  display: grid;
  gap: 14px;
}

.guide-block {
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 26px;
  border: 1px solid var(--border-subtle);
}

.guide-block--lead {
  background: linear-gradient(180deg, rgba(247, 241, 229, 0.96), rgba(240, 232, 216, 0.9));
  box-shadow: var(--shadow-card);
}

.guide-block--context {
  background: rgba(142, 48, 40, 0.06);
  border-color: rgba(142, 48, 40, 0.14);
}

.guide-block p {
  color: var(--color-text-focused);
}

.guide-citations {
  display: grid;
  gap: 16px;
}

.guide-citations__head {
  display: grid;
  gap: 8px;
}

.guide-citations__head h3 {
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  line-height: 1.06;
}

.guide-citations__list {
  display: grid;
  gap: 12px;
}

.guide-citations__item {
  display: grid;
  grid-template-columns: 124px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  padding: 14px;
  border-radius: 24px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.guide-citations__thumb {
  min-height: 124px;
}

.guide-citations__copy {
  display: grid;
  align-content: start;
  gap: 8px;
}

.guide-citations__copy span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.guide-citations__copy strong {
  font-family: var(--font-family-display);
  font-size: 1.45rem;
  line-height: 1.08;
}

.guide-followups {
  display: grid;
  gap: 12px;
  padding: 22px;
}

.guide-followups__item {
  border: 1px solid rgba(142, 48, 40, 0.16);
  background: rgba(142, 48, 40, 0.06);
  color: var(--color-accent);
}

.guide-archive {
  display: grid;
  gap: 20px;
}

.guide-archive__head {
  display: grid;
  gap: 8px;
}

.guide-archive__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.guide-archive__item {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 24px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.guide-archive__item h3 {
  font-size: 1.55rem;
  line-height: 1.08;
}

.guide-archive__action {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  justify-self: start;
}

.guide-handoff__panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 30px;
  border-radius: 32px;
  background: var(--surface-panel);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.guide-handoff__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff2de;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .guide-threshold__content,
  .guide-spotlight,
  .guide-archive__list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .guide-room {
    gap: 30px;
  }

  .guide-threshold,
  .guide-threshold__content {
    min-height: 62svh;
  }

  .guide-threshold__content,
  .guide-composer__panel,
  .guide-loading,
  .guide-empty,
  .guide-block,
  .guide-followups,
  .guide-handoff__panel {
    padding: 22px;
  }

  .guide-citations__item,
  .guide-handoff__panel {
    grid-template-columns: 1fr;
  }

  .guide-citations__thumb,
  .guide-spotlight__media {
    min-height: 220px;
  }
}
</style>
