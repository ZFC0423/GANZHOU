<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElAlert, ElButton, ElEmpty, ElMessage, ElSkeleton } from 'element-plus';
import { getScenicDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { buildScenicDetailViewModel } from '../view-models/scenic-detail-view-model';
import { createSceneMotion, createSceneReveals } from '../utils/scene-motion';

const route = useRoute();
const rootRef = ref(null);
const heroImageRef = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

let cleanupMotion = () => {};

const pageModel = computed(() => buildScenicDetailViewModel(detail.value));
const scenicMeta = computed(() => pageModel.value.scenicMeta);
const heroData = computed(() => pageModel.value.heroData);
const quickFacts = computed(() => pageModel.value.quickFacts);
const dossierSections = computed(() => pageModel.value.dossierSections);
const sidebarNotes = computed(() => pageModel.value.sidebarNotes);
const servicePanels = computed(() => pageModel.value.servicePanels);
const gallerySequence = computed(() => pageModel.value.gallerySequence);
const routeNodes = computed(() => pageModel.value.routeNodes);

async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getScenicDetailApi(route.params.id);
    detail.value = response.data;
  } catch (error) {
    detail.value = null;
    errorMessage.value = error.response?.data?.message || '景点详情加载失败，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function setupMotion() {
  cleanupMotion();

  if (!rootRef.value || loading.value || !detail.value) {
    return;
  }

  cleanupMotion = createSceneMotion(rootRef.value, ({ gsap, ScrollTrigger, matchMedia, root, select }) => {
    const heroMedia = select('.scenic-hero__media img');
    const heroCopyItems = select('.scenic-hero__copy > *');
    const heroLedgerItems = select('.scenic-hero__ledger > *');

    gsap
      .timeline({
        defaults: {
          ease: 'power3.out'
        }
      })
      .from(heroMedia, { scale: 1.08, duration: 1.5 }, 0)
      .from(heroCopyItems, { autoAlpha: 0, y: 26, stagger: 0.08, duration: 0.86 }, 0.16)
      .from(heroLedgerItems, { autoAlpha: 0, y: 18, stagger: 0.06, duration: 0.74 }, 0.3);

    matchMedia.add('(max-width: 743px)', () => {
      createSceneReveals({
        gsap,
        ScrollTrigger,
        root,
        select,
        sceneSelector: '.scenic-scene',
        start: 'top 90%',
        y: 20,
        duration: 0.72,
        stagger: 0.06,
        initialThreshold: 0.92
      });
    });

    matchMedia.add('(min-width: 744px)', () => {
      createSceneReveals({
        gsap,
        ScrollTrigger,
        root,
        select,
        sceneSelector: '.scenic-scene',
        start: 'top 78%',
        y: 28,
        duration: 0.8,
        stagger: 0.08,
        initialThreshold: 0.82
      });

      if (!heroImageRef.value) {
        return undefined;
      }

      const heroSection = select('.scenic-hero')[0];

      if (!heroSection) {
        return undefined;
      }

      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: ({ progress }) => {
          gsap.to(heroImageRef.value, {
            yPercent: progress * 6,
            duration: 0.18,
            overwrite: true
          });
        }
      });

      return () => {
        gsap.set(heroImageRef.value, { clearProps: 'transform' });
      };
    });
  });
}

watch(
  () => route.params.id,
  () => {
    loadDetail();
  },
  { immediate: true }
);

watch(loading, async (value) => {
  if (!value && detail.value) {
    await nextTick();
    setupMotion();
  }
});

onBeforeUnmount(() => {
  cleanupMotion();
});
</script>

