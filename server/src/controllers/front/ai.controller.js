import { sendSuccess } from '../../utils/response.js';
import { chatWithGanzhouAssistant, getRecommendQuestions } from '../../services/ai-chat.service.js';

export async function recommendQuestions(req, res, next) {
  try {
    sendSuccess(res, getRecommendQuestions());
  } catch (error) {
    next(error);
  }
}

export async function chat(req, res, next) {
  try {
    const result = await chatWithGanzhouAssistant(req);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
