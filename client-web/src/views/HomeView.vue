<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getHomeApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import {
  getNarrativeImage,
  getNarrativeQuote,
  getThemeEntries,
  pickNarrativeText,
  siteManifesto
} from '../utils/immersive-content';
import { createSceneMotion, createSceneReveals } from '../utils/scene-motion';

const rootRef = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const homeData = ref({
  recommends: {
    scenic: [],
    food: [],
    heritage: [],
    redCulture: []
  }
});

let cleanupMotion = () => {};

const heroData = computed(() => {
  const hero = homeData.value.hero || {};

  return {
    title: pickNarrativeText(hero.title, siteManifesto.title),
    subtitle: pickNarrativeText(hero.subtitle, siteManifesto.subtitle),
    image: hero.image || '/immersive/hero/P0-01_AncientWall_official_03.jpg',
    note: pickNarrativeText(
      hero.note,
      '先感到赣州的气质，再进入章节、地方与 AI 导览。'
    ),
    primaryAction: hero.primaryAction || {
      label: '进入景点图谱',
      path: '/scenic'
    },
    secondaryAction: hero.secondaryAction || {
      label: '向 AI 导览员提问',
      path: '/ai-chat'
    }
  };
});

const chapterEntries = computed(() => getThemeEntries(homeData.value));
const apertureLead = computed(() => chapterEntries.value[0] || null);
const apertureTrail = computed(() => chapterEntries.value.slice(1, 3));

const featuredScenic = computed(() => {
  const items = Array.isArray(homeData.value.featuredScenic) && homeData.value.featuredScenic.length
    ? homeData.value.featuredScenic
    : homeData.value.recommends?.scenic || [];

  return items.slice(0, 5);
});

const leadScenic = computed(() => featuredScenic.value[0] || null);
const scenicTrail = computed(() => featuredScenic.value.slice(1, 4));

const curatedArticles = computed(() => {
  if (Array.isArray(homeData.value.curatedArticles) && homeData.value.curatedArticles.length) {
    return homeData.value.curatedArticles.map((item) => ({
      ...item,
      basePath: item.path?.replace(/\/\d+$/, '') || item.basePath || '/food'
    }));
  }

  const sources = [
    { basePath: '/food', items: homeData.value.recommends?.food || [] },
    { basePath: '/heritage', items: homeData.value.recommends?.heritage || [] },
    { basePath: '/red-culture', items: homeData.value.recommends?.redCulture || [] }
  ];

  return sources
    .flatMap((source) => source.items.slice(0, 2).map((item) => ({ ...item, basePath: source.basePath })))
    .slice(0, 4);
});

const readingLead = computed(() => curatedArticles.value[0] || null);
const readingTrail = computed(() => curatedArticles.value.slice(1, 4));

const guideEntry = computed(() => {
  const entry = homeData.value.aiEntry || {};

  return {
    title: pickNarrativeText(
      entry.title,
      'AI 不在站外，它就在这部长卷里面继续带路。'
    ),
    description: pickNarrativeText(
      entry.description,
      '问答像导览员，路线像工作室，把你已经看到的内容继续整理成清晰的路径。'
    ),
    chatPath: entry.chatPath || '/ai-chat',
    tripPath: entry.tripPath || '/ai-trip'
  };
});

const epilogue = computed(() => {
  const value = homeData.value.epilogue || {};

  return {
    title: pickNarrativeText(
      value.title,
      '这不是把内容更整齐地摆出来，而是把进入赣州的方式重新编排。'
    ),
    description: pickNarrativeText(value.description, siteManifesto.subtitle)
  };
});

async function loadHomeData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getHomeApi();
    homeData.value = response.data || homeData.value;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '首页数据加载失败，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function resolveScenicImage(item) {
  const image = item?.media?.coverImage || getNarrativeImage(item, 'scenic') || item?.coverImage;
  return resolveAssetUrl(image, item?.name || '赣州地方线索');
}

