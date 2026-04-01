<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getHomeApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

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
    <div class="page-shell">
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 24px;" />
      <div v-if="errorMessage" style="margin-bottom: 24px;">
        <el-button @click="loadHomeData">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else>
        <section class="home-hero">
          <div class="home-hero__text">
            <p class="home-hero__eyebrow">智游赣州</p>
            <h1 class="home-hero__title">{{ homeData.siteName || '赣州智能文旅探索平台' }}</h1>
            <p class="home-hero__desc">
              {{ homeData.siteDescription || '融汇千年宋城底蕴与客家风土人情，为您开启一站式智能导览新体验。' }}
            </p>
            <div class="home-hero__actions">
              <router-link to="/scenic">
                <el-button type="primary" size="large" round class="hero-btn">探索全景</el-button>
              </router-link>
              <router-link to="/food">
                <el-button size="large" round class="hero-btn hero-btn-secondary">发现特色</el-button>
              </router-link>
            </div>
          </div>
          <el-carousel v-if="homeData.banners.length" height="380px" class="home-hero__carousel">
            <el-carousel-item v-for="item in homeData.banners" :key="item.id">
              <router-link :to="item.linkTarget || '/'" class="banner-link">
                <img
                  class="banner-image"
                  :src="resolveAssetUrl(item.imageUrl, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
                <div class="banner-mask">
                  <div class="banner-title">{{ item.title }}</div>
                </div>
              </router-link>
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else description="画卷徐徐展开，风景正在加载..." class="home-hero__empty" :image-size="120" />
        </section>

        <section class="intro-card">
          <div class="intro-card__header">
            <div class="intro-card__label">关于赣州</div>
            <h2>江西南大门，千年客家摇篮</h2>
          </div>
          <p>
            赣州融汇了全国保存最完好的宋代古城墙、独特风味的客家美食、悠久的非遗手工艺与震撼人心的红色历史。在这里，每一步都是与千百年来文化积淀的直接对话。
          </p>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <h2>山水胜境</h2>
              <p>跟随我们的脚步，探索赣州最值得一去的名胜古迹与自然风光。</p>
            </div>
            <router-link to="/scenic" class="section-link">探索更多 <i class="el-icon-arrow-right"></i></router-link>
          </div>
          <el-empty v-if="!homeData.recommends.scenic.length" description="暂无精选景点" />
          <div v-else class="card-grid">
            <router-link v-for="item in homeData.recommends.scenic" :key="item.id" :to="`/scenic/${item.id}`">
              <el-card class="home-card" shadow="hover">
                <div class="card-image-wrapper">
                  <img
                    class="image-cover"
                    :src="resolveAssetUrl(item.coverImage, item.name)"
                    :alt="item.name"
                    @error="(event) => applyImageFallback(event, item.name)"
                  />
                </div>
                <div class="home-card__body">
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.intro || '此处胜景，等您亲自解谜。' }}</p>
                  <div class="home-card__meta">
                    <span class="meta-region"><el-icon><Location /></el-icon> {{ item.region || '赣州境内' }}</span>
                    <span class="meta-score">热度 {{ item.hotScore || '新晋' }}</span>
                  </div>
                </div>
              </el-card>
            </router-link>
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <h2>寻味客家</h2>
              <p>品味传世百年的客家经典与街头巷尾的地道小吃。</p>
            </div>
            <router-link to="/food" class="section-link">探索更多</router-link>
          </div>
          <el-empty v-if="!homeData.recommends.food.length" description="暂无美食推荐" />
          <div v-else class="card-grid">
            <router-link v-for="item in homeData.recommends.food" :key="item.id" :to="`/food/${item.id}`">
              <el-card class="home-card" shadow="hover">
                <div class="card-image-wrapper">
                  <img
                    class="image-cover"
                    :src="resolveAssetUrl(item.coverImage, item.title)"
                    :alt="item.title"
                    @error="(event) => applyImageFallback(event, item.title)"
                  />
                </div>
                <div class="home-card__body">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.summary || '独特的味蕾体验，一尝便难忘。' }}</p>
                </div>
              </el-card>
            </router-link>
          </div>
        </section>

        <section class="home-section home-section--split">
          <div class="split-column">
            <div class="home-section__header">
              <div>
                <h2>非遗传承</h2>
                <p>感受历经岁月洗礼的赣州非遗手艺与民俗风土。</p>
              </div>
              <router-link to="/heritage" class="section-link">探索更多</router-link>
            </div>
            <el-empty v-if="!homeData.recommends.heritage.length" description="暂无非遗传承内容" />
            <div v-else class="mini-list">
              <router-link v-for="item in homeData.recommends.heritage" :key="item.id" :to="`/heritage/${item.id}`">
                <el-card class="mini-card" shadow="hover">
                  <div class="mini-card-img-wrapper">
                    <img
                      class="mini-card__image"
                      :src="resolveAssetUrl(item.coverImage, item.title)"
                      :alt="item.title"
                      @error="(event) => applyImageFallback(event, item.title)"
                    />
                  </div>
                  <div class="mini-card__content">
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || '民间智慧的结晶，非遗记忆的延续。' }}</p>
                  </div>
                </el-card>
              </router-link>
            </div>
          </div>

          <div class="split-column">
            <div class="home-section__header">
              <div>
                <h2>红色记忆</h2>
                <p>追寻长征起点，重温这片红土地上不朽的烽火印记。</p>
              </div>
              <router-link to="/red-culture" class="section-link">探索更多</router-link>
            </div>
            <el-empty v-if="!homeData.recommends.redCulture.length" description="暂无红色记忆内容" />
            <div v-else class="mini-list">
              <router-link v-for="item in homeData.recommends.redCulture" :key="item.id" :to="`/red-culture/${item.id}`">
                <el-card class="mini-card" shadow="hover">
                  <div class="mini-card-img-wrapper">
                    <img
                      class="mini-card__image"
                      :src="resolveAssetUrl(item.coverImage, item.title)"
                      :alt="item.title"
                      @error="(event) => applyImageFallback(event, item.title)"
                    />
                  </div>
                  <div class="mini-card__content">
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || '穿越岁月斑驳，见证信仰的光辉。' }}</p>
                  </div>
                </el-card>
              </router-link>
            </div>
          </div>
        </section>

        <section class="ai-entry">
          <div class="ai-entry__text">
            <div class="ai-entry__label">智慧服务体验</div>
            <h2>您的专属赣州智能助导</h2>
            <p>基于平台丰富的知识库，无论是为您量身定制多日游日程，还是解答关于赣州风土人情的微小疑惑，智慧系统都在此倾听。</p>
          </div>
          <div class="ai-entry__actions">
            <router-link to="/ai-chat">
              <el-button type="primary" size="large" round class="ai-btn-primary">向我提问</el-button>
            </router-link>
            <router-link to="/ai-trip">
              <el-button size="large" round class="ai-btn-secondary">智能编排行程</el-button>
            </router-link>
          </div>
        </section>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 32px;
  margin-bottom: 40px;
}

