<script setup>
</script>

<template>
  <div class="page-shell about-page">
      <section class="about-hero">
        <div class="about-hero__media">
          <img src="/immersive/hero/P0-01_JiangnanSongcheng_official_02.jpg" alt="策展声明" />
        </div>
        <div class="about-hero__overlay">
          <div class="about-hero__copy">
            <div class="chapter-mark">Curatorial Statement</div>
            <h1 class="page-title">这不是把资料摆上去的网站，而是一部被重新导演过的赣州长卷。</h1>
            <p class="page-subtitle">
              我们希望它先让人进入赣州，再让人浏览赣州。页面、图像、节奏和 AI，都服务于同一个目标：把地点、专题和理解路径重新编排成一场数字文化体验。
            </p>
          </div>
        </div>
      </section>

      <section class="section-inner about-essay">
        <article class="about-essay__block">
          <span class="section-eyebrow">Why Ganzhou</span>
          <h2 class="section-title">先建立一座城的气质，再展开它的内容。</h2>
          <p class="section-desc">
            赣州既有老城肌理、客家文化，也有红色记忆和山水外部。它不适合被做成普通旅游信息站，
            因为真正重要的不是信息条目本身，而是这些条目之间如何构成一套可被体验的地方叙事。
          </p>
        </article>

        <div class="about-essay__grid">
          <article class="about-essay__card">
            <div class="section-label">视觉方法</div>
            <h3>海报式首屏，章节式页面。</h3>
            <p>每个页面先建立场域，再组织信息。我们减少模板化卡片语言，让图像、留白和标题成为结构骨架。</p>
          </article>

          <article class="about-essay__card">
            <div class="section-label">内容方法</div>
            <h3>把栏目改成章节，把详情改成解说。</h3>
            <p>首页负责定调，专题页负责建立阅读姿态，景点页负责做地方 dossier，详情页不再只是字段展示。</p>
          </article>

          <article class="about-essay__card">
            <div class="section-label">交互方法</div>
            <h3>动效像镜头调度，而不是组件炫技。</h3>
            <p>我们只保留必要的缓启、显影和转场，让滚动有节奏感，但不让动画压过内容本身。</p>
          </article>
        </div>
      </section>

      <section class="section-inner about-ai">
        <div class="about-ai__copy">
          <span class="section-eyebrow">AI Method</span>
          <h2 class="section-title">AI 不是外挂功能，它是站内导览员。</h2>
          <p class="section-desc">
            问答负责把景点、专题和文化关系解释清楚，路线负责把用户偏好整理成可继续讲述的游览节奏。
            AI 的回答必须建立在平台内容上，而不是脱离场景的泛化输出。
          </p>
        </div>

        <div class="about-ai__cards">
          <article class="panel-soft-card about-ai__card">
            <div class="section-label">AI 问答</div>
            <p>先检索平台中的景点和文章，再把回答整理成导览脚本、引用线索和下一步路径。</p>
          </article>
          <article class="panel-note-muted about-ai__card">
            <div class="section-label">AI 路线</div>
            <p>先读取天数、兴趣和节奏，再结合数据库内容生成路线，不把结果做成冷冰冰的表单输出。</p>
          </article>
        </div>
      </section>

      <section class="section-inner about-links">
        <div class="about-links__head">
          <span class="section-eyebrow">Continue</span>
          <h2 class="section-title">如果你想继续感受这部长卷，可以从这些入口往下走。</h2>
        </div>

        <div class="about-links__grid">
          <router-link to="/" class="about-links__card">
            <strong>首页片头</strong>
            <span>从整体气质重新进入赣州。</span>
          </router-link>
          <router-link to="/scenic" class="about-links__card">
            <strong>景点图谱</strong>
            <span>先记住场所，再展开理解。</span>
          </router-link>
          <router-link to="/ai-chat" class="about-links__card">
            <strong>AI 导览室</strong>
            <span>让导览员继续把线索讲清楚。</span>
          </router-link>
        </div>
      </section>
  </div>
</template>

<style scoped>
.about-page {
  display: grid;
  gap: 40px;
}

.about-hero {
  position: relative;
  min-height: min(68vh, 660px);
  overflow: hidden;
  border-radius: 42px;
  box-shadow: var(--shadow-floating);
}

.about-hero__media,
.about-hero__media img {
  width: 100%;
  height: 100%;
}

.about-hero__media {
  position: absolute;
  inset: 0;
}

.about-hero__media img {
  object-fit: cover;
}

.about-hero__overlay {
  position: relative;
  min-height: min(68vh, 660px);
  display: grid;
  align-items: end;
  padding: 42px;
  color: #fff2de;
  background: linear-gradient(180deg, rgba(17, 22, 27, 0.18), rgba(17, 22, 27, 0.84));
}

.about-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 860px;
}

.about-hero__copy :deep(.page-title),
.about-hero__copy :deep(.page-subtitle) {
  color: inherit;
}

.about-essay,
.about-ai,
.about-links {
  display: grid;
  gap: 24px;
}

.about-essay__block {
  display: grid;
  gap: 12px;
}

.about-essay__grid,
.about-ai__cards,
.about-links__grid {
  display: grid;
  gap: 18px;
}

.about-essay__grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.about-essay__card,
.about-links__card {
  display: grid;
  gap: 12px;
  padding: 24px;
  border-radius: 28px;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.about-essay__card h3,
.about-links__card strong {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 30px;
  line-height: 1.12;
}

.about-essay__card p,
.about-ai__card p,
.about-links__card span {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

.about-ai {
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1fr);
}

.about-ai__copy {
  display: grid;
  gap: 12px;
}

.about-ai__cards {
  grid-template-columns: 1fr;
}

.about-ai__card {
  padding: 22px;
}

.about-links__head {
  display: grid;
  gap: 8px;
}

.about-links__grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1023px) {
  .about-essay__grid,
  .about-ai,
  .about-links__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .about-hero,
  .about-hero__overlay {
    min-height: 62svh;
  }

  .about-hero__overlay,
  .about-essay__card,
  .about-ai__card,
  .about-links__card {
    padding: 22px;
  }
}
</style>