function resolveArticleImage(item) {
  const image = item?.media?.coverImage || getNarrativeImage(item, 'article') || item?.coverImage;
  return resolveAssetUrl(image, item?.title || '赣州专题');
}

function resolveArticleLink(item) {
  if (item?.path) {
    return item.path;
  }

  return `${item.basePath || '/food'}/${item.id}`;
}

function resolveChapterImage(item) {
  return resolveAssetUrl(
    item?.heroImage || item?.leadItem?.media?.coverImage || item?.leadItem?.coverImage,
    item?.chapterLabel || '赣州章节'
  );
}

function setupMotion() {
  cleanupMotion();

  if (!rootRef.value || loading.value) {
    return;
  }

  cleanupMotion = createSceneMotion(rootRef.value, ({ gsap, ScrollTrigger }) => {
    gsap
      .timeline({
        defaults: {
          ease: 'power3.out'
        }
      })
      .from('.home-hero__media img', { scale: 1.08, duration: 1.6 }, 0)
      .from('.home-hero__copy > *', { autoAlpha: 0, y: 28, stagger: 0.08, duration: 0.9 }, 0.16)
      .from('.home-hero__threshold > *', { autoAlpha: 0, y: 22, stagger: 0.08, duration: 0.8 }, 0.32);

    createSceneReveals({
      gsap,
      ScrollTrigger,
      sceneSelector: '.home-scene',
      y: 30,
      duration: 0.82
    });

    const leadPanel = rootRef.value.querySelector('.home-aperture__lead');
    if (leadPanel) {
      ScrollTrigger.create({
        trigger: '.home-aperture',
        start: 'top center',
        end: 'bottom top',
        scrub: true,
        onUpdate: ({ progress }) => {
          gsap.to(leadPanel, {
            y: progress * -38,
            duration: 0.2,
            overwrite: true
          });
        }
      });
    }
  });
}

watch(loading, async (value) => {
  if (!value) {
    await nextTick();
    setupMotion();
  }
});

onMounted(loadHomeData);

onBeforeUnmount(() => {
  cleanupMotion();
});
</script>

