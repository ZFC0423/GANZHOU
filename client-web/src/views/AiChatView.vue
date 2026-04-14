<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getRecommendQuestionsApi, postAiChatApi } from '../api/ai';

const question = ref('');
const loading = ref(false);
const recommendLoading = ref(false);
const errorMessage = ref('');
const recommendQuestions = ref([]);
const chatRecords = ref([]);

async function loadRecommendQuestions() {
  recommendLoading.value = true;

  try {
    const response = await getRecommendQuestionsApi();
    recommendQuestions.value = response.data || [];
  } catch (error) {
    recommendQuestions.value = [];
  } finally {
    recommendLoading.value = false;
  }
}

async function submitQuestion(customQuestion) {
  if (loading.value) {
    return;
  }

  const currentQuestion = String(customQuestion ?? question.value).trim();

  if (!currentQuestion) {
    ElMessage.warning('请先输入问题');
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await postAiChatApi({ question: currentQuestion });
    chatRecords.value.unshift({
      question: currentQuestion,
      directAnswer: response.data.directAnswer,
      culturalContext: response.data.culturalContext,
      relatedTopics: response.data.relatedTopics || [],
      relatedSpots: response.data.relatedSpots || [],
      nextSteps: response.data.nextSteps || [],
      answer: response.data.answer,
      modelName: response.data.model_name || '',
      matchedContext: response.data.matchedContext || []
    });
    question.value = '';
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '问答服务暂时繁忙，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleRecommendClick(item) {
  if (loading.value) {
    return;
  }

  question.value = item;
  submitQuestion(item);
}

onMounted(loadRecommendQuestions);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="ai-chat-hero">
        <div>
          <div class="ai-chat-hero__eyebrow">智慧问答</div>
          <h1 class="page-title">赣州文旅问答</h1>
          <p class="page-subtitle">
            围绕赣州旅游与文化内容，提供景点、美食、非遗与红色文化的信息查询与参考建议。
          </p>
        </div>
      </section>

      <section class="chat-container">
        <el-card class="ai-chat-card">
          <template #header>
            <div class="ai-chat-card__header">
              <span class="chat-header-title">输入您的问题</span>
              <span class="ai-chat-card__tip">可以从景点、文化主题、旅行安排等方向提问</span>
            </div>
          </template>

          <el-input
            v-model="question"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="例如：如果我想理解赣州的客家文化，应该从哪里开始？"
          />

          <div class="ai-chat-actions">
            <div class="recommend-inline" v-if="!recommendLoading && recommendQuestions.length">
              <el-button 
                v-for="item in recommendQuestions.slice(0, 3)" 
                :key="item" 
                text bg size="small" 
                :disabled="loading"
                @click="handleRecommendClick(item)"
              >
                {{ item }}
              </el-button>
            </div>
            <el-button type="primary" :loading="loading" @click="submitQuestion()" class="submit-btn">
              {{ loading ? '正在查询...' : '提交问题' }}
            </el-button>
          </div>
        </el-card>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="page-alert"
        />

        <div class="chat-history">
          <div v-if="loading" class="chat-bubble chat-bubble--ai loading-bubble">
            <div class="bubble-avatar">AI</div>
            <div class="bubble-content">
              <div class="bubble-text">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <div class="loading-text">正在检索平台文旅内容...</div>
              </div>
            </div>
          </div>

          <el-empty
            v-if="!chatRecords.length && !loading"
            description="期待您的提问，开启智慧旅程"
            :image-size="120"
          />

          <transition-group name="list" tag="div" class="chat-list">
            <template v-for="(item, index) in chatRecords" :key="`${item.question}-${index}`">
              <!-- User Bubble (appears on the right) -->
              <div class="chat-bubble chat-bubble--user">
                <div class="bubble-content">
                  <div class="bubble-info bubble-info--user">
                    <span class="bubble-name">您</span>
                  </div>
                  <div class="bubble-text">{{ item.question }}</div>
                </div>
                <div class="bubble-avatar">我</div>
              </div>

              <!-- AI Bubble (appears on the left) -->
              <div class="chat-bubble chat-bubble--ai">
                <div class="bubble-avatar">AI</div>
                <div class="bubble-content">
                  <div class="bubble-info">
                    <span class="bubble-name">问答助手</span>
                    <span v-if="item.modelName" class="bubble-model">{{ item.modelName }}</span>
                  </div>
                  <div class="bubble-body">
                    <!-- 直接回答 (新老字段兼容) -->
                    <div class="bubble-section bubble-direct" v-if="item.directAnswer || item.answer">
                      {{ item.directAnswer || item.answer }}
                    </div>
                    
                    <!-- 文化线索 -->
                    <div class="bubble-section bubble-cultural" v-if="item.culturalContext">
                      <div class="section-badge">文化线索</div>
                      <div class="section-content">{{ item.culturalContext }}</div>
                    </div>

                    <!-- 关联内容 -->
                    <div class="bubble-related" v-if="item.relatedSpots?.length || item.relatedTopics?.length">
                      <div v-if="item.relatedSpots?.length" class="related-group">
                        <span class="related-label">关联景点：</span>
                        <el-tag 
                          v-for="spot in item.relatedSpots" :key="spot" 
                          size="small" type="success" effect="plain" round
                        >
                          {{ spot }}
                        </el-tag>
                      </div>
                      <div v-if="item.relatedTopics?.length" class="related-group">
                        <span class="related-label">关联主题：</span>
                        <el-tag 
                          v-for="topic in item.relatedTopics" :key="topic" 
                          size="small" type="warning" effect="plain" round
                        >
                          {{ topic }}
                        </el-tag>
                      </div>
                    </div>

                    <!-- 下一步探索 -->
                    <div class="bubble-next-steps" v-if="item.nextSteps?.length">
                      <div class="next-step-title">下一步探索建议</div>
                      <div class="next-step-list">
                        <div v-for="(step, idx) in item.nextSteps" :key="idx" class="next-step-item">
                          <span>{{ step }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="bubble-context" v-if="item.matchedContext && item.matchedContext.length">
                    <div class="context-title">相关资料线索：</div>
                    <div class="context-tags">
                      <el-tag 
                        v-for="context in item.matchedContext" 
                        :key="`${context.type}-${context.id}`" 
                        type="info" 
                        effect="plain" 
                        round
                      >
                        {{ context.type === 'scenic' ? '景点' : '文章' }} · {{ context.title }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </transition-group>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.ai-chat-hero {
  padding: 40px 32px;
  border-radius: var(--radius-panel);
  margin-bottom: 32px;
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.14), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 239, 0.96));
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.ai-chat-hero__eyebrow {
  color: var(--color-accent);
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 12px;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.chat-container {
  max-width: var(--container-narrow);
  margin: 0 auto;
}

.ai-chat-card {
  margin-bottom: 32px;
}

.ai-chat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.chat-header-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.ai-chat-card__tip {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.ai-chat-actions {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.recommend-inline {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}

.submit-btn {
  padding: 0 32px;
  border-radius: 999px;
}

.page-alert {
  margin-bottom: 24px;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.chat-bubble {
  display: flex;
  gap: 16px;
  max-width: 85%;
  animation: fadeIn 0.4s ease-out;
}

.chat-bubble--user {
  align-self: flex-end;
}

.chat-bubble--user .bubble-content {
  align-items: flex-end;
}

.chat-bubble--user .bubble-text {
  background: var(--color-accent);
  color: #fff;
  border-radius: 20px 20px 4px 20px;
}

.chat-bubble--ai {
  align-self: flex-start;
}

.chat-bubble--ai .bubble-text {
  background: rgba(255, 255, 255, 0.96);
  color: var(--color-text-primary);
  border-radius: 14px 20px 20px 20px;
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
}

.bubble-avatar {
  min-width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.chat-bubble--user .bubble-avatar {
  background: rgba(255, 56, 92, 0.1);
  color: var(--color-accent);
}

.chat-bubble--ai .bubble-avatar {
  background: var(--surface-muted);
  color: var(--color-text-primary);
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bubble-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  padding: 0 4px;
}

.bubble-info--user {
  justify-content: flex-end;
}

.bubble-name {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.bubble-model {
  color: var(--color-text-tertiary);
  background: var(--surface-muted);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.bubble-text {
  padding: 16px 20px;
  line-height: 1.75;
  white-space: pre-line;
  font-size: 15px;
}

.bubble-body {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 14px 20px 20px 20px;
  border: 1px solid rgba(236, 231, 223, 0.9);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
}

.bubble-section {
  line-height: 1.75;
  white-space: pre-line;
  font-size: 15px;
  color: var(--color-text-primary);
}

.bubble-cultural {
  background: rgba(255, 56, 92, 0.06);
  padding: 12px 16px;
  border-radius: 16px;
  border-left: 3px solid var(--color-accent);
}

.section-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 6px;
}

.section-content {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.bubble-related {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-soft);
}

.related-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.related-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.bubble-next-steps {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 248, 0.96));
  padding: 12px 16px;
  border-radius: 16px;
  margin-top: 4px;
  border: 1px solid rgba(255, 56, 92, 0.12);
}

.next-step-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 10px;
}

.next-step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-step-item {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.next-step-item::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  background-color: var(--color-accent);
  border-radius: 50%;
  margin-top: 8px;
  flex-shrink: 0;
}

.bubble-context {
  margin-top: 8px;
  padding: 12px 16px;
  background: var(--surface-muted);
  border-radius: 16px;
  border: 1px dashed rgba(221, 216, 209, 0.92);
}

.context-title {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
  font-weight: 500;
}

.context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.loading-bubble .bubble-text {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@media (max-width: 768px) {
  .chat-bubble {
    max-width: 95%;
  }
}
</style>
