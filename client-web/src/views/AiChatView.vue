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
      answer: response.data.answer,
      modelName: response.data.model_name || '',
      matchedContext: response.data.matchedContext || []
    });
    question.value = currentQuestion;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '智能助理网络繁忙，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleRecommendClick(item) {
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
          <div class="ai-chat-hero__eyebrow">智游助手</div>
          <h1 class="page-title">探索山水客家，随时向我提问</h1>
          <p class="page-subtitle">
            基于本地智慧文旅知识库，为您解答关于赣州风物、红色记忆与自然景观的疑惑。
          </p>
        </div>
      </section>

      <section class="chat-container">
        <el-card class="ai-chat-card">
          <template #header>
            <div class="ai-chat-card__header">
              <span class="chat-header-title">开启智慧旅程</span>
              <span class="ai-chat-card__tip">试试问我关于客家美食或红色遗址</span>
            </div>
          </template>

          <el-input
            v-model="question"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="例如：赣州有哪些适合周末漫步的地方？"
          />

          <div class="ai-chat-actions">
            <div class="recommend-inline" v-if="!recommendLoading && recommendQuestions.length">
              <el-button 
                v-for="item in recommendQuestions.slice(0, 3)" 
                :key="item" 
                text bg size="small" 
                @click="handleRecommendClick(item)"
              >
                {{ item }}
              </el-button>
            </div>
            <el-button type="primary" :loading="loading" @click="submitQuestion()" class="submit-btn">
              {{ loading ? '助理思考中...' : '发送问题' }}
            </el-button>
          </div>
        </el-card>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          style="margin-bottom: 24px;"
        />

        <div class="chat-history">
          <div v-if="loading" class="chat-bubble chat-bubble--ai loading-bubble">
            <div class="bubble-avatar">AI</div>
            <div class="bubble-content">
              <div class="bubble-text">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <div class="loading-text">正在翻阅赣州文旅典籍...</div>
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
                <div class="bubble-avatar">You</div>
              </div>

              <!-- AI Bubble (appears on the left) -->
              <div class="chat-bubble chat-bubble--ai">
                <div class="bubble-avatar">AI</div>
                <div class="bubble-content">
                  <div class="bubble-info">
                    <span class="bubble-name">智游助手</span>
                    <span v-if="item.modelName" class="bubble-model">{{ item.modelName }}</span>
                  </div>
                  <div class="bubble-text">{{ item.answer }}</div>
                  
                  <div class="bubble-context" v-if="item.matchedContext && item.matchedContext.length">
                    <div class="context-title">📌 参考资料库片段：</div>
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
  border-radius: var(--gz-radius-md);
  margin-bottom: 32px;
  background: linear-gradient(135deg, #e0f2fe, #dcfce7);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.ai-chat-hero__eyebrow {
  color: var(--gz-brand-primary-hover);
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 14px;
  letter-spacing: 1px;
}

.chat-container {
  max-width: 860px;
  margin: 0 auto;
}

.ai-chat-card {
  margin-bottom: 32px;
  border-radius: var(--gz-radius-md) !important;
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
  font-weight: 600;
  color: var(--gz-brand-secondary);
}

.ai-chat-card__tip {
  color: var(--gz-text-secondary);
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
  border-radius: 20px;
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
  background: var(--gz-brand-primary);
  color: #fff;
  border-radius: 20px 20px 4px 20px;
}

.chat-bubble--ai {
  align-self: flex-start;
}

.chat-bubble--ai .bubble-text {
  background: #fff;
  color: var(--gz-text-primary);
  border-radius: 4px 20px 20px 20px;
  border: 1px solid var(--gz-border-light);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
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
  background: #bae6fd;
  color: #0369a1;
}

.chat-bubble--ai .bubble-avatar {
  background: #ccfbf1;
  color: var(--gz-brand-primary);
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
  color: var(--gz-text-regular);
}

.bubble-model {
  color: #94a3b8;
  background: #f1f5f9;
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

.bubble-context {
  margin-top: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.context-title {
  font-size: 13px;
  color: var(--gz-text-regular);
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
  color: var(--gz-text-regular);
  font-size: 14px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--gz-brand-primary);
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