.home-hero__text {
  padding: 48px 36px;
  border-radius: var(--gz-radius-lg);
  background: radial-gradient(circle at top left, #f0fdfa, #f8fafc 60%, #ffffff 100%);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.home-hero__eyebrow {
  margin: 0 0 12px;
  color: var(--gz-brand-primary);
  font-weight: 700;
  letter-spacing: 1.5px;
  font-size: 14px;
}

.home-hero__title {
  margin: 0;
  font-size: 44px;
  line-height: 1.25;
  color: var(--gz-brand-secondary);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.home-hero__desc {
  margin: 20px 0 32px;
  color: var(--gz-text-regular);
  line-height: 1.85;
  font-size: 16px;
}

.home-hero__actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-btn {
  padding: 0 32px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.hero-btn-secondary {
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.home-hero__carousel,
.home-hero__empty {
  border-radius: var(--gz-radius-lg);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.banner-link {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 380px;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.banner-link:hover .banner-image {
  transform: scale(1.04);
}

.banner-mask {
  position: absolute;
  inset: auto 0 0 0;
  padding: 32px 24px 24px;
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.8));
}

.banner-title {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.intro-card {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 32px;
  padding: 36px 40px;
  background: #fff;
  border-radius: var(--gz-radius-lg);
  margin-bottom: 48px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.03);
  align-items: center;
}

.intro-card__label {
  color: var(--gz-brand-primary);
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.intro-card h2 {
  margin: 0;
  font-size: 32px;
  color: var(--gz-brand-secondary);
  line-height: 1.3;
}

.intro-card p {
  margin: 0;
  color: var(--gz-text-regular);
  line-height: 1.85;
  font-size: 16px;
}

.home-section {
  margin-bottom: 56px;
}

.home-section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}

.home-section__header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  color: var(--gz-brand-secondary);
}

.home-section__header p {
  margin: 0;
  color: var(--gz-text-secondary);
  font-size: 15px;
}

.section-link {
  color: var(--gz-brand-primary);
  font-weight: 600;
  font-size: 15px;
  position: relative;
  padding-bottom: 2px;
}

.section-link:after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 0%;
  background-color: var(--gz-brand-primary);
  transition: width 0.3s ease;
}

.section-link:hover:after {
  width: 100%;
}

.home-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-image-wrapper {
  overflow: hidden;
}

.home-card__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.home-card__body h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--gz-brand-secondary);
}

