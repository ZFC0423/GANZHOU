import { pickNarrativeText } from '../utils/narrative-text';
import { getContextCard, normalizeContextCards } from './narrative-cards';

function buildAnswerBlocks(data) {
  if (Array.isArray(data.answerBlocks) && data.answerBlocks.length) {
    return data.answerBlocks.filter((item) => item?.content);
  }

  const blocks = [];

  if (data.directAnswer || data.answer) {
    blocks.push({
      type: 'lead',
      title: '导览首答',
      content: data.directAnswer || data.answer
    });
  }

  if (data.culturalContext) {
    blocks.push({
      type: 'context',
      title: '文化线索',
      content: data.culturalContext
    });
  }

  return blocks;
}

export function buildChatRecord(data, currentQuestion) {
  const citations = normalizeContextCards(Array.isArray(data.citations) ? data.citations : []);
  const relatedCards = normalizeContextCards(Array.isArray(data.relatedCards) ? data.relatedCards : []);
  const heroSpotlight = getContextCard(data.heroSpotlight)
    || relatedCards[0]
    || citations[0]
    || null;
  const followupPrompts = Array.isArray(data.followupPrompts) && data.followupPrompts.length
    ? data.followupPrompts
    : data.nextSteps || [];

  return {
    question: currentQuestion,
    leadTitle: pickNarrativeText(data.leadTitle, `关于“${currentQuestion}”的导览回答`),
    answerBlocks: buildAnswerBlocks(data),
    citations: citations.length ? citations : relatedCards,
    followupPrompts,
    heroSpotlight,
    relatedTopics: data.relatedTopics || [],
    relatedSpots: data.relatedSpots || [],
    modelName: data.model_name || ''
  };
}
