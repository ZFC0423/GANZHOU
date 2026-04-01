<script setup>
import SiteLayout from '../components/SiteLayout.vue';
</script>

<template>
  <SiteLayout>
    <div class="about-page">

      <!-- ======================================== -->
      <!-- 模块 1：深色 Hero 开场区 -->
      <!-- ======================================== -->
      <section class="about-hero">
        <div class="about-hero__inner">
          <span class="about-hero__eyebrow">了解平台</span>
          <h1 class="about-hero__title">赣州旅游文化智慧服务平台</h1>
          <p class="about-hero__desc">
            围绕赣州的山水胜境、客家风情、红色记忆与非遗匠心，<br/>
            构建一个以本地文旅内容为核心、以 AI 智慧导览为服务层的数字化探索平台。
          </p>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 2：平台定位说明区 -->
      <!-- ======================================== -->
      <section class="about-position">
        <div class="about-position__inner">
          <div class="about-position__header">
            <span class="about-section-eyebrow">平台定位</span>
            <h2 class="about-section-title">不是旅游攻略站，而是一个城市文化的智慧入口</h2>
            <p class="about-position__lead">
              赣州有太多值得被看见的文化资源——但它们分散在各处，缺少一个统一的表达方式。
              本平台的核心工作，是把这些内容整合起来，用清楚的结构和智能的导览，让探索变得更容易。
            </p>
          </div>

          <div class="about-position__grid">
            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <h3 class="position-item__title">文旅内容整合</h3>
              <p class="position-item__desc">
                系统收录赣州景点、美食、非遗与红色文化资源，将碎片化的信息整理成可浏览、可检索的结构化内容体系。
              </p>
            </div>

            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </div>
              <h3 class="position-item__title">专题化文化表达</h3>
              <p class="position-item__desc">
                按美食专题、非遗传承、红色记忆等维度组织内容，让每类文化资源都有独立的叙事空间，而不只是扁平的列表罗列。
              </p>
            </div>

            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 class="position-item__title">AI 智慧问答与行程辅助</h3>
              <p class="position-item__desc">
                结合本地文旅内容召回与大模型生成能力，提供场景化问答与行程建议，让"问赣州"变成一件可以直接做的事。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 3：平台核心主题区 -->
      <!-- ======================================== -->
      <section class="about-themes">
        <div class="about-themes__inner">
          <span class="about-section-eyebrow">核心主题</span>
          <h2 class="about-section-title">城市文化与智慧服务的四个切面</h2>

          <div class="themes-grid">
            <div class="theme-card">
              <div class="theme-card__number">01</div>
              <h3 class="theme-card__title">千年宋城</h3>
              <p class="theme-card__desc">
                作为曾经的大宋名城，赣州保留了全国最为完好的宋代古城墙和极其丰富的历史遗迹。
                从郁孤台到古浮桥，每一步都是与千年历史的直接对谈。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">02</div>
              <h3 class="theme-card__title">客家摇篮</h3>
              <p class="theme-card__desc">
                赣州是全球客家人最大的聚居地之一。传统的围屋建筑、地道的客家饮食与丰富的非遗文化，
                在这里世代相传，构成独特而鲜活的文化景观。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">03</div>
              <h3 class="theme-card__title">红色故都</h3>
              <p class="theme-card__desc">
                瑞金、于都这片土地孕育了伟大的共和国摇篮。长征从这里出发，
                坚韧不拔的信念铸就了这片红土地不朽的记忆，也为这座城市留下了深刻的精神底色。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">04</div>
              <h3 class="theme-card__title">智慧服务</h3>
              <p class="theme-card__desc">
                平台将 AI 技术融入文旅场景，提供基于本地知识库的智能问答与个性化行程建议。
                不是取代人的判断，而是在信息获取和行程规划上提供一份可靠的辅助。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 4：设计与实现要点区 -->
      <!-- ======================================== -->
      <section class="about-tech">
        <div class="about-tech__inner">
          <span class="about-section-eyebrow">设计与实现</span>
          <h2 class="about-section-title">项目的四个实现维度</h2>
          <p class="about-tech__lead">
            本项目作为毕业设计作品，在前端呈现、内容组织、AI 服务与后台管理四个方面进行了完整的设计与实现。
          </p>

          <div class="tech-grid">
            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">前端呈现</h3>
              <p class="tech-card__desc">
                基于 Vue 3 构建响应式前台与管理后台，采用现代组件化设计，确保在桌面端与移动端都有良好的浏览体验。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">内容组织</h3>
              <p class="tech-card__desc">
                景点、美食、非遗、红色文化等资源通过 MySQL 数据库统一管理，支持分类筛选、详情展示与后台 CRUD 操作。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">AI 服务</h3>
              <p class="tech-card__desc">
                结合本地文旅内容召回与大模型生成能力，提供场景化的智能问答与多日行程推荐，所有交互均记录日志以便追溯。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">后台管理</h3>
              <p class="tech-card__desc">
                管理端支持景点与文章的增删改查、AI 文案辅助生成与日志查看，形成"内容管理 → 前台展示 → AI 服务"的完整闭环。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 5：底部收束区 -->
      <!-- ======================================== -->
      <section class="about-closing">
        <div class="about-closing__inner">
          <h2 class="about-closing__title">以智慧导览，探索千年文脉</h2>
          <p class="about-closing__desc">从这里出发，开始你的赣州文旅探索之旅</p>
          <div class="about-closing__actions">
            <router-link to="/ai-chat">
              <el-button type="primary" size="large" round>开启智慧问答</el-button>
            </router-link>
            <router-link to="/scenic">
              <el-button size="large" round class="about-closing__btn-ghost">浏览精选景点</el-button>
            </router-link>
          </div>
        </div>
      </section>

    </div>
  </SiteLayout>