.home-card__body p {
  margin: 0 0 16px;
  color: var(--gz-text-regular);
  line-height: 1.7;
  flex: 1;
  font-size: 14px;
}

.home-card__meta {
  display: flex;
  justify-content: space-between;
  color: var(--gz-text-secondary);
  font-size: 13px;
  padding-top: 12px;
  border-top: 1px solid var(--gz-border-light);
}

.meta-region {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-score {
  color: #ea580c;
  font-weight: 500;
}

.home-section--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.mini-list {
  display: grid;
  gap: 16px;
}

.mini-card {
  border-radius: var(--gz-radius-md) !important;
}

:deep(.mini-card .el-card__body) {
  padding: 0;
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0;
  background: transparent;
}

.mini-card-img-wrapper {
  overflow: hidden;
  height: 110px;
}

.mini-card__image {
  width: 140px;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

a:hover .mini-card__image {
  transform: scale(1.05);
}

.mini-card__content {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mini-card__content h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--gz-brand-secondary);
}

.mini-card__content p {
  margin: 0;
  color: var(--gz-text-regular);
  line-height: 1.6;
  font-size: 14px;
}

.ai-entry {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  align-items: center;
  border-radius: var(--gz-radius-lg);
  padding: 40px 48px;
  background: linear-gradient(135deg, #0f172a, #1e3a8a, #0d9488);
  color: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.15);
}

.ai-entry__text {
  max-width: 600px;
}

.ai-entry__label {
  color: #5eead4;
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 13px;
  margin-bottom: 8px;
}

.ai-entry h2 {
  margin: 0 0 14px;
  font-size: 32px;
  letter-spacing: -0.5px;
  color: #fff;
}

.ai-entry p {
  margin: 0;
  line-height: 1.8;
  color: #cbd5e1;
  font-size: 16px;
}

.ai-entry__actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.ai-btn-primary {
  padding: 0 32px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.ai-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 0 32px;
  backdrop-filter: blur(4px);
}

.ai-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

@media (max-width: 900px) {
  .home-hero,
  .intro-card,
  .home-section--split,
  .ai-entry {
    grid-template-columns: 1fr;
    display: grid;
    gap: 24px;
  }

  .home-section__header {
    align-items: flex-start;
    flex-direction: column;
  }

  :deep(.mini-card .el-card__body) {
    grid-template-columns: 1fr;
  }

  .mini-card-img-wrapper {
    height: 180px;
  }

  .mini-card__image {
    width: 100%;
  }
}
</style>