<template>
  <SiteLayout>
    <div ref="rootRef" class="home-page">
      <div v-if="errorMessage" class="page-feedback">
        <el-alert :title="errorMessage" type="error" show-icon :closable="false" />
      </div>
      <div v-if="errorMessage" class="page-feedback page-feedback--actions">
        <el-button @click="loadHomeData">重新加载</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="12" animated class="page-skeleton" />

      <template v-else>
        <section class="home-hero">
          <div class="home-hero__media">
            <img :src="resolveAssetUrl(heroData.image, heroData.title)" :alt="heroData.title" />
          </div>
          <div class="home-hero__veil"></div>

          <div class="home-hero__inner">
            <div class="home-hero__copy">
              <div class="chapter-mark">Opening Sequence</div>
              <div class="home-hero__brand">Ganzhou Scroll</div>
              <h1 class="home-hero__title">{{ heroData.title }}</h1>
              <p class="home-hero__subtitle">{{ heroData.subtitle }}</p>

              <div class="home-hero__actions">
                <router-link class="home-hero__button home-hero__button--primary" :to="heroData.primaryAction.path">
                  {{ heroData.primaryAction.label }}
                </router-link>
                <router-link class="home-hero__button" :to="heroData.secondaryAction.path">
                  {{ heroData.secondaryAction.label }}
                </router-link>
              </div>
            </div>

            <div class="home-hero__threshold">
              <div class="line-label">进入方式</div>
              <p>{{ heroData.note }}</p>

              <div class="home-hero__threshold-meta">
                <span>{{ chapterEntries.length }} 章叙事入口</span>
                <span>{{ featuredScenic.length }} 条地方线索</span>
              </div>

              <router-link
                v-if="leadScenic"
                class="home-hero__threshold-link"
                :to="`/scenic/${leadScenic.id}`"
              >
                <strong>{{ leadScenic.name }}</strong>
                <small>{{ pickNarrativeText(leadScenic.routeLabel, '从一个地方开始建立印象') }}</small>
              </router-link>
            </div>
          </div>
        </section>

        <section class="home-aperture section-inner--wide home-scene">
          <div class="section-copy" data-reveal>
            <span class="section-eyebrow">Three Entrances</span>
            <h2 class="section-title">这不是三个栏目，而是三种进入赣州的方式。</h2>
            <p class="section-desc">
              每一章都应该有自己的画面、节奏和阅读姿态，而不是继续共用同一种模板。
            </p>
          </div>

          <div class="home-aperture__grid">
            <router-link
              v-if="apertureLead"
              :to="apertureLead.path"
              class="home-aperture__lead media-node"
              data-reveal
            >
              <img :src="resolveChapterImage(apertureLead)" :alt="apertureLead.chapterLabel" />
              <div class="home-aperture__overlay">
                <div class="chapter-mark">{{ apertureLead.chapterNo }}</div>
                <h3>{{ apertureLead.chapterLabel }}</h3>
                <p>{{ pickNarrativeText(apertureLead.heroCaption, '进入这一章的主视角。') }}</p>
                <span>{{ pickNarrativeText(apertureLead.routeLabel, '章节入口') }}</span>
              </div>
            </router-link>

            <div class="home-aperture__stack">
              <router-link
                v-for="item in apertureTrail"
                :key="item.path"
                :to="item.path"
                class="home-aperture__card"
                data-reveal
              >
                <div class="home-aperture__card-media media-node">
                  <img :src="resolveChapterImage(item)" :alt="item.chapterLabel" />
                </div>
                <div class="home-aperture__card-copy">
                  <div class="line-label">{{ item.chapterNo }}</div>
                  <h3>{{ item.chapterLabel }}</h3>
                  <p>{{ pickNarrativeText(item.heroCaption, '沿着这道章节视角继续进入。') }}</p>
                </div>
              </router-link>
            </div>
          </div>
        </section>

        <section v-if="leadScenic" class="home-locus section-inner--wide home-scene">
          <router-link class="home-locus__media media-node" :to="`/scenic/${leadScenic.id}`" data-reveal>
            <img
              :src="resolveScenicImage(leadScenic)"
              :alt="leadScenic.name"
              @error="(event) => applyImageFallback(event, leadScenic.name)"
            />
          </router-link>

          <div class="home-locus__copy">
            <div data-reveal>
              <span class="section-eyebrow">One Place First</span>
              <h2 class="section-title">{{ leadScenic.name }}</h2>
              <p class="section-desc">
                {{ pickNarrativeText(leadScenic.heroCaption, leadScenic.intro || '先记住一个地方，再慢慢打开赣州。') }}
              </p>
            </div>

            <blockquote class="display-quote" data-reveal>
              “{{ getNarrativeQuote(leadScenic, 'scenic') || '一个地方先成立，后面的阅读才会变得有重量。' }}”
            </blockquote>

            <div class="home-locus__facts" data-reveal>
              <span>{{ pickNarrativeText(leadScenic.region, '赣州') }}</span>
              <span>{{ pickNarrativeText(leadScenic.categoryName, '地方线索') }}</span>
              <span>{{ pickNarrativeText(leadScenic.routeLabel, '从这里开始') }}</span>
            </div>

            <div v-if="scenicTrail.length" class="home-locus__trail" data-reveal>
              <router-link
                v-for="item in scenicTrail"
                :key="item.id"
                :to="`/scenic/${item.id}`"
                class="home-locus__trail-item"
              >
                <strong>{{ item.name }}</strong>
                <small>{{ pickNarrativeText(item.routeLabel, item.region || '继续沿着地方线索走') }}</small>
              </router-link>
            </div>
          </div>
        </section>

        <section class="home-guide section-inner home-scene">
          <div class="home-guide__panel" data-reveal>
            <div class="home-guide__copy">
              <div class="chapter-mark chapter-mark--dark">Guide Room</div>
              <h2 class="section-title">{{ guideEntry.title }}</h2>
              <p class="section-desc">{{ guideEntry.description }}</p>
            </div>

            <div class="home-guide__doors">
              <router-link class="home-guide__door" :to="guideEntry.chatPath">
                <span>随行讲解员</span>
                <strong>继续追问、继续解释、继续串联。</strong>
              </router-link>
              <router-link class="home-guide__door" :to="guideEntry.tripPath">
                <span>路线工作室</span>
                <strong>把兴趣、天数与节奏整理成可展示的路线长卷。</strong>
              </router-link>
            </div>
          </div>
        </section>

        <section v-if="readingLead" class="home-reading section-inner--wide home-scene">
          <div class="section-copy" data-reveal>
            <span class="section-eyebrow">Reading Rail</span>
            <h2 class="section-title">继续读，不急着退出。</h2>
            <p class="section-desc">让条目像展品一样继续排开，把地方理解慢慢做厚。</p>
          </div>

          <div class="home-reading__layout">
            <router-link class="home-reading__lead media-node" :to="resolveArticleLink(readingLead)" data-reveal>
              <img
                :src="resolveArticleImage(readingLead)"
                :alt="readingLead.title"
                @error="(event) => applyImageFallback(event, readingLead.title)"
              />
              <div class="home-reading__lead-copy">
                <div class="line-label">
                  {{ pickNarrativeText(readingLead.categoryName, readingLead.subtitle || '专题阅读') }}
                </div>
                <h3>{{ readingLead.title }}</h3>
                <p>
                  {{ pickNarrativeText(readingLead.quote, readingLead.summary || '沿着这一章继续往下读。') }}
                </p>
              </div>
            </router-link>

            <div class="home-reading__trail">
              <router-link
                v-for="item in readingTrail"
                :key="item.id"
                :to="resolveArticleLink(item)"
                class="home-reading__trail-item"
                data-reveal
              >
                <div class="home-reading__trail-image media-node">
                  <img
                    :src="resolveArticleImage(item)"
                    :alt="item.title"
                    @error="(event) => applyImageFallback(event, item.title)"
                  />
                </div>
                <div class="home-reading__trail-copy">
                  <span>{{ pickNarrativeText(item.categoryName, item.subtitle || '专题阅读') }}</span>
                  <strong>{{ item.title }}</strong>
                  <small>{{ pickNarrativeText(item.summary, '继续沿着这条主题带往下走。') }}</small>
                </div>
              </router-link>
            </div>
          </div>
        </section>

        <section class="home-epilogue section-inner home-scene">
          <div class="home-epilogue__panel" data-reveal>
            <div class="chapter-mark chapter-mark--dark">Closing Frame</div>
            <h2>{{ epilogue.title }}</h2>
            <p>{{ epilogue.description }}</p>
            <router-link class="editorial-link" to="/about">阅读策展附记</router-link>
          </div>
        </section>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: clamp(56px, 8vw, 88px);
  padding-bottom: clamp(88px, 10vw, 132px);
}

