<script setup>
import { onMounted, ref } from 'vue';
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
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin: 24px auto; max-width: 1180px;" />
      <div v-if="errorMessage" style="margin: 0 auto 24px; max-width: 1180px; padding: 0 20px;">
        <el-button @click="loadHomeData">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="12" animated style="max-width: 1180px; margin: 0 auto; padding: 32px 20px;" />

      <template v-else>

        <!-- ========================================== -->
        <!-- 模块 1：非对称 Hero 首屏 -->
        <!-- ========================================== -->
        <section class="hero">
          <div class="hero__inner">
            <!-- 主图区 -->
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
                    <div class="hero__visual-caption">{{ item.title }}</div>
                  </router-link>
                </el-carousel-item>
              </el-carousel>
              <div v-else class="hero__visual-placeholder">
                <span>赣州 · 千年宋城</span>
              </div>
            </div>

            <!-- 主文案块 -->
            <div class="hero__copy">
              <span class="hero__eyebrow">赣州市旅游文化智慧服务平台</span>
              <h1 class="hero__title">发现赣州<br/>阅读一座城</h1>
              <p class="hero__desc">
                从宋城古韵到客家山水，从红色故都到非遗匠心。<br/>
                这里汇聚千年文脉与智能导览，为您开启一场有温度的文旅探索。
              </p>
              <div class="hero__cta">
                <router-link to="/scenic">
                  <el-button type="primary" size="large" round class="cta-primary">探索全景</el-button>
                </router-link>
                <router-link to="/ai-chat">
                  <el-button size="large" round class="cta-ghost">向 AI 提问</el-button>
                </router-link>
              </div>
            </div>

            <!-- AI 浮层入口 -->
            <div class="hero__ai-float">
              <div class="ai-float__dot"></div>
              <div class="ai-float__label">智慧服务</div>
              <p class="ai-float__desc">AI 导览已就绪，可随时问答或定制行程</p>
              <router-link to="/ai-trip" class="ai-float__link">定制行程 →</router-link>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 2：AI 智慧服务入口区 -->
        <!-- ========================================== -->
        <section class="ai-services">
          <div class="ai-services__inner">
            <div class="ai-services__header">
              <span class="section-eyebrow">核心能力</span>
              <h2 class="section-title">AI 智慧文旅服务</h2>
              <p class="section-desc">基于赣州本地文旅知识库，提供精准问答与个性化行程定制</p>
            </div>

            <div class="ai-services__grid">
              <router-link to="/ai-chat" class="ai-card ai-card--chat">
                <div class="ai-card__icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 class="ai-card__title">智能问答</h3>
                <p class="ai-card__desc">
                  关于赣州的风景、美食、文化、出行，向AI助手自由提问，获得基于本地知识库的专业解答。
                </p>
                <span class="ai-card__action">开始对话 →</span>
              </router-link>

              <router-link to="/ai-trip" class="ai-card ai-card--trip">
                <div class="ai-card__icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 class="ai-card__title">行程定制</h3>
                <p class="ai-card__desc">
                  设定天数、偏好与节奏，AI 为您量身编排多日赣州深度游行程，网罗沿途景点与特色体验。
                </p>
                <span class="ai-card__action">定制行程 →</span>
              </router-link>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 3：精选探索区（策展入口墙） -->
        <!-- ========================================== -->
        <section class="explore">
          <div class="explore__inner">
            <div class="explore__header">
              <span class="section-eyebrow">文化版图</span>
              <h2 class="section-title">精选探索</h2>
              <p class="section-desc">从四个维度感知赣州，每一条路径都通向不同的文脉深处</p>
            </div>

            <div class="explore__grid">
              <router-link to="/scenic" class="explore-card explore-card--large">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.scenic[0]"
                    :src="resolveAssetUrl(homeData.recommends.scenic[0].coverImage, homeData.recommends.scenic[0].name)"
                    :alt="homeData.recommends.scenic[0]?.name"
                    @error="(event) => applyImageFallback(event, '景点')"
                  />
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">景点导览</span>
                  <h3 class="explore-card__title">山水胜境</h3>
                  <p class="explore-card__desc">通天岩石窟、郁孤台、古浮桥……探索赣州最值得一去的名胜古迹</p>
                </div>
              </router-link>

              <router-link to="/food" class="explore-card explore-card--tall">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.food[0]"
                    :src="resolveAssetUrl(homeData.recommends.food[0].coverImage, homeData.recommends.food[0].title)"
                    :alt="homeData.recommends.food[0]?.title"
                    @error="(event) => applyImageFallback(event, '美食')"
                  />
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">地道美食</span>
                  <h3 class="explore-card__title">寻味客家</h3>
                  <p class="explore-card__desc">传世百年的客家经典与街巷地道小吃</p>
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
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">非遗传承</span>
                  <h3 class="explore-card__title">匠心守艺</h3>
                </div>
              </router-link>

              <router-link to="/red-culture" class="explore-card">
                <div class="explore-card__bg">
                  <img
                    v-if="homeData.recommends.redCulture[0]"
                    :src="resolveAssetUrl(homeData.recommends.redCulture[0].coverImage, homeData.recommends.redCulture[0].title)"
                    :alt="homeData.recommends.redCulture[0]?.title"
                    @error="(event) => applyImageFallback(event, '红色文化')"
                  />
                </div>
                <div class="explore-card__overlay">
                  <span class="explore-card__tag">红色记忆</span>
                  <h3 class="explore-card__title">薪火相传</h3>
                </div>
              </router-link>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 4：精选推荐内容区 -->
        <!-- ========================================== -->
        <section class="featured">
          <div class="featured__inner">
            <!-- 推荐景点 -->
            <div class="featured-block" v-if="homeData.recommends.scenic.length">
              <div class="featured-block__header">
                <div>
                  <span class="section-eyebrow">精选内容</span>
                  <h2 class="section-title">值得前往的目的地</h2>
                </div>
                <router-link to="/scenic" class="section-more">查看全部 →</router-link>
              </div>
              <div class="featured-grid">
                <router-link
                  v-for="item in homeData.recommends.scenic"
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
                    <p>{{ item.intro || '此处胜景，等您亲自探访。' }}</p>
                    <div class="featured-card__meta">
                      <span class="meta-region"><el-icon><Location /></el-icon> {{ item.region || '赣州' }}</span>
                    </div>
                  </div>
                </router-link>
              </div>
            </div>

            <!-- 推荐文章（美食+非遗+红色混合） -->
            <div class="featured-block" v-if="homeData.recommends.food.length || homeData.recommends.heritage.length || homeData.recommends.redCulture.length">
              <div class="featured-block__header">
                <div>
                  <h2 class="section-title">文旅专栏精选</h2>
                </div>
                <router-link to="/food" class="section-more">探索更多 →</router-link>
              </div>
              <div class="featured-grid featured-grid--articles">
                <router-link
                  v-for="item in [...homeData.recommends.food, ...homeData.recommends.heritage, ...homeData.recommends.redCulture].slice(0, 4)"
                  :key="item.id"
                  :to="`/${item.categoryCode === 'food' ? 'food' : item.categoryCode === 'heritage' ? 'heritage' : 'red-culture'}/${item.id}`"
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
                    <span class="article-card__cat">{{ item.categoryName }}</span>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || '精彩内容，待您翻阅。' }}</p>
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
          <div class="value__inner">
            <div class="value__header">
              <h2 class="section-title">为什么选择本平台</h2>
            </div>
            <div class="value__grid">
              <div class="value-card">
                <div class="value-card__number">01</div>
                <h3>文化内容整合</h3>
                <p>系统收录赣州景点、美食、非遗与红色文化资源，从碎片化信息中梳理出清晰的文旅探索路径。</p>
              </div>
              <div class="value-card">
                <div class="value-card__number">02</div>
                <h3>智慧问答服务</h3>
                <p>AI 问答基于本地知识库运作，能够回答关于赣州风土人情的具体问题，而非泛泛而谈的通用回复。</p>
              </div>
              <div class="value-card">
                <div class="value-card__number">03</div>
                <h3>个性化行程建议</h3>
                <p>根据您的天数、偏好和节奏，AI 从数据库中筛选候选目的地，生成可落地的多日行程方案。</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 模块 6：收束式 Pre-Footer -->
        <!-- ========================================== -->
        <section class="closing">
          <div class="closing__inner">
            <h2 class="closing__title">从这里出发，阅读赣州</h2>
            <p class="closing__desc">千年宋城 · 客家摇篮 · 红色故都 · 非遗匠心</p>
            <div class="closing__actions">
              <router-link to="/ai-chat">
                <el-button type="primary" size="large" round>开启智慧问答</el-button>
              </router-link>
              <router-link to="/scenic">
                <el-button size="large" round class="closing__btn-ghost">浏览全部景点</el-button>
              </router-link>
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
  background: #fafaf9;
}

