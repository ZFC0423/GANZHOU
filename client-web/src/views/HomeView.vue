<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getHomeApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { Location } from '@element-plus/icons-vue';

const loading = ref(false);
const errorMessage = ref('');
const homeData = ref({
  siteName: '',
  siteDescription: '',
  banners: [],
  recommends: {
    scenic: [],
    food: [],
    heritage: [],
    redCulture: []
  }
});

const recommendedArticles = computed(() => {
  const articleGroups = [
    { items: homeData.value.recommends.food, detailBasePath: '/food' },
    { items: homeData.value.recommends.heritage, detailBasePath: '/heritage' },
    { items: homeData.value.recommends.redCulture, detailBasePath: '/red-culture' }
  ];
  const result = [];
  let itemIndex = 0;

  while (result.length < 4) {
    let addedInThisRound = false;

    articleGroups.forEach(({ items, detailBasePath }) => {
      const item = items[itemIndex];
      if (!item || result.length >= 4) {
        return;
      }

      result.push({
        ...item,
        detailPath: `${detailBasePath}/${item.id}`
      });
      addedInThisRound = true;
    });

    if (!addedInThisRound) {
      break;
    }

    itemIndex += 1;
  }

  return result;
});

async function loadHomeData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getHomeApi();
    homeData.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '主页数据加载失败，服务可能正在维护中。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

onMounted(loadHomeData);
</script>