.home-hero {
  position: relative;
  width: 100vw;
  margin-top: -104px;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  min-height: 100svh;
  overflow: hidden;
  background: #11161b;
}

.home-hero__media,
.home-hero__media img,
.home-hero__veil {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.home-hero__media img {
  object-fit: cover;
}

.home-hero__veil {
  background:
    linear-gradient(90deg, rgba(10, 13, 17, 0.86) 0%, rgba(10, 13, 17, 0.54) 34%, rgba(10, 13, 17, 0.18) 66%, rgba(10, 13, 17, 0.24) 100%),
    linear-gradient(180deg, rgba(10, 13, 17, 0.12) 0%, rgba(10, 13, 17, 0.2) 38%, rgba(10, 13, 17, 0.82) 100%);
}

.home-hero__inner {
  position: relative;
  z-index: 1;
  width: min(100%, calc(var(--container-page) + (var(--page-gutter-current) * 2)));
  min-height: 100svh;
  margin: 0 auto;
  padding:
    clamp(128px, 16vh, 168px)
    var(--page-gutter-current)
    clamp(34px, 6vh, 52px);
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(280px, 0.52fr);
  gap: 28px;
  align-content: end;
  color: #f9f0e1;
}

.home-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 760px;
}

.home-hero__brand {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: rgba(249, 240, 225, 0.72);
}