.section-eyebrow {
  display: block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--gz-brand-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.section-title {
  font-size: 32px;
  font-weight: 800;
  color: var(--gz-brand-secondary);
  margin: 0 0 12px;
  letter-spacing: -0.5px;
  line-height: 1.25;
}

.section-desc {
  font-size: 16px;
  color: var(--gz-text-secondary);
  margin: 0;
  line-height: 1.7;
  max-width: 520px;
}

.section-more {
  color: var(--gz-brand-primary);
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
  padding: 0 20px;
  margin-bottom: 80px;
}

.hero__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding-top: 40px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  grid-template-rows: auto auto;
  gap: 24px;
  animation: fadeIn 0.7s ease-out;
}

.hero__visual {
  grid-row: 1 / 3;
  border-radius: var(--gz-radius-lg);
  overflow: hidden;
  background: #e2e8f0;
  position: relative;
  height: 540px;
  min-height: 540px;
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
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.75));
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.hero__visual-placeholder {
  width: 100%;
  height: 100%;
  min-height: 540px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdfa, #e0f2fe);
  color: var(--gz-text-secondary);
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 4px;
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
  letter-spacing: 2px;
  color: var(--gz-brand-primary);
  margin-bottom: 16px;
}

.hero__title {
  font-size: 46px;
  font-weight: 800;
  color: var(--gz-brand-secondary);
  line-height: 1.2;
  margin: 0 0 20px;
  letter-spacing: -1px;
}