<template>
  <SiteLayout>
    <div class="home-page">
      <div v-if="errorMessage" class="page-feedback">
        <el-alert :title="errorMessage" type="error" show-icon :closable="false" />
      </div>
      <div v-if="errorMessage" class="page-feedback page-feedback--actions">
        <el-button @click="loadHomeData">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="12" animated class="page-skeleton" />

      <template v-else>

        <!-- ========================================== -->
        <!-- 模块 1：非对称 Hero 首屏 -->
        <!-- ========================================== -->
        <section class="hero">
          <div class="hero__inner section-inner">
            <div class="hero__visual">
              <el-carousel
                v-if="homeData.banners.length"
                class="hero__carousel"
                height="100%"
                :interval="5000"
                arrow="never"
                indicator-position="none"
              >
                <el-carousel-item v-for="item in homeData.banners" :key="item.id">
                  <router-link :to="item.linkTarget || '/'" class="hero__visual-link">
                    <img
                      class="hero__visual-img"
                      :src="resolveAssetUrl(item.imageUrl, item.title)"
                      :alt="item.title"
                      @error="(event) => applyImageFallback(event, item.title)"
                    />
                    <div class="hero__visual-caption">
                      {{ item.title }}
                      <div class="hero__visual-caption-note">真实场景与主题化编排，共同构成赣州的城市记忆与旅行入口。</div>
                    </div>
                  </router-link>
                </el-carousel-item>
              </el-carousel>
              <div v-else class="hero__visual-placeholder">
                <span class="hero__visual-placeholder-text">当前内容已进入整理阶段，图片素材将随页面内容一并补齐。</span>
              </div>
            </div>

            <div class="hero__copy">
              <span class="hero__eyebrow">探索赣州</span>
              <h1 class="hero__title">从景点、主题与智慧导览进入赣州</h1>
              <p class="hero__desc">
                平台围绕赣州旅游资源、城市文化与智慧服务体验构建，帮助用户从浏览、阅读、问答与行程建议中，逐步建立更清晰的探索路径。
              </p>
              <div class="hero__cta">
                <router-link to="/scenic">
                  <el-button type="primary" size="large" round class="cta-primary">浏览精选景点</el-button>
                </router-link>
                <router-link to="/ai-chat">
                  <el-button size="large" round class="cta-ghost">开启智慧问答</el-button>
                </router-link>
              </div>
            </div>

            <div class="hero__ai-float">
              <div class="ai-float__dot"></div>
              <div class="ai-float__label">路线说明</div>
              <p class="ai-float__desc">从代表性景点进入城市线索，从主题阅读进入文化理解，从 AI 导览进入更高效的探索方式。</p>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 2：AI 智慧服务入口区 -->
        <!-- ========================================== -->
        <section class="ai-services">
          <div class="ai-services__inner section-inner">
            <div class="ai-services__header">
              <span class="section-eyebrow">智慧服务</span>
              <h2 class="section-title">让问题、路径与内容之间建立更自然的连接</h2>
              <p class="section-desc">AI 在这里不是替代浏览，而是帮助你更快理解景点、主题与行程线索。<br/>你可以从提问开始，也可以从一次参考性的导览路径开始。</p>
            </div>

            <div class="ai-services__grid">
              <router-link to="/ai-chat" class="ai-card ai-card--chat">
                <div class="ai-card__icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 class="ai-card__title">智慧问答</h3>
                <p class="ai-card__desc">
                  围绕赣州景点、文化主题与旅行问题，提供更直接的信息获取与解释辅助。
                </p>
                <span class="ai-card__action">开启智慧问答 →</span>
              </router-link>

              <router-link to="/ai-trip" class="ai-card ai-card--trip">
                <div class="ai-card__icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 class="ai-card__title">行程建议</h3>
                <p class="ai-card__desc">
                  根据出行天数、兴趣方向与节奏偏好，生成一份可参考的探索路径。
                </p>
                <span class="ai-card__action">获取行程建议 →</span>
              </router-link>
            </div>

            <div class="section-note section-note--center ai-services__note">
              所有结果均基于平台现有内容进行组织与辅助，适合用作浏览、理解与初步规划的参考。
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 3：精选探索区 -->
        <!-- ========================================== -->
        <section class="explore">
          <div class="explore__inner section-inner">
            <div class="explore__header">
              <span class="section-eyebrow">精选探索</span>
              <h2 class="section-title">从三个主题切口开始理解这座城市</h2>
              <p class="section-desc">如果你是第一次进入平台，建议先从主题切口开始。<br/>不同的主题，会带你进入不同的城市记忆、文化线索与旅行体验。</p>
            </div>

            <div class="explore__grid">
              <router-link to="/red-culture" class="explore-card explore-card--large">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.redCulture[0]"
                    :src="resolveAssetUrl(homeData.recommends.redCulture[0].coverImage, homeData.recommends.redCulture[0].title)"
                    :alt="homeData.recommends.redCulture[0]?.title"
                    @error="(event) => applyImageFallback(event, '红色文化')"
                  />
                  <div v-else class="explore-card__fallback explore-card__fallback--red"></div>
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">主题探索</span>
                  <h3 class="explore-card__title">红色文化</h3>
                  <p class="explore-card__desc">从真实历史地点与重要文化线索进入赣州在红色记忆中的位置。</p>
                  <span class="explore-card__link explore-card__link--large">进入主题 →</span>
                </div>
              </router-link>

              <router-link to="/heritage" class="explore-card">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.heritage[0]"
                    :src="resolveAssetUrl(homeData.recommends.heritage[0].coverImage, homeData.recommends.heritage[0].title)"
                    :alt="homeData.recommends.heritage[0]?.title"
                    @error="(event) => applyImageFallback(event, '非遗')"
                  />
                  <div v-else class="explore-card__fallback explore-card__fallback--heritage"></div>
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">主题探索</span>
                  <h3 class="explore-card__title">非遗与客家文化</h3>
                  <p class="explore-card__desc explore-card__desc--compact">从手艺、迁徙与地方生活方式中，理解赣州更深层的人文结构。</p>
                  <span class="explore-card__link">进入主题 →</span>
                </div>
              </router-link>

               <router-link to="/food" class="explore-card">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.food[0]"
                    :src="resolveAssetUrl(homeData.recommends.food[0].coverImage, homeData.recommends.food[0].title)"
                    :alt="homeData.recommends.food[0]?.title"
                    @error="(event) => applyImageFallback(event, '美食')"
                  />
                  <div v-else class="explore-card__fallback explore-card__fallback--food"></div>
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">主题探索</span>
                  <h3 class="explore-card__title">城市风味与老城体验</h3>
                  <p class="explore-card__desc explore-card__desc--compact">从地方风味、街区记忆与日常生活切面，进入更具温度的城市阅读路径。</p>
                  <span class="explore-card__link">进入主题 →</span>
                </div>
              </router-link>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 4：精选推荐内容区 -->
        <!-- ========================================== -->
        <section class="featured">
          <div class="featured__inner section-inner">
            <div class="featured-block">
              <div class="featured-block__header featured-block__header--stacked">
                <div>
                  <span class="section-eyebrow">推荐内容</span>
                  <h2 class="section-title">从代表性景点与内容节点开始浏览</h2>
                  <p class="section-desc featured-block__desc">如果你更希望从具体地点进入，平台会为你保留一条更直接的浏览路径。你可以先看代表性景点，再延伸到相关主题、文化线索与智慧服务。</p>
                </div>
              </div>

              <p class="featured-block__note">以下内容为平台当前阶段优先整理的代表性节点，适合作为浏览起点。</p>

              <el-empty v-if="!homeData.recommends.scenic.length" description="当前推荐内容仍在补充中。你可以先从专题探索或智慧服务入口继续浏览。" />

              <div class="featured-grid" v-else>
                <router-link
                  v-for="item in homeData.recommends.scenic.slice(0, 3)"
                  :key="item.id"
                  :to="`/scenic/${item.id}`"
                  class="featured-card"
                >
                  <div class="featured-card__img-box">
                    <img
                      :src="resolveAssetUrl(item.coverImage, item.name)"
                      :alt="item.name"
                      @error="(event) => applyImageFallback(event, item.name)"
                    />
                  </div>
                  <div class="featured-card__body">
                    <h3>{{ item.name }}</h3>
                    <p>{{ item.intro || '平台已按中文阅读路径进行整理与导览，适合作为进入主题的第一站。' }}</p>
                    <div class="featured-card__meta meta-row">
                      <span class="meta-region"><el-icon><Location /></el-icon> {{ item.region || '赣州' }}</span>
                      <span class="featured-card__link">查看详情</span>
                    </div>
                  </div>
                </router-link>
              </div>
            </div>

            <!-- 推荐文章 -->
            <div class="featured-block" v-if="homeData.recommends.food.length || homeData.recommends.heritage.length || homeData.recommends.redCulture.length">
              <div class="featured-grid featured-grid--articles">
                <router-link
                  v-for="item in recommendedArticles"
                  :key="item.id"
                  :to="item.detailPath"
                  class="article-card"
                >
                  <div class="article-card__img-box">
                    <img
                      :src="resolveAssetUrl(item.coverImage, item.title)"
                      :alt="item.title"
                      @error="(event) => applyImageFallback(event, item.title)"
                    />
                  </div>
                  <div class="article-card__body">
                    <span class="article-card__cat">相关主题</span>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || '从这里开始了解相关线索，可继续延伸到相关景点与内容。' }}</p>
                    <div class="article-card__link">
                      继续探索 →
                    </div>
                  </div>
                </router-link>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 5：平台价值说明区 -->
        <!-- ========================================== -->
        <section class="value">
          <div class="value__inner section-inner">
            <div class="value__header">
              <span class="section-eyebrow">平台定位</span>
              <h2 class="section-title">它不是只展示景点，也不仅是一个 AI 功能入口</h2>
              <p class="section-desc section-copy section-copy--center">平台尝试把主题化内容组织、景点浏览、文化解释与路径建议放在同一套探索系统中。<br/>用户既可以从内容进入，也可以从 AI 进入，再回到景点与主题继续阅读。</p>
            </div>
            <div class="value__grid">
              <div class="value-card">
                <div class="value-card__number">01</div>
                <h3>主题化组织</h3>
                <p>不只罗列内容，而是围绕文化主题建立更清晰的阅读入口。</p>
              </div>
              <div class="value-card">
                <div class="value-card__number">02</div>
                <h3>景点导览</h3>
                <p>不把景点当作孤立条目，而是让它们与主题、线索与后续探索建立关系。</p>
              </div>
              <div class="value-card">
                <div class="value-card__number">03</div>
                <h3>智慧辅助</h3>
                <p>AI 在这里承担解释与路径辅助的角色，帮助用户更高效地进入内容，而不是替代内容本身。</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 6：收束式 Pre-Footer -->
        <!-- ========================================== -->
        <section class="closing">
          <div class="closing__inner">
            <h2 class="closing__title">从一次浏览开始，逐步进入赣州</h2>
            <p class="closing__desc">你可以先看景点，也可以先从主题进入；<br/>如果已经有明确问题，也可以直接通过智慧服务继续探索。</p>
            <div class="closing__actions">
              <router-link to="/scenic">
                <el-button type="primary" size="large" round class="cta-primary">浏览精选景点</el-button>
              </router-link>
              <router-link to="/ai-chat">
                <el-button size="large" round class="closing__btn-ghost">开启智慧问答</el-button>
              </router-link>
            </div>
            <div class="section-note section-note--center closing__note">
              在内容、景点与智慧导览之间，建立一条属于你的探索路径。
            </div>
          </div>
        </section>

      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
