// @ts-check

/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RouteNarrative} RouteNarrative */

import {
  CANDIDATE_STATUS,
  LAST_ACTION_RESULT_STATUS,
  NARRATIVE_FALLBACK_REASONS,
  PLANNING_STATUS
} from './contracts.js';

const FAILED_PLAN_NARRATIVE_TEXT = '由于当前锁定景点与时间、节奏或体力约束存在冲突，路线暂未成功生成，因此暂无详细行程说明。请减少锁定景点或调整出行天数、节奏偏好后重新生成。';
const FAILED_PLAN_DAY_TEXT = '当前路线未成功生成，本日暂无已确认行程说明。';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function formatTitleList(titles) {
  if (!titles.length) {
    return '已选点位';
  }

  if (titles.length === 1) {
    return titles[0];
  }

  return `${titles.slice(0, -1).join('、')}与${titles[titles.length - 1]}`;
}

function getDayIntro(day) {
  if (!day.items.length) {
    return '今日暂无固定行程安排，可作为预留或休整日；当前候选不足，暂未安排固定点位。';
  }

  const titles = day.items
    .map((item) => normalizeText(item.title))
    .filter(Boolean)
    .slice(0, 4);

  return `第 ${day.day_index} 天围绕 ${day.region_key} 展开，已安排 ${formatTitleList(titles)} 等点位；说明层只解释该既定骨架，不改变顺序与天数。`;
}

function buildOverview(publicPlan, reason) {
  if (reason === NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN || publicPlan.planning_status === PLANNING_STATUS.FAILED) {
    return FAILED_PLAN_NARRATIVE_TEXT;
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_EMPTY || publicPlan.candidate_status === CANDIDATE_STATUS.EMPTY) {
    return '当前路线骨架暂未形成可用固定点位，说明层采用本地兜底文案，避免为候选不足的行程编造内容。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.LIMITED) {
    return '当前路线已形成可用骨架，但候选数量或匹配强度有限，说明层采用克制表达，优先保持路线事实稳定。';
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用，原路线骨架已保留；说明层基于保留后的既定方案生成，不改写路线结构。';
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.APPLIED) {
    return `本次调整已应用，当前形成 ${publicPlan.summary.total_days} 天路线骨架；说明层围绕新的区域与节奏变化进行解释。`;
  }

  return `当前形成 ${publicPlan.summary.total_days} 天路线骨架，共 ${publicPlan.summary.total_items} 个点位；说明层采用本地稳定文案补充路线气质与阅读节奏。`;
}

function buildAdjustmentHint(publicPlan) {
  if (publicPlan.planning_status === PLANNING_STATUS.FAILED) {
    return FAILED_PLAN_NARRATIVE_TEXT;
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用；如需继续修改，可换一个更明确的调整方向，例如放慢节奏、聚焦同一区域或替换跨区点位。';
  }

  if (publicPlan.adjustment_options.length) {
    return '可继续通过压缩天数、扩展天数、放慢节奏、聚焦同一区域、替换跨区点位或亲子友好筛选微调路线。';
  }

  return '当前暂无额外调整建议，可先阅读现有路线骨架。';
}

function buildConstraintNote(publicPlan, reason) {
  if (reason === NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN || publicPlan.planning_status === PLANNING_STATUS.FAILED) {
    return FAILED_PLAN_NARRATIVE_TEXT;
  }

  if (publicPlan.plan_context.last_action_result?.status === LAST_ACTION_RESULT_STATUS.REJECTED) {
    return '本次调整未应用，原方案已保留；系统没有为了满足调整而强行加入低相关点位。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.INPUT_BUDGET_EXCEEDED) {
    return '路线信息较长，说明层已降级为本地保守摘要；路线骨架未被修改。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.TIMEOUT) {
    return '模型说明生成超时，系统已切换为本地兜底说明；路线骨架未受影响。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.INVALID_JSON || reason === NARRATIVE_FALLBACK_REASONS.SCHEMA_VIOLATION) {
    return '模型输出未通过结构校验，系统已切换为本地兜底说明；路线骨架未被模型改写。';
  }

  if (reason === NARRATIVE_FALLBACK_REASONS.MISSING_AI_ENV || reason === NARRATIVE_FALLBACK_REASONS.PROVIDER_ERROR) {
    return '模型服务当前不可用，系统已切换为本地兜底说明；路线骨架仍由后端规则保证。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.EMPTY) {
    return '当前硬约束下没有形成可用固定点位，建议放宽部分偏好后重新生成。';
  }

  if (publicPlan.candidate_status === CANDIDATE_STATUS.LIMITED) {
    return '当前候选有限，系统优先保留相关性，没有为了凑满容量加入低相关点位。';
  }

  return '说明层只解释已有骨架，不改变天数、点位、顺序、区域或调整选项。';
}

/**
 * @param {{
 *   publicPlan: PublicRoutePlan,
 *   reason?: string | null
 * }} input
 * @returns {RouteNarrative}
 */
export function buildFallbackNarrative({ publicPlan, reason = null }) {
  const isFailedPlan = reason === NARRATIVE_FALLBACK_REASONS.SHORT_CIRCUIT_FAILED_PLAN || publicPlan.planning_status === PLANNING_STATUS.FAILED;

  return {
    overview: buildOverview(publicPlan, reason),
    day_summaries: publicPlan.days.map((day) => ({
      day_index: day.day_index,
      text: isFailedPlan ? FAILED_PLAN_DAY_TEXT : getDayIntro(day)
    })),
    adjustment_hint: buildAdjustmentHint(publicPlan),
    constraint_note: buildConstraintNote(publicPlan, reason)
  };
}