.hero__desc {
  font-size: 15px;
  color: var(--gz-text-regular);
  line-height: 1.9;
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
  background: transparent;
  border: 1px solid var(--gz-border-light);
  color: var(--gz-brand-secondary);
}

.cta-ghost:hover {
  border-color: var(--gz-brand-primary);
  color: var(--gz-brand-primary);
}

.hero__ai-float {
  background: #fff;
  border-radius: var(--gz-radius-md);
  padding: 24px 28px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
  border: 1px solid var(--gz-border-light);
  position: relative;
}

.ai-float__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  position: absolute;
  top: 28px;
  right: 28px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.ai-float__label {
  font-size: 14px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin-bottom: 6px;
}

.ai-float__desc {
  font-size: 14px;
  color: var(--gz-text-secondary);
  margin: 0 0 12px;
  line-height: 1.6;
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
  padding: 0 20px;
  margin-bottom: 96px;
}

.ai-services__inner {
  max-width: 1180px;
  margin: 0 auto;
}

.ai-services__header {
  text-align: center;
  margin-bottom: 48px;
}

.ai-services__header .section-desc {
  margin: 0 auto;
}

.ai-services__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.ai-card {
  display: flex;
  flex-direction: column;
  padding: 40px 36px;
  border-radius: var(--gz-radius-lg);
  border: 1px solid var(--gz-border-light);
  background: #fff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.ai-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
}