/* ================================================
   通用节拍系统
   ================================================ */
.home-page {
  background: transparent;
}

.home-page .section-desc {
  max-width: 520px;
}

.section-more {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.section-more:hover {
  opacity: 0.75;
}

/* ================================================
   模块 1：非对称 Hero
   ================================================ */
.hero {
  padding: 0 var(--page-gutter-current);
  margin-bottom: 80px;
}

.hero__inner {
  padding-top: 40px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  grid-template-rows: auto auto;
  gap: 24px;
  animation: fadeIn 0.7s ease-out;
}

.hero__visual {
  grid-row: 1 / 3;
  border-radius: var(--radius-panel);
  overflow: hidden;
  background: var(--surface-muted);
  position: relative;
  height: 540px;
  min-height: 540px;
  box-shadow: var(--shadow-card);
}

.hero__carousel {
  height: 100%;
}

:deep(.hero__carousel .el-carousel__container),
:deep(.hero__carousel .el-carousel__item) {
  height: 100% !important;
}

.hero__visual-link {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
}

.hero__visual-img {
  width: 100%;
  height: 540px;
  object-fit: cover;
  transition: transform 0.8s ease;
}

.hero__visual-link:hover .hero__visual-img {
  transform: scale(1.03);
}

.hero__visual-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 48px 32px 28px;
  background: linear-gradient(180deg, transparent, rgba(34, 34, 34, 0.62));
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: var(--tracking-tight-1);
}