.home-hero__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(56px, 8vw, 112px);
  line-height: 0.98;
  letter-spacing: var(--tracking-tight-2);
}

.home-hero__subtitle {
  margin: 0;
  max-width: 30em;
  font-size: clamp(17px, 1.9vw, 21px);
  line-height: 1.9;
  color: rgba(249, 240, 225, 0.88);
}

.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
}

.home-hero__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  border: 1px solid rgba(249, 240, 225, 0.18);
  background: rgba(249, 240, 225, 0.08);
  color: inherit;
  font-weight: 600;
  transition:
    transform var(--transition-base),
    background-color var(--transition-base),
    border-color var(--transition-base);
}

.home-hero__button:hover {
  transform: translateY(-2px);
}

.home-hero__button--primary {
  background: rgba(249, 240, 225, 0.96);
  color: var(--color-text-primary);
}

.home-hero__threshold {
  align-self: end;
  display: grid;
  gap: 14px;
  padding: 18px 0 2px;
  border-top: 1px solid rgba(249, 240, 225, 0.18);
}

.home-hero__threshold p,
.home-hero__threshold strong,
.home-hero__threshold small {
  margin: 0;
}

.home-hero__threshold p {
  line-height: 1.9;
  color: rgba(249, 240, 225, 0.82);
}

.home-hero__threshold-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: rgba(249, 240, 225, 0.66);
  font-size: 13px;
}

.home-hero__threshold-link {
  display: grid;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(249, 240, 225, 0.1);
  color: inherit;
}

.home-hero__threshold-link strong {
  font-size: 15px;
}

.home-hero__threshold-link small {
  color: rgba(249, 240, 225, 0.7);
  line-height: 1.75;
}

.home-aperture,
.home-locus,
.home-guide,
.home-reading,
.home-epilogue {
  display: grid;
  gap: 26px;
}

.home-aperture__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.66fr);
  gap: 22px;
}

.home-aperture__lead {
  min-height: 720px;
}

.home-aperture__lead img,
.home-reading__lead img,
.home-locus__media img,
.home-aperture__card-media img,
.home-reading__trail-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-aperture__overlay {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 14px;
  padding: 28px 28px 32px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(10, 13, 17, 0), rgba(10, 13, 17, 0.82));
}

.home-aperture__overlay h3,
.home-aperture__card-copy h3,
.home-reading__lead-copy h3,
.home-epilogue__panel h2 {
  margin: 0;
  font-family: var(--font-family-display);
}

.home-aperture__overlay h3 {
  font-size: clamp(38px, 4vw, 56px);
  line-height: 1.02;
}

.home-aperture__overlay p {
  margin: 0;
  max-width: 28rem;
  line-height: 1.85;
  color: rgba(255, 242, 222, 0.82);
}

.home-aperture__overlay span {
  color: rgba(255, 242, 222, 0.74);
  font-size: 13px;
}

.home-aperture__stack {
  display: grid;
  gap: 18px;
}

.home-aperture__card {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  padding: 16px;
  border-radius: 28px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.home-aperture__card-media {
  min-height: 220px;
}

.home-aperture__card-copy {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 6px 0;
}

.home-aperture__card-copy h3 {
  font-size: clamp(1.8rem, 2.4vw, 2.5rem);
  line-height: 1.08;
}

.home-aperture__card-copy p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

.home-locus {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.78fr);
  align-items: stretch;
}