.ai-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.ai-card--chat .ai-card__icon {
  background: #f0fdf4;
  color: #059669;
}

.ai-card--trip .ai-card__icon {
  background: #eff6ff;
  color: #2563eb;
}

.ai-card__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin: 0 0 12px;
}

.ai-card__desc {
  font-size: 15px;
  color: var(--gz-text-regular);
  line-height: 1.75;
  margin: 0 0 24px;
  flex: 1;
}

.ai-card__action {
  font-size: 15px;
  font-weight: 600;
  color: var(--gz-brand-primary);
}

/* ================================================
   模块 3：精选探索区（策展入口墙）
   ================================================ */
.explore {
  padding: 0 20px;
  margin-bottom: 96px;
}

.explore__inner {
  max-width: 1180px;
  margin: 0 auto;
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
  border-radius: var(--gz-radius-lg);
  overflow: hidden;
  cursor: pointer;
  display: block;
}

.explore-card__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1e293b, #334155);
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

.explore-card__tag {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  opacity: 0.8;
  margin-bottom: 8px;
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
  padding: 0 20px;
  margin-bottom: 96px;
}

.featured__inner {
  max-width: 1180px;
  margin: 0 auto;
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

.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.featured-grid--articles {
  grid-template-columns: repeat(4, 1fr);
}

.featured-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--gz-radius-md);
  overflow: hidden;
  border: 1px solid var(--gz-border-light);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.featured-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.featured-card__img-box {
  height: 200px;
  overflow: hidden;
}

.featured-card__img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.featured-card:hover .featured-card__img-box img {
  transform: scale(1.04);
}

.featured-card__body {
  padding: 20px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.featured-card__body h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin: 0 0 10px;
  line-height: 1.35;
}

.featured-card__body p {
  font-size: 14px;
  color: var(--gz-text-regular);
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

.meta-region {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 文章卡片 */
.article-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--gz-radius-md);
  overflow: hidden;
  border: 1px solid var(--gz-border-light);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.article-card__img-box {
  height: 160px;
  overflow: hidden;
}

.article-card__img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.article-card:hover .article-card__img-box img {
  transform: scale(1.04);
}

.article-card__body {
  padding: 16px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.article-card__cat {
  font-size: 12px;
  font-weight: 600;
  color: var(--gz-brand-primary);
  margin-bottom: 6px;
}

.article-card__body h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin: 0 0 8px;
  line-height: 1.35;
}

.article-card__body p {
  font-size: 13px;
  color: var(--gz-text-regular);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

/* ================================================
   模块 5：平台价值说明
   ================================================ */
.value {
  padding: 80px 20px;
  background: #fff;
  border-top: 1px solid var(--gz-border-light);
  border-bottom: 1px solid var(--gz-border-light);
  margin-bottom: 0;
}

.value__inner {
  max-width: 1180px;
  margin: 0 auto;
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
  color: var(--gz-border-light);
  line-height: 1;
  margin-bottom: 20px;
}

.value-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin: 0 0 12px;
}

.value-card p {
  font-size: 15px;
  color: var(--gz-text-regular);
  line-height: 1.75;
  margin: 0;
}

/* ================================================
   模块 6：收束区
   ================================================ */
.closing {
  padding: 96px 20px;
  text-align: center;
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.closing__inner {
  max-width: 640px;
  margin: 0 auto;
}

.closing__title {
  font-size: 36px;
  font-weight: 800;
  color: var(--gz-brand-secondary);
  margin: 0 0 16px;
  letter-spacing: -0.5px;
}

.closing__desc {
  font-size: 16px;
  color: var(--gz-text-secondary);
  margin: 0 0 36px;
  letter-spacing: 2px;
}

.closing__actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.closing__btn-ghost {
  background: transparent;
  border: 1px solid var(--gz-border-light);
  color: var(--gz-brand-secondary);
}

.closing__btn-ghost:hover {
  border-color: var(--gz-brand-primary);
  color: var(--gz-brand-primary);
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

  .section-title {
    font-size: 26px;
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