.hero__visual-caption-note {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 400;
  opacity: 0.8;
}

.hero__visual-placeholder {
  width: 100%;
  height: 100%;
  min-height: 540px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.12), transparent 35%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.96));
  color: var(--color-text-tertiary);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 4px;
}

.hero__visual-placeholder-text {
  padding: 20px;
  font-size: 15px;
  text-align: center;
}

.hero__copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 0;
}

.hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  color: var(--color-accent);
  margin-bottom: 16px;
  text-transform: uppercase;
}

.hero__title {
  font-size: 46px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.1;
  margin: 0 0 20px;
  letter-spacing: var(--tracking-tight-2);
}

.hero__desc {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: var(--line-loose);
  margin: 0 0 28px;
}

.hero__cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.cta-primary {
  padding: 0 36px;
  font-weight: 600;
  font-size: 15px;
}

.cta-ghost {
  padding: 0 28px;
  font-weight: 600;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-soft);
  color: var(--color-text-primary);
}

.cta-ghost:hover {
  border-color: var(--border-accent);
  color: var(--color-accent);
}

.hero__ai-float {
  background: rgba(255, 255, 255, 0.96);
  border-radius: var(--radius-card);
  padding: 24px 28px;
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(236, 231, 223, 0.9);
  position: relative;
}