.home-locus__media {
  min-height: 680px;
}

.home-locus__copy {
  display: grid;
  align-content: start;
  gap: 16px;
  padding-top: 10px;
}

.home-locus__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.home-locus__facts span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
  font-size: 13px;
}

.home-locus__trail {
  display: grid;
  gap: 12px;
  padding-top: 6px;
}

.home-locus__trail-item {
  display: grid;
  gap: 4px;
  padding: 14px 0;
  border-top: 1px solid var(--border-subtle);
}

.home-locus__trail-item strong,
.home-guide__door strong,
.home-reading__trail-copy strong {
  font-family: var(--font-family-display);
  line-height: 1.08;
}

.home-locus__trail-item strong {
  font-size: 1.5rem;
}

.home-locus__trail-item small {
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.home-guide__panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 24px;
  padding: 34px;
  border-radius: 34px;
  background: var(--surface-panel);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.home-guide__copy {
  display: grid;
  gap: 14px;
}

.home-guide__doors {
  display: grid;
  gap: 14px;
  align-content: start;
}

.home-guide__door {
  display: grid;
  gap: 8px;
  padding: 20px 0;
  border-top: 1px solid var(--border-subtle);
}

.home-guide__door:first-child {
  border-top: 0;
  padding-top: 0;
}

.home-guide__door span,
.home-reading__trail-copy span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.home-guide__door strong {
  font-size: 1.45rem;
}

.home-reading__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.72fr);
  gap: 22px;
}

.home-reading__lead {
  min-height: 620px;
}

.home-reading__lead-copy {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 10px;
  padding: 26px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(10, 13, 17, 0), rgba(10, 13, 17, 0.84));
}

.home-reading__lead-copy h3 {
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.04;
}

.home-reading__lead-copy p {
  margin: 0;
  max-width: 30rem;
  color: rgba(255, 242, 222, 0.84);
  line-height: 1.8;
}

.home-reading__trail {
  display: grid;
  gap: 16px;
}

.home-reading__trail-item {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  padding: 16px;
  border-radius: 26px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.home-reading__trail-image {
  min-height: 180px;
}

.home-reading__trail-copy {
  display: grid;
  align-content: start;
  gap: 8px;
}

.home-reading__trail-copy strong {
  font-size: 1.45rem;
}

.home-reading__trail-copy small {
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.home-epilogue__panel {
  display: grid;
  gap: 14px;
  padding: 32px;
  border-radius: 32px;
  background: rgba(255, 251, 245, 0.78);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.home-epilogue__panel h2 {
  font-size: clamp(2rem, 3.1vw, 3rem);
  line-height: 1.06;
}

.home-epilogue__panel p {
  margin: 0;
  max-width: 46rem;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

@media (max-width: 1180px) {
  .home-hero__inner,
  .home-aperture__grid,
  .home-locus,
  .home-guide__panel,
  .home-reading__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1023px) {
  .home-aperture__card,
  .home-reading__trail-item {
    grid-template-columns: 1fr;
  }

  .home-aperture__lead {
    min-height: 560px;
  }

  .home-locus__media,
  .home-reading__lead {
    min-height: 480px;
  }
}

@media (max-width: 743px) {
  .home-page {
    gap: 48px;
  }

  .home-hero {
    margin-top: -82px;
    min-height: 90svh;
  }

  .home-hero__inner {
    min-height: 90svh;
    padding-top: 120px;
    padding-bottom: 26px;
  }

  .home-hero__title {
    font-size: clamp(42px, 13vw, 64px);
  }

  .home-aperture__overlay,
  .home-guide__panel,
  .home-epilogue__panel {
    padding: 22px;
  }

  .home-aperture__lead,
  .home-locus__media,
  .home-reading__lead {
    min-height: 360px;
  }

  .home-aperture__card-media,
  .home-reading__trail-image {
    min-height: 220px;
  }
}
</style>
