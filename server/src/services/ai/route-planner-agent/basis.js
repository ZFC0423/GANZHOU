// @ts-check

/** @typedef {import('./types.js').CandidateRecord} CandidateRecord */
/** @typedef {import('./types.js').InternalBasis} InternalBasis */
/** @typedef {import('./types.js').PublicBasisItem} PublicBasisItem */
/** @typedef {import('./types.js').RetrievalResult} RetrievalResult */

import { CANDIDATE_STATUS, PUBLIC_BASIS_ITEM_LIMIT, ROUTE_PLANNER_SOURCE } from './contracts.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function compareCandidates(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  if (right.recommend_flag !== left.recommend_flag) return right.recommend_flag - left.recommend_flag;
  if (right.hot_score !== left.hot_score) return right.hot_score - left.hot_score;
  if (left.source_type !== right.source_type) return left.source_type === 'scenic' ? -1 : 1;
  return left.item_key.localeCompare(right.item_key, 'zh-CN');
}

/**
 * @param {CandidateRecord[]} candidates
 * @returns {PublicBasisItem[]}
 */
export function projectPublicBasisItems(candidates) {
  return [...candidates]
    .sort(compareCandidates)
    .slice(0, PUBLIC_BASIS_ITEM_LIMIT)
    .map((candidate, index) => ({
      item_key: candidate.item_key,
      source_type: candidate.source_type,
      title: candidate.title,
      region_key: candidate.region_key,
      matched_by: [...candidate.matched_by].map((item) => normalizeText(item)).filter(Boolean).sort((left, right) => left.localeCompare(right, 'zh-CN')),
      score_rank: index + 1
    }));
}

export function classifyCandidateStatus({
  hardFeasible = true,
  capacityTarget = 0,
  capacityAchieved = 0,
  degraded = false
} = {}) {
  if (!hardFeasible || capacityAchieved <= 0) {
    return CANDIDATE_STATUS.EMPTY;
  }

  if (degraded || capacityAchieved < capacityTarget) {
    return CANDIDATE_STATUS.LIMITED;
  }

  return CANDIDATE_STATUS.READY;
}

/**
 * @param {{
 *   retrievalResult: RetrievalResult,
 *   capacityTarget?: number,
 *   capacityAchieved?: number,
 *   degraded?: boolean,
 *   diagnostics?: string[]
 * }} input
 * @returns {InternalBasis}
 */
export function buildInternalBasis({
  retrievalResult,
  capacityTarget = 0,
  capacityAchieved = 0,
  degraded = false,
  diagnostics = []
}) {
  const candidates = [...retrievalResult.candidates].sort(compareCandidates);
  const routeCandidates = candidates.filter((candidate) => candidate.is_route_item);

  return {
    source: ROUTE_PLANNER_SOURCE,
    retrieval_mode: retrievalResult.mode,
    candidates,
    route_candidates: routeCandidates,
    public_items: projectPublicBasisItems(candidates),
    diagnostics: [...retrievalResult.diagnostics, ...diagnostics],
    degraded,
    capacity_target: capacityTarget,
    capacity_achieved: capacityAchieved
  };
}

/**
 * @param {InternalBasis} internalBasis
 */
export function buildPublicBasis(internalBasis) {
  return {
    source: internalBasis.source,
    items: internalBasis.public_items
  };
}

export const ROUTE_BASIS_PRIVATE = {
  compareCandidates
};
