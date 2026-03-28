import request from './request';

export function getRecommendQuestionsApi() {
  return request.get('/api/front/ai/recommend-questions');
}

export function postAiChatApi(data) {
  return request.post('/api/front/ai/chat', data, {
    timeout: 30000
  });
}
