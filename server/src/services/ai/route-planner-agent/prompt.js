// @ts-check

/** @typedef {import('./types.js').NarrativeInput} NarrativeInput */
/** @typedef {import('./types.js').PublicBasisItem} PublicBasisItem */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/**
 * @typedef {{ role: 'system' | 'user', content: string }} NarrativeMessage
 * @typedef {{
 *   ok: true,
 *   narrative_input: NarrativeInput,
 *   input_size: number,
 *   max_budget: number,
 *   messages: NarrativeMessage[]
 * } | {
 *   ok: false,
 *   reason: string,
 *   narrative_input: NarrativeInput,
 *   input_size: number,
 *   max_budget: number
 * }} NarrativePromptBundle
 */

import {
  CANDIDATE_STATUS,
  MAX_ITEM_TITLES_PER_DAY,
  MAX_NARRATIVE_INPUT_BUDGET,
  NARRATIVE_FALLBACK_REASONS
} from './contracts.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

/**
 * @param {PublicBasisItem[]} items
 */
function summarizeMatchedBy(items) {
  return items.reduce((summary, item) => {
    (Array.isArray(item.matched_by) ? item.matched_by : [])
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .forEach((key) => {
        summary[key] = (summary[key] || 0) + 1;
      });

    return summary;
  }, /** @type {Record<string, number>} */ ({}));
}

function shouldIncludeBasisSignals(publicPlan) {
  return (
    publicPlan.candidate_status !== CANDIDATE_STATUS.READY ||
    Boolean(publicPlan.plan_context.last_action_result?.reason_code)
  );
}

/**
 * @param {PublicRoutePlan} publicPlan
 * @param {{ maxItemTitlesPerDay?: number }} [options]
 * @returns {NarrativeInput}
 */
export function buildNarrativeInput(publicPlan, { maxItemTitlesPerDay = MAX_ITEM_TITLES_PER_DAY } = {}) {
  const maxTitles = Number.isInteger(maxItemTitlesPerDay) && maxItemTitlesPerDay > 0
    ? maxItemTitlesPerDay
    : MAX_ITEM_TITLES_PER_DAY;
  const lastActionResult = publicPlan.plan_context.last_action_result;

  const narrativeInput = /** @type {NarrativeInput} */ ({
    candidate_status: publicPlan.candidate_status,
    planning_status: publicPlan.planning_status,
    route_positioning: publicPlan.route_positioning,
    summary: publicPlan.summary,
    days: publicPlan.days.map((day) => {
      const itemTitles = day.items.map((item) => normalizeText(item.title)).filter(Boolean);
      const visibleTitles = itemTitles.slice(0, maxTitles);

      return {
        day_index: day.day_index,
        region_key: day.region_key,
        item_titles: visibleTitles,
        item_count: day.items.length,
        omitted_count: Math.max(0, itemTitles.length - visibleTitles.length),
        is_empty_day: day.items.length === 0
      };
    }),
    route_highlights: [...publicPlan.route_highlights],
    adjustment_options: publicPlan.adjustment_options.map((option) => ({
      type: option.type,
      label: option.label
    })),
    last_action: publicPlan.plan_context.last_action,
    last_action_result: lastActionResult
      ? {
          status: lastActionResult.status,
          reason_code: lastActionResult.reason_code
        }
      : null
  });

  if (shouldIncludeBasisSignals(publicPlan)) {
    narrativeInput.basis_source = publicPlan.basis.source;
    narrativeInput.basis_item_count = publicPlan.basis.items.length;
    narrativeInput.matched_by_summary = summarizeMatchedBy(publicPlan.basis.items);
  }

  return narrativeInput;
}

/**
 * @param {NarrativeInput} narrativeInput
 */
export function estimateNarrativeInputBudget(narrativeInput) {
  return JSON.stringify(narrativeInput).length;
}

/**
 * @param {NarrativeInput} narrativeInput
 * @returns {NarrativeMessage[]}
 */
export function buildRouteNarrativeMessages(narrativeInput) {
  const systemPrompt = [
    '你是赣州文旅路线说明层生成器。',
    '你收到的是已经由后端代码确定的路线骨架，只能解释给定骨架，不能重新规划路线。',
    '严禁新增景点、删除景点、替换景点、重排行程、修改天数、修改区域、修改调整动作、修改 route_highlights。',
    'route_highlights 是代码生成的结构事实，你只能参考它解释路线气质，不得输出或重构 route_highlights 字段。',
    '如果某天 is_empty_day 为 true 或 item_count 为 0，只能说明该日暂无既定行程、可休整、自由安排或候选不足；严禁脑补具体景点、活动或路线安排。',
    '输出必须是严格 JSON 对象，只允许字段 overview、day_summaries、adjustment_hint、constraint_note。',
    'day_summaries 必须覆盖输入中的全部 day_index，不能缺失、重复或越界。',
    '所有内部双引号必须转义为 \\"，所有换行必须写成 \\n，严禁输出原生回车。',
    '不得输出 Markdown，不得输出代码块，不得输出解释文字。'
  ].join('\n');

  const userPrompt = [
    '请基于以下已验真的路线骨架摘要生成中文说明层 JSON。',
    JSON.stringify(narrativeInput)
  ].join('\n\n');

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}

/**
 * @param {PublicRoutePlan} publicPlan
 * @param {{
 *   maxItemTitlesPerDay?: number,
 *   maxNarrativeInputBudget?: number
 * }} [options]
 * @returns {NarrativePromptBundle}
 */
export function buildNarrativePromptBundle(publicPlan, options = {}) {
  const narrativeInput = buildNarrativeInput(publicPlan, {
    maxItemTitlesPerDay: options.maxItemTitlesPerDay
  });
  const requestedBudget = options.maxNarrativeInputBudget;
  const maxBudget = typeof requestedBudget === 'number' && Number.isInteger(requestedBudget) && requestedBudget > 0
    ? requestedBudget
    : MAX_NARRATIVE_INPUT_BUDGET;
  const inputSize = estimateNarrativeInputBudget(narrativeInput);

  if (inputSize > maxBudget) {
    return {
      ok: false,
      reason: NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED,
      narrative_input: narrativeInput,
      input_size: inputSize,
      max_budget: maxBudget
    };
  }

  return {
    ok: true,
    narrative_input: narrativeInput,
    input_size: inputSize,
    max_budget: maxBudget,
    messages: buildRouteNarrativeMessages(narrativeInput)
  };
}
