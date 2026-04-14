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
          <span class="about-hero__eyebrow">平台定位与设计说明页</span>
          <h1 class="about-hero__title">赣州旅游文化智慧服务平台</h1>
          <p class="about-hero__desc">
            围绕赣州旅游资源、城市文化与智慧服务体验构建的数字化平台，<br/>结合内容展示、主题组织与 AI 辅助能力，提供更清晰的文旅探索路径。
          </p>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 2：平台定位说明区 -->
      <!-- ======================================== -->
      <section class="about-position">
        <div class="about-position__inner section-inner">
          <div class="about-position__header">
            <span class="section-eyebrow">平台定位</span>
            <h2 class="section-title">它不仅用于展示内容，也负责组织理解路径</h2>
            <p class="about-position__lead">
              平台尝试把主题化内容组织、景点浏览、文化解释与智慧服务放在同一套探索系统中。<br/>
              用户可以从主题、景点与 AI 三条路径进入，再在阅读与路径建议之间继续延伸。
            </p>
          </div>

          <div class="about-position__grid">
            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <h3 class="position-item__title">文旅内容整合</h3>
              <p class="position-item__desc">
                围绕景点、文章与主题线索组织内容，帮助用户更快建立整体认知。
              </p>
            </div>

            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </div>
              <h3 class="position-item__title">主题化文化表达</h3>
              <p class="position-item__desc">
                通过专题与内容承接结构，将分散信息整理为更易理解的阅读入口。
              </p>
            </div>

            <div class="position-item">
              <div class="position-item__icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 class="position-item__title">智慧辅助服务</h3>
              <p class="position-item__desc">
                AI 在平台中承担解释与路径辅助的角色，帮助用户更高效地进入内容。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 3：平台核心主题区 -->
      <!-- ======================================== -->
      <section class="about-themes">
        <div class="about-themes__inner section-inner">
          <h2 class="section-title">平台核心主题</h2>
          <p class="about-position__lead about-position__lead--spaced section-copy">
            平台从城市文化与智慧服务两个层面组织内容，帮助用户从不同切口进入赣州。
          </p>

          <div class="themes-grid themes-grid--compact">
            <div class="theme-card">
              <div class="theme-card__number">01</div>
              <h3 class="theme-card__title">千年宋城</h3>
              <p class="theme-card__desc">
                从城市历史与地方记忆进入赣州的时间纵深与文化底色。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">02</div>
              <h3 class="theme-card__title">客家摇篮</h3>
              <p class="theme-card__desc">
                从迁徙、聚落与地方生活方式中理解赣州更深层的人文结构。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">03</div>
              <h3 class="theme-card__title">红色故都</h3>
              <p class="theme-card__desc">
                从真实历史地点与重要线索进入赣州在红色记忆中的位置。
              </p>
            </div>

            <div class="theme-card">
              <div class="theme-card__number">04</div>
              <h3 class="theme-card__title">智慧服务</h3>
              <p class="theme-card__desc">
                通过问答与路径建议，让内容理解、景点浏览与继续探索建立更自然的连接。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ======================================== -->
      <!-- 模块 4：设计与实现要点区 -->
      <!-- ======================================== -->
      <section class="about-tech">
        <div class="about-tech__inner section-inner">
          <h2 class="section-title">设计与实现要点</h2>
          <p class="about-tech__lead">
            这一部分用于说明平台如何从展示站点进一步走向内容组织与智慧导览系统。
          </p>

          <div class="tech-grid">
            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">前端呈现</h3>
              <p class="tech-card__desc">
                以前台页面为入口，建立统一的视觉语言、阅读节奏与多端浏览体验。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">内容组织</h3>
              <p class="tech-card__desc">
                围绕景点、文章、专题与导览关系建立页面层级，提升内容承接能力。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">AI 服务</h3>
              <p class="tech-card__desc">
                结合现有平台内容与生成式能力，为用户提供问答解释与参考性路径建议。
              </p>
            </div>

            <div class="tech-card">
              <div class="tech-card__bar"></div>
              <h3 class="tech-card__title">后台管理</h3>
              <p class="tech-card__desc">
                通过后台维护景点、文章与相关内容，形成前台展示与数据管理的基本闭环。
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
          <h2 class="about-closing__title">从平台理解出发，再进入景点、主题与路径</h2>
          <p class="about-closing__desc">你可以先浏览内容，也可以从智慧服务开始，再回到相关景点与主题继续探索。</p>
          <div class="about-closing__actions">
            <router-link to="/ai-chat">
              <el-button type="primary" size="large" round>开启智慧问答</el-button>
            </router-link>
            <router-link to="/scenic">
              <el-button size="large" round class="about-closing__btn-ghost">浏览精选景点</el-button>
            </router-link>
          </div>
          <div class="section-note section-note--center about-closing__note">
            在内容理解、景点浏览与智慧导览之间，建立一条更清晰的进入路径。
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

.about-position__lead--spaced {
  margin-bottom: 40px;
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

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 48px;
}

.themes-grid--compact {
  margin-top: 0;
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
  max-width: 680px;
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

.about-closing__note {
  margin-top: 32px;
  letter-spacing: 1px;
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

  .section-title {
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