<template>
  <div ref="rootRef" class="page-shell scenic-dossier">
      <div class="scenic-dossier__nav">
        <router-link to="/scenic" class="scenic-dossier__back">返回景点图谱</router-link>
        <span>Scenic Dossier</span>
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
        <router-link to="/scenic"><el-button>返回列表</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <section class="scenic-hero">
          <div class="scenic-hero__media">
            <img
              ref="heroImageRef"
              :src="resolveAssetUrl(heroData.image, heroData.title)"
              :alt="heroData.title"
              @error="(event) => applyImageFallback(event, heroData.title)"
            />
          </div>

          <div class="scenic-hero__overlay">
            <div class="scenic-hero__copy">
              <div class="chapter-mark">Scenic Dossier</div>
              <div class="scenic-hero__meta">{{ heroData.category }} / {{ heroData.region }}</div>
              <h1 class="page-title">{{ heroData.title }}</h1>
              <p class="page-subtitle">{{ heroData.intro }}</p>
              <blockquote class="display-quote">“{{ heroData.quote }}”</blockquote>
            </div>

            <div class="scenic-hero__ledger">
              <div v-for="item in quickFacts.slice(0, 4)" :key="item.label" class="scenic-hero__fact">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="section-inner scenic-dossier__body scenic-scene editorial-columns">
          <div class="editorial-columns__main scenic-dossier__main">
            <div class="section-copy" data-reveal>
              <span class="section-eyebrow">Why This Place</span>
              <h2 class="section-title">先回答为什么值得来，再回答如何抵达。</h2>
              <p class="section-desc">
                景点详情不再只是字段总和，而要先把这个地方的气质、历史和到达方式分层讲清。
              </p>
            </div>

            <article
              v-for="section in dossierSections"
              :key="section.title"
              class="scenic-dossier__block"
              data-reveal
            >
              <div class="line-label">{{ section.kicker }}</div>
              <h3>{{ section.title }}</h3>
              <p>{{ section.content }}</p>
            </article>
          </div>

          <aside class="editorial-columns__side is-sticky scenic-dossier__side">
            <article
              v-for="item in sidebarNotes"
              :key="item.label"
              class="panel-soft-card scenic-dossier__note"
              data-reveal
            >
              <div class="section-label">{{ item.label }}</div>
              <p>{{ item.content }}</p>
            </article>

            <article
              v-for="item in servicePanels"
              :key="item.label"
              :class="[item.muted ? 'panel-note-muted' : 'panel-soft-card', 'scenic-dossier__note']"
              data-reveal
            >
              <div class="section-label">{{ item.label }}</div>
              <p>{{ item.content }}</p>
            </article>
          </aside>
        </section>

        <section v-if="gallerySequence.length" class="section-inner--wide scenic-gallery scenic-scene">
          <div class="section-copy" data-reveal>
            <span class="section-eyebrow">Visual Sequence</span>
            <h2 class="section-title">先看场域，再看细节。</h2>
            <p class="section-desc">
              建立空间的大图、补充关系的中图和强化记忆的细节图，应该共同服务于理解，而不是堆数量。
            </p>
          </div>

          <div class="scenic-gallery__grid">
            <figure
              v-for="(item, index) in gallerySequence"
              :key="`${item.src}-${index}`"
              :class="['scenic-gallery__item', { 'scenic-gallery__item--lead': index === 0 }]"
              data-reveal
            >
              <img
                :src="item.src"
                :alt="heroData.title"
                @error="(event) => applyImageFallback(event, heroData.title)"
              />
              <figcaption>{{ item.caption }}</figcaption>
            </figure>
          </div>
        </section>

        <section class="section-inner scenic-route scenic-scene">
          <div class="section-copy" data-reveal>
            <span class="section-eyebrow">Next Route</span>
            <h2 class="section-title">继续沿着地方线索走，而不是停在当前这张详情页。</h2>
            <p class="section-desc">
              如果这个地方已经让你形成印象，下面这些节点会把空间关系继续展开，而 AI 导览会把它们讲得更清楚。
            </p>
          </div>

          <div v-if="routeNodes.length" class="scenic-route__grid">
            <router-link
              v-for="item in routeNodes"
              :key="item.path"
              :to="item.path"
              class="scenic-route__node"
              data-reveal
            >
              <div class="scenic-route__node-image media-node">
                <img
                  :src="item.image"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
              </div>
              <div class="scenic-route__node-copy">
                <span>{{ item.subtitle }}</span>
                <strong>{{ item.title }}</strong>
                <small>{{ item.summary }}</small>
              </div>
            </router-link>
          </div>

          <div class="scenic-route__handoff panel-note-accent" data-reveal>
            <div>
              <div class="section-label">Bring It To AI</div>
              <p>如果这个地方已经让你产生兴趣，可以继续去问 AI 它与赣州其他专题、景点和路线之间的关系。</p>
            </div>
            <div class="scenic-route__handoff-actions">
              <router-link to="/ai-chat" class="editorial-link">继续追问这处地方</router-link>
              <router-link to="/ai-trip" class="editorial-link">把它带去路线工作室</router-link>
            </div>
          </div>
        </section>
      </template>

    <el-empty v-else description="当前未获取到该景点详情。" />
  </div>
</template>

<style scoped>
.scenic-dossier {
  display: grid;
  gap: 38px;
}