.ai-float__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  position: absolute;
  top: 28px;
  right: 28px;
  animation: soft-pulse 2s infinite;
}

.ai-float__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.ai-float__desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.7;
}

.ai-float__link {
  font-size: 14px;
  font-weight: 600;
  color: var(--gz-brand-primary);
}

.ai-float__link:hover {
  opacity: 0.7;
}

/* ================================================
   模块 2：AI 智慧服务
   ================================================ */
.ai-services {
  padding: 0 var(--page-gutter-current);
  margin-bottom: 96px;
}

.ai-services__header {
  text-align: center;
  margin-bottom: 48px;
}

.ai-services__header .section-desc {
  margin: 0 auto;
}

.ai-services__note {
  margin-top: 32px;
}

.ai-services__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.ai-card {
  padding: 40px 36px;
  cursor: pointer;
}

.ai-card__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-badge);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.ai-card--chat .ai-card__icon {
  background: rgba(255, 56, 92, 0.1);
  color: var(--color-accent);
}

.ai-card--trip .ai-card__icon {
  background: rgba(34, 34, 34, 0.06);
  color: var(--color-text-primary);
}

.ai-card__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 12px;
  letter-spacing: var(--tracking-tight-1);
}

.ai-card__desc {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  margin: 0 0 24px;
  flex: 1;
}

.ai-card__action {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-accent);
}

/* ================================================
   模块 3：精选探索区（策展入口墙）
   ================================================ */
.explore {
  padding: 0 var(--page-gutter-current);
  margin-bottom: 96px;
}

.explore__header {
  margin-bottom: 40px;
}

.explore__grid {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  grid-template-rows: 260px 260px;
  gap: 20px;
}

.explore-card {
  position: relative;
  border-radius: var(--radius-panel);
  overflow: hidden;
  cursor: pointer;
  display: block;
  box-shadow: var(--shadow-card);
}

.explore-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #2f2424, #4a2e34);
}

.explore-card__bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
  transition: transform 0.6s ease, opacity 0.4s ease;
}

.explore-card:hover .explore-card__bg img {
  transform: scale(1.05);
  opacity: 0.55;
}

.explore-card__overlay {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28px 32px;
  color: #fff;
}

.explore-card__fallback {
  width: 100%;
  height: 100%;
}

.explore-card__fallback--red {
  background: linear-gradient(135deg, #553139, #8a3e4d);
}

.explore-card__fallback--heritage {
  background: linear-gradient(135deg, #2d2b33, #5b5146);
}

.explore-card__fallback--food {
  background: linear-gradient(135deg, #5f4335, #8d5c44);
}

.explore-card__tag {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  opacity: 0.8;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.explore-card__title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
  line-height: 1.2;
}

.explore-card__desc {
  font-size: 14px;
  margin: 0;
  opacity: 0.85;
  line-height: 1.6;
  max-width: 380px;
}

.explore-card__desc--compact {
  font-size: 13px;
}

.explore-card__link {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
}

.explore-card__link--large {
  margin-top: 16px;
  font-size: 14px;
}

.explore-card--large {
  grid-row: 1 / 3;
}

.explore-card--large .explore-card__title {
  font-size: 34px;
}

/* ================================================
   模块 4：精选推荐内容区
   ================================================ */
.featured {
  padding: 0 var(--page-gutter-current);
  margin-bottom: 96px;
}

.featured-block {
  margin-bottom: 64px;
}

.featured-block:last-child {
  margin-bottom: 0;
}

.featured-block__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 32px;
}

.featured-block__header--stacked {
  flex-direction: column;
  align-items: flex-start;
}

.featured-block__desc {
  margin-top: 12px;
  max-width: 600px;
}

.featured-block__note {
  margin: 0 0 24px;
  color: var(--color-text-secondary);
  font-size: var(--gz-text-md);
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.featured-grid--articles {
  grid-template-columns: repeat(4, 1fr);
}

.featured-card {
}

.featured-card__img-box {
  height: 200px;
}

.featured-card__body h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 10px;
  line-height: 1.35;
}

.featured-card__body p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
  flex: 1;
}

.featured-card__meta {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--gz-border-light);
  font-size: 13px;
  color: var(--gz-text-secondary);
}