</template>

<style scoped>
/* ================================================
   页面基础
   ================================================ */
.about-page {
  background: var(--gz-bg-page, #f8fafc);
}

.about-section-eyebrow {
  display: block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--gz-brand-primary, #0f766e);
  margin-bottom: 8px;
}

.about-section-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--gz-brand-secondary, #0f172a);
  margin: 0 0 16px;
  letter-spacing: -0.5px;
  line-height: 1.3;
}

/* ================================================
   模块 1：深色 Hero
   ================================================ */
.about-hero {
  background: linear-gradient(160deg, #0c1222, #1a2744);
  color: #e2e8f0;
  padding: 100px 20px 88px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 轻装饰层 */
.about-hero::before {
  content: '';
  position: absolute;
  top: -120px;
  right: -80px;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(15, 118, 110, 0.08), transparent 70%);
  pointer-events: none;
}

.about-hero__inner {
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  animation: fadeIn 0.7s ease-out;
}

.about-hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 3px;
  color: rgba(148, 163, 184, 0.8);
  margin-bottom: 20px;
}

.about-hero__title {
  font-size: 40px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 24px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.about-hero__desc {
  font-size: 16px;
  color: #94a3b8;
  line-height: 1.9;
  margin: 0;
}

/* ================================================
   模块 2：平台定位说明
   ================================================ */
.about-position {
  padding: 0 20px;
  margin-top: 80px;
  margin-bottom: 96px;
}

.about-position__inner {
  max-width: 1180px;
  margin: 0 auto;
}

.about-position__header {
  max-width: 680px;
  margin-bottom: 56px;
}

.about-position__lead {
  font-size: 16px;
  color: var(--gz-text-regular, #475569);
  line-height: 1.85;
  margin: 0;
}

.about-position__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.position-item {
  padding: 36px 32px;
  background: #fff;
  border-radius: var(--gz-radius-md, 8px);
  border: 1px solid var(--gz-border-light, #e2e8f0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.position-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.position-item__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--gz-brand-primary-light, #f0fdf4);
  color: var(--gz-brand-primary, #0f766e);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.position-item__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gz-brand-secondary, #0f172a);
  margin: 0 0 10px;
}

.position-item__desc {
  font-size: 14px;
  color: var(--gz-text-regular, #475569);
  line-height: 1.8;
  margin: 0;
}

/* ================================================
   模块 3：核心主题区
   ================================================ */
.about-themes {
  padding: 80px 20px;
  background: #fff;
  border-top: 1px solid var(--gz-border-light, #e2e8f0);
  border-bottom: 1px solid var(--gz-border-light, #e2e8f0);
}

.about-themes__inner {
  max-width: 1180px;
  margin: 0 auto;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 48px;
}

.theme-card {
  padding: 40px 36px;
  border-radius: var(--gz-radius-md, 8px);
  background: var(--gz-bg-page, #f8fafc);
  border: 1px solid var(--gz-border-light, #e2e8f0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.theme-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.theme-card__number {
  font-size: 42px;
  font-weight: 800;
  color: var(--gz-border-light, #e2e8f0);
  line-height: 1;
  margin-bottom: 20px;
}

.theme-card__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--gz-brand-secondary, #0f172a);
  margin: 0 0 12px;
}

.theme-card__desc {
  font-size: 15px;
  color: var(--gz-text-regular, #475569);
  line-height: 1.8;
  margin: 0;
}

/* ================================================
   模块 4：设计与实现要点
   ================================================ */
.about-tech {
  padding: 0 20px;
  margin-top: 96px;
  margin-bottom: 96px;
}

.about-tech__inner {
  max-width: 1180px;
  margin: 0 auto;
}

.about-tech__lead {
  font-size: 16px;
  color: var(--gz-text-regular, #475569);
  line-height: 1.8;
  margin: 0 0 48px;
  max-width: 640px;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.tech-card {
  padding: 32px 28px;
  background: #fff;
  border-radius: var(--gz-radius-md, 8px);
  border: 1px solid var(--gz-border-light, #e2e8f0);
  position: relative;
  overflow: hidden;
}

.tech-card__bar {
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--gz-brand-primary, #0f766e);
  margin-bottom: 24px;
}

.tech-card__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--gz-brand-secondary, #0f172a);
  margin: 0 0 10px;
}

.tech-card__desc {
  font-size: 14px;
  color: var(--gz-text-regular, #475569);
  line-height: 1.8;
  margin: 0;
}

/* ================================================
   模块 5：底部收束区
   ================================================ */
.about-closing {
  padding: 88px 20px;
  text-align: center;
  background: linear-gradient(180deg, var(--gz-bg-page, #f8fafc), #f1f5f9);
}

.about-closing__inner {
  max-width: 560px;
  margin: 0 auto;
}

.about-closing__title {
  font-size: 32px;
  font-weight: 800;
  color: var(--gz-brand-secondary, #0f172a);
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.about-closing__desc {
  font-size: 16px;
  color: var(--gz-text-secondary, #64748b);
  margin: 0 0 36px;
}

.about-closing__actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.about-closing__btn-ghost {
  background: transparent;
  border: 1px solid var(--gz-border-light, #e2e8f0);
  color: var(--gz-brand-secondary, #0f172a);
}

.about-closing__btn-ghost:hover {
  border-color: var(--gz-brand-primary, #0f766e);
  color: var(--gz-brand-primary, #0f766e);
}

/* ================================================
   响应式
   ================================================ */
@media (max-width: 1024px) {
  .about-position__grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .tech-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .about-hero {
    padding: 64px 20px 56px;
  }

  .about-hero__title {
    font-size: 30px;
  }

  .about-hero__desc {
    font-size: 15px;
  }

  .about-section-title {
    font-size: 24px;
  }

  .about-position {
    margin-top: 56px;
    margin-bottom: 64px;
  }

  .about-themes {
    padding: 56px 20px;
  }

  .themes-grid {
    grid-template-columns: 1fr;
    margin-top: 32px;
  }

  .theme-card {
    padding: 32px 28px;
  }

  .theme-card__number {
    font-size: 36px;
  }

  .about-tech {
    margin-top: 64px;
    margin-bottom: 64px;
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }

  .tech-card {
    padding: 28px 24px;
  }

  .about-closing {
    padding: 56px 20px;
  }

  .about-closing__title {
    font-size: 26px;
  }

  .about-closing__actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .about-closing__actions a {
    width: 100%;
    max-width: 260px;
    display: block;
  }

  .about-closing__actions .el-button {
    width: 100%;
  }
}
</style>