.scenic-dossier__nav {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.scenic-dossier__back {
  color: var(--color-accent);
}

.scenic-hero {
  position: relative;
  min-height: min(86vh, 840px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.scenic-hero__media,
.scenic-hero__media img {
  width: 100%;
  height: 100%;
}

.scenic-hero__media {
  position: absolute;
  inset: 0;
}

.scenic-hero__media img {
  object-fit: cover;
}

.scenic-hero__overlay {
  position: relative;
  min-height: min(86vh, 840px);
  display: grid;
  align-content: end;
  gap: 28px;
  padding: 42px;
  color: #fff3e1;
  background:
    linear-gradient(180deg, rgba(17, 22, 27, 0.12), rgba(17, 22, 27, 0.34) 42%, rgba(17, 22, 27, 0.88) 100%);
}

.scenic-hero__copy {
  display: grid;
  gap: 16px;
  max-width: 780px;
}

.scenic-hero__copy :deep(.page-title),
.scenic-hero__copy :deep(.page-subtitle),
.scenic-hero__copy :deep(.display-quote) {
  color: inherit;
}

.scenic-hero__meta {
  color: rgba(255, 243, 225, 0.76);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scenic-hero__ledger {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.scenic-hero__fact {
  display: grid;
  gap: 6px;
  padding: 16px 0 0;
  border-top: 1px solid rgba(255, 243, 225, 0.18);
}

.scenic-hero__fact span {
  color: rgba(255, 243, 225, 0.66);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scenic-hero__fact strong {
  font-size: 15px;
  line-height: 1.6;
}

.scenic-dossier__main,
.scenic-dossier__side {
  display: grid;
  gap: 18px;
}

.scenic-dossier__block {
  display: grid;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--border-subtle);
}

.scenic-dossier__block h3,
.scenic-route__node-copy strong {
  margin: 0;
  font-family: var(--font-family-display);
}

.scenic-dossier__block h3 {
  font-size: clamp(1.8rem, 2.8vw, 2.6rem);
  line-height: 1.08;
}

.scenic-dossier__block p,
.scenic-dossier__note p,
.scenic-gallery__item figcaption,
.scenic-route__handoff p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.9;
}

.scenic-dossier__note {
  padding: 22px;
}

.scenic-gallery {
  display: grid;
  gap: 24px;
}

.scenic-gallery__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.scenic-gallery__item {
  grid-column: span 4;
  display: grid;
  gap: 10px;
}

.scenic-gallery__item--lead {
  grid-column: span 6;
}

.scenic-gallery__item img {
  display: block;
  width: 100%;
  height: 320px;
  object-fit: cover;
  border-radius: 28px;
  box-shadow: var(--shadow-card);
}

.scenic-route {
  display: grid;
  gap: 24px;
}

.scenic-route__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.scenic-route__node {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 28px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.scenic-route__node-image {
  min-height: 240px;
}

.scenic-route__node-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scenic-route__node-copy {
  display: grid;
  gap: 8px;
}

.scenic-route__node-copy span {
  color: var(--color-accent);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scenic-route__node-copy strong {
  font-size: 1.6rem;
  line-height: 1.08;
}

.scenic-route__node-copy small {
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.scenic-route__handoff {
  display: grid;
  gap: 14px;
  padding: 22px;
}

.scenic-route__handoff-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
}

@media (max-width: 1023px) {
  .scenic-hero,
  .scenic-hero__overlay {
    min-height: min(72vh, 720px);
  }

  .scenic-hero__overlay {
    gap: 24px;
    padding: 32px;
  }

  .scenic-hero__ledger,
  .scenic-gallery__grid {
    grid-template-columns: 1fr 1fr;
  }

  .scenic-gallery__item,
  .scenic-gallery__item--lead,
  .scenic-route__grid {
    grid-column: auto;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .scenic-dossier__nav {
    display: grid;
    gap: 6px;
  }

  .scenic-hero,
  .scenic-hero__overlay {
    min-height: 62svh;
    border-radius: 32px;
  }

  .scenic-hero__overlay,
  .scenic-dossier__note,
  .scenic-route__handoff {
    padding: 22px;
  }

  .scenic-hero__overlay {
    gap: 16px;
  }

  .scenic-hero__copy {
    gap: 12px;
  }

  .scenic-hero__copy :deep(.page-title) {
    font-size: clamp(2.7rem, 12vw, 4rem);
  }

  .scenic-hero__copy :deep(.page-subtitle),
  .scenic-hero__copy :deep(.display-quote) {
    line-height: 1.7;
  }

  .scenic-hero__ledger,
  .scenic-gallery__grid {
    grid-template-columns: 1fr;
  }

  .scenic-hero__ledger {
    gap: 10px;
  }

  .scenic-hero__fact {
    padding-top: 12px;
  }

  .scenic-hero__fact strong {
    font-size: 14px;
    line-height: 1.55;
  }

  .scenic-gallery__item img,
  .scenic-route__node-image {
    min-height: 210px;
  }

  .scenic-route__node {
    padding: 14px;
  }
}

@media (max-width: 549px) {
  .scenic-hero,
  .scenic-hero__overlay {
    min-height: 58svh;
    border-radius: 28px;
  }

  .scenic-hero__overlay,
  .scenic-dossier__note,
  .scenic-route__handoff {
    padding: 16px;
  }

  .scenic-hero__meta,
  .scenic-hero__fact span,
  .scenic-route__node-copy span {
    letter-spacing: 0.06em;
  }

  .scenic-hero__copy {
    gap: 10px;
  }

  .scenic-hero__copy :deep(.page-title) {
    font-size: clamp(2.35rem, 11vw, 3.25rem);
  }

  .scenic-hero__copy :deep(.page-subtitle),
  .scenic-hero__copy :deep(.display-quote) {
    font-size: 0.95rem;
    line-height: 1.62;
  }

  .scenic-gallery,
  .scenic-route {
    gap: 18px;
  }

  .scenic-gallery__item img,
  .scenic-route__node-image {
    min-height: 188px;
  }

  .scenic-route__node {
    gap: 12px;
    padding: 12px;
    border-radius: 22px;
  }

  .scenic-route__node-copy strong {
    font-size: 1.38rem;
  }
}
</style>