.featured-card__link {
  color: var(--color-accent);
  font-weight: 600;
}

.meta-region {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 文章卡片 */
.article-card {
}

.article-card__img-box {
  height: 160px;
}

.article-card__cat {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 6px;
}

.article-card__body h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 8px;
  line-height: 1.35;
}

.article-card__body p {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.article-card__link {
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-accent);
  font-weight: 600;
  text-align: right;
}

/* ================================================
   模块 5：平台价值说明
   ================================================ */
.value {
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.88);
  border-top: 1px solid rgba(236, 231, 223, 0.92);
  border-bottom: 1px solid rgba(236, 231, 223, 0.92);
  margin-bottom: 0;
}

.value__header {
  text-align: center;
  margin-bottom: 56px;
}

.value__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
}

.value-card {
  text-align: center;
}

.value-card__number {
  font-size: 48px;
  font-weight: 800;
  color: rgba(255, 56, 92, 0.18);
  line-height: 1;
  margin-bottom: 20px;
}

.value-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

.value-card p {
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  margin: 0;
}

/* ================================================
   模块 6：收束区
   ================================================ */
.closing {
  padding: 96px 20px;
  text-align: center;
  background:
    radial-gradient(circle at top, rgba(255, 56, 92, 0.08), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.95));
}

.closing__inner {
  max-width: 640px;
  margin: 0 auto;
}

.closing__title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 16px;
  letter-spacing: var(--tracking-tight-2);
}

.closing__desc {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 36px;
  line-height: var(--line-loose);
}

.closing__actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.closing__note {
  margin-top: 24px;
  letter-spacing: 1px;
}

.closing__btn-ghost {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border-soft);
  color: var(--color-text-primary);
}

.closing__btn-ghost:hover {
  border-color: var(--border-accent);
  color: var(--color-accent);
}

/* ================================================
   响应式
   ================================================ */
@media (max-width: 1024px) {
  .hero__inner {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .hero__visual {
    height: 320px;
    grid-row: auto;
    min-height: 320px;
  }

  .hero__visual-img {
    height: 320px;
  }

  .hero__title {
    font-size: 36px;
  }

  .explore__grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 220px 220px;
  }

  .explore-card--large {
    grid-row: auto;
  }

  .explore-card--large .explore-card__title {
    font-size: 26px;
  }

  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .featured-grid--articles {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero__inner {
    padding-top: 20px;
  }

  .hero__visual {
    height: 280px;
    min-height: 280px;
  }

  .hero__visual-img {
    height: 280px;
  }

  .hero__visual-placeholder {
    min-height: 280px;
  }

  .hero__title {
    font-size: 30px;
  }

  .hero {
    margin-bottom: 48px;
  }

  .ai-services__grid {
    grid-template-columns: 1fr;
  }

  .ai-card {
    padding: 28px 24px;
  }

  .ai-services,
  .explore,
  .featured {
    margin-bottom: 64px;
  }

  .explore__grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 200px);
  }

  .featured-grid,
  .featured-grid--articles {
    grid-template-columns: 1fr;
  }

  .value__grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .value {
    padding: 56px 20px;
  }

  .closing {
    padding: 56px 20px;
  }

  .closing__title {
    font-size: 26px;
  }

  .closing__actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .closing__actions .el-button {
    width: 100%;
    max-width: 280px;
  }
}
</style>
