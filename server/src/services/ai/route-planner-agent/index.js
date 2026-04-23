// @ts-check

/** @typedef {import('./types.js').GeneratePayload} GeneratePayload */
/** @typedef {import('./types.js').NarrativePayload} NarrativePayload */
/** @typedef {import('./types.js').NarrativeGenerationMeta} NarrativeGenerationMeta */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/** @typedef {import('./types.js').RouteNarrative} RouteNarrative */
/** @typedef {import('./types.js').RevisePayload} RevisePayload */
/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: { code: string, message: string, httpStatus: number, details: unknown[] } }} ServiceResult
 */

import { generateRoutePlanEntry } from './generate-entry.js';
import { generateRoutePlanNarrativeEntry } from './narrative-entry.js';
import { reviseRoutePlanEntry } from './revise-entry.js';

/**
 * @param {{
 *   generateEntry?: typeof generateRoutePlanEntry,
 *   narrativeEntry?: typeof generateRoutePlanNarrativeEntry,
 *   reviseEntry?: typeof reviseRoutePlanEntry
 * }} [dependencies]
 */
export function createRoutePlannerAgent({
  generateEntry = generateRoutePlanEntry,
  narrativeEntry = generateRoutePlanNarrativeEntry,
  reviseEntry = reviseRoutePlanEntry
} = {}) {
  return {
    /**
     * @param {GeneratePayload} payload
     * @param {{ requestMeta?: RequestMeta }} [options]
     * @returns {Promise<ServiceResult<PublicRoutePlan>>}
     */
    generateRoutePlan(payload, options) {
      return generateEntry(payload, options);
    },
    /**
     * @param {RevisePayload} payload
     * @param {{ requestMeta?: RequestMeta }} [options]
     * @returns {Promise<ServiceResult<PublicRoutePlan>>}
     */
    reviseRoutePlan(payload, options) {
      return reviseEntry(payload, options);
    },
    /**
     * @param {NarrativePayload} payload
     * @param {{ requestMeta?: RequestMeta, signal?: AbortSignal }} [options]
     * @returns {Promise<ServiceResult<{ narrative: RouteNarrative, generation_meta: NarrativeGenerationMeta }>>}
     */
    generateRoutePlanNarrative(payload, options) {
      return narrativeEntry(payload, options);
    }
  };
}

const routePlannerAgent = createRoutePlannerAgent();

export const generateRoutePlan = routePlannerAgent.generateRoutePlan;
export const generateRoutePlanNarrative = routePlannerAgent.generateRoutePlanNarrative;
export const reviseRoutePlan = routePlannerAgent.reviseRoutePlan;
