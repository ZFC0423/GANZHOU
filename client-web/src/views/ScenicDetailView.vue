<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getScenicDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import {
  getNarrativeQuote,
  getScenicGallery,
  getScenicMeta,
  pickNarrativeText
} from '../utils/immersive-content';
import { createSceneMotion, createSceneReveals } from '../utils/scene-motion';

const route = useRoute();
const rootRef = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

let cleanupMotion = () => {};

const scenicMeta = computed(() => getScenicMeta(detail.value?.id));

const heroData = computed(() => {
  const value = detail.value || {};

  return {
    title: value.name || '赣州地方线索',
    region: pickNarrativeText(value.region, '赣州'),
    category: pickNarrativeText(value.categoryName, '地方 dossier'),
    intro: pickNarrativeText(
      value.intro,
      scenicMeta.value.heroCaption || '先让地方成立，再让信息慢慢跟上。'
    ),
    quote: getNarrativeQuote(value, 'scenic') || '先记住这个地方，再去理解它与赣州的关系。',
    image: value.media?.coverImage || scenicMeta.value.heroImage || value.coverImage || '',
    caption: pickNarrativeText(value.media?.caption, scenicMeta.value.heroCaption || value.intro || '')
  };
});

const quickFacts = computed(() => {
  const facts = Array.isArray(detail.value?.quickFacts) && detail.value.quickFacts.length
    ? detail.value.quickFacts
    : [
        { label: 'Region', value: detail.value?.region || '赣州' },
        { label: 'Suggested Duration', value: detail.value?.suggestedDuration || detail.value?.visitMode || '按现场节奏停留' },
        { label: 'Opening Info', value: detail.value?.openTime || '以现场公告为准' },
        { label: 'Route Cue', value: detail.value?.routeLabel || scenicMeta.value.routeLabel || '继续沿着地方线索走' }
      ];

  const labelMap = {
    Region: '所在区域',
    'Suggested Duration': '建议停留',
    'Opening Info': '开放信息',
    'Route Cue': '路线线索'
  };

  return facts.map((item) => ({
    label: labelMap[item.label] || item.label,
    value: item.value
  }));
});

const dossierSections = computed(() => {
  const serviceSections = Array.isArray(detail.value?.dossierSections)
    ? detail.value.dossierSections.filter((item) => item?.content)
    : [];

  if (serviceSections.length) {
    return serviceSections.map((item) => ({
      kicker: pickNarrativeText(item.kicker, 'Dossier'),
      title: pickNarrativeText(item.title, '地方叙事'),
      content: item.content
    }));
  }

  return [
    {
      kicker: 'Arrival',
      title: '先抵达这处地方',
      content: pickNarrativeText(detail.value?.intro, '当前暂无地点概览内容。')
    },
    {
      kicker: 'Context',
      title: '再理解它的文化与历史层',
      content: pickNarrativeText(detail.value?.cultureDesc, '当前暂无更深入的文化背景说明。')
    },
    {
      kicker: 'Route',
      title: '最后安排行进、停留与观看方式',
      content: pickNarrativeText(
        detail.value?.trafficGuide,
        pickNarrativeText(detail.value?.tips, '建议结合天气、步行强度和现场公告灵活调整。')
      )
    }
  ].filter((item) => item.content);
});

const sidebarNotes = computed(() => {
  const notes = [
    {
      label: '路线线索',
      content: pickNarrativeText(detail.value?.routeLabel, scenicMeta.value.routeLabel || '从当前地点继续进入地方叙事。')
    },
    {
      label: '最佳时段',
      content: pickNarrativeText(detail.value?.bestLightTime, detail.value?.openTime || '白天更适合建立空间印象。')
    },
    {
      label: '停留方式',
      content: pickNarrativeText(detail.value?.visitMode, detail.value?.suggestedDuration || '按现场节奏漫游停留。')
    },
    {
      label: '建议季节',
      content: pickNarrativeText(detail.value?.bestVisitSeason, '四季皆宜。')
    }
  ];

  return notes.filter((item) => item.content);
});

const servicePanels = computed(() => {
  const panels = [
    {
      label: '门票与开放',
      content: pickNarrativeText(detail.value?.ticketInfo, '当前暂无门票信息。')
    },
    {
      label: '地址',
      content: pickNarrativeText(detail.value?.address, '当前暂无详细地址。')
    },
    {
      label: '出行提示',
      content: pickNarrativeText(detail.value?.tips, '建议结合天气、体力和现场公告灵活安排。'),
      muted: true
    }
  ];

  return panels.filter((item) => item.content);
});

const gallerySequence = computed(() => {
  const raw = Array.isArray(detail.value?.gallerySequence) && detail.value.gallerySequence.length
    ? detail.value.gallerySequence
    : getScenicGallery(detail.value).map((image) => ({ image }));

  const captions = [
    heroData.value.caption || '建立场域的首图。',
    '补充空间关系，让地点的结构更加具体。',
    '把观看重心收窄到细节，让记忆停住。',
    '把这处地方的气口留给最后一张图。'
  ];

  return raw.slice(0, 4).map((item, index) => ({
    src: resolveAssetUrl(item.image || item.src || item, heroData.value.title),
    caption: pickNarrativeText(item.caption, captions[index] || captions[captions.length - 1])
  }));
});

const routeNodes = computed(() => {
  const items = Array.isArray(detail.value?.routeBridge) && detail.value.routeBridge.length
    ? detail.value.routeBridge
    : detail.value?.relatedList || [];

  return items.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title || item.name,
    subtitle: pickNarrativeText(item.routeLabel, item.region || '继续沿着地方线索走'),
    summary: pickNarrativeText(item.heroCaption, item.intro || '从这里继续打开更完整的空间关系。'),
    image: item.media?.coverImage || item.coverImage || '',
    path: item.path || `/scenic/${item.id}`
  }));
});

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

  cleanupMotion = createSceneMotion(rootRef.value, ({ gsap, ScrollTrigger }) => {
    gsap
      .timeline({
        defaults: {
          ease: 'power3.out'
        }
      })
      .from('.scenic-hero__media img', { scale: 1.08, duration: 1.5 }, 0)
      .from('.scenic-hero__copy > *', { autoAlpha: 0, y: 26, stagger: 0.08, duration: 0.86 }, 0.16)
      .from('.scenic-hero__ledger > *', { autoAlpha: 0, y: 18, stagger: 0.06, duration: 0.74 }, 0.3);

    createSceneReveals({
      gsap,
      ScrollTrigger,
      sceneSelector: '.scenic-scene'
    });

    ScrollTrigger.create({
      trigger: '.scenic-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: ({ progress }) => {
        gsap.to('.scenic-hero__media img', {
          yPercent: progress * 6,
          duration: 0.18,
          overwrite: true
        });
      }
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
  <SiteLayout>
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
                  :src="resolveAssetUrl(item.image, item.title)"
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
  </SiteLayout>
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
  }

  .scenic-hero,
  .scenic-hero__overlay {
    min-height: 74svh;
  }

  .scenic-hero__overlay,
  .scenic-dossier__note,
  .scenic-route__handoff {
    padding: 22px;
  }

  .scenic-hero__ledger,
  .scenic-gallery__grid {
    grid-template-columns: 1fr;
  }

  .scenic-gallery__item img,
  .scenic-route__node-image {
    min-height: 220px;
  }
}
</style>
