<script setup>
import SiteLayout from '../components/SiteLayout.vue';
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="about-hero">
        <div class="about-hero__content">
          <div class="about-hero__eyebrow">了解我们</div>
          <h1 class="page-title">赣州旅游文化平台</h1>
          <p class="page-subtitle">
            深耕宋城底蕴，传承客家薪火。以智慧之力，带您领略江西南大门的独特风光。
          </p>
        </div>
      </section>

      <section class="about-grid">
        <el-card shadow="hover" class="about-card">
          <template #header>
            <div class="card-header-title">千年宋城</div>
          </template>
          <p>作为曾经的大宋名城，赣州保留了全国最为完好的宋代古城墙和极其丰富的遗迹。在这里，每一步都是与历史的直接对谈。</p>
        </el-card>

        <el-card shadow="hover" class="about-card">
          <template #header>
            <div class="card-header-title">客家摇篮</div>
          </template>
          <p>赣州是全球客家人最大的聚居地之一。传统的围屋、地道的客家美食与数不尽的非遗文化，在这里代代相传。</p>
        </el-card>

        <el-card shadow="hover" class="about-card">
          <template #header>
            <div class="card-header-title">红色故都</div>
          </template>
          <p>瑞金、于都这片土地孕育了伟大的共和国摇篮，长征从这里出发，坚韧不拔的信念铸就了这片红土地不朽的记忆。</p>
        </el-card>

        <el-card shadow="hover" class="about-card">
          <template #header>
            <div class="card-header-title">智慧服务</div>
          </template>
          <p>平台深度融合前沿 AI 技术，提供量身定制的智能问答与行程规划服务，让文化探索之旅因为科技的加持变得更简单、更贴心。</p>
        </el-card>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.about-hero {
  padding: 60px 40px;
  border-radius: var(--gz-radius-lg);
  background: linear-gradient(135deg, #f8fafc, #f0fdf4);
  margin-bottom: 40px;
  text-align: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

.about-hero__content {
  max-width: 680px;
  margin: 0 auto;
}

.about-hero__eyebrow {
  color: var(--gz-brand-primary);
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 2px;
  font-size: 13px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  margin-bottom: 16px;
}

.page-subtitle {
  font-size: 16px;
  line-height: 1.8;
  color: var(--gz-text-regular);
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.about-card {
  border-radius: var(--gz-radius-md) !important;
}

.card-header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--gz-brand-secondary);
  display: flex;
  align-items: center;
}

.card-header-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: var(--gz-brand-primary);
  margin-right: 10px;
  border-radius: 2px;
}

.about-grid p {
  margin: 0;
  line-height: 1.85;
  color: var(--gz-text-regular);
  font-size: 15px;
}

@media (max-width: 768px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
