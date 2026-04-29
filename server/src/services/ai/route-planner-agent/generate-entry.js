// @ts-check

/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').GeneratePayload} GeneratePayload */
/** @typedef {import('./types.js').PublicRoutePlan} PublicRoutePlan */
/** @typedef {import('./types.js').RequestMeta} RequestMeta */
/**
 * @template T
 * @typedef {{ ok: true, value: T } | { ok: false, error: { code: string, message: string, httpStatus: number, details: unknown[] } }} EntryResult
 */
/** @typedef {EntryResult<{ constraints_snapshot: ConstraintsSnapshot }>} GenerateValidationResult */

import { CANDIDATE_STATUS, PLANNING_STATUS, ROUTE_WARNING_CODES } from './contracts.js';
import { assertPublicRoutePlanContract, validateGeneratePayload } from './validate.js';
import { buildInternalBasis } from './basis.js';
import { buildGenerateFailedPlan, buildGenerateFallback, createPlanContext, attachFingerprint } from './fallback.js';
import { retrieveRouteCandidates } from './retrieve.js';
import { runRepairPolicy } from './repair-policy.js';
import { assemblePublicRoutePlan, getCapacityTarget, scheduleRoute } from './schedule.js';
import { enrichRoutePlanWithMap } from './map-enrichment.js';
import {
  SPATIAL_SKIP_REASONS,
  createUnavailableSpatialValidationResult,
  validateRouteSpatialReasonability
} from './spatial-validation.js';

export const SPATIAL_DIAGNOSTICS_MAX_MS = 1000;
export const MAX_SPATIAL_ENRICHMENT_SEGMENTS = 3;

const LOCKED_RETRIEVAL_FAILURE_STATUS = {
  [ROUTE_WARNING_CODES.LOCKED_TARGET_NOT_FOUND]: CANDIDATE_STATUS.EMPTY,
  [ROUTE_WARNING_CODES.LOCKED_TARGET_UNAVAILABLE]: CANDIDATE_STATUS.LIMITED
};

function getLockedBusinessWarnings(result) {
  return (result?.warnings || []).filter((warning) => String(warning.code || '').startsWith('locked_'));
}

function getLockedRetrievalFailureStatus(warnings) {
  const firstCode = warnings[0]?.code;
  return LOCKED_RETRIEVAL_FAILURE_STATUS[firstCode] || CANDIDATE_STATUS.READY;
}

function clonePublicPlan(routePlan) {
  return JSON.parse(JSON.stringify(routePlan));
}

function createUnavailableMapEnrichmentResult() {
  return {
    status: 'unavailable',
    provider: 'local',
    segments: [],
    fallback_used: true
  };
}

export async function defaultSpatialDiagnosticsSink({
  route_fingerprint = null,
  planning_status = null,
  spatial_validation = null
} = {}) {
  const issues = Array.isArray(spatial_validation?.issues) ? spatial_validation.issues : [];
  const skipReason = spatial_validation?.diagnostics?.skip_reason || null;
  const shouldLog = spatial_validation?.status === 'warning'
    || issues.length > 0
    || skipReason === SPATIAL_SKIP_REASONS.SPATIAL_DIAGNOSTICS_TIMEOUT;

  if (!shouldLog) {
    return;
  }

  const payload = {
    event: 'route_planner_spatial_validation_warning',
    route_fingerprint,
    planning_status,
    status: spatial_validation?.status || 'unavailable',
    issue_codes: issues.map((issue) => issue.code).filter(Boolean),
    issue_count: issues.length,
    diagnostics: {
      checked_segments: spatial_validation?.diagnostics?.checked_segments ?? 0,
      unavailable_segments: spatial_validation?.diagnostics?.unavailable_segments ?? 0,
      estimated_segments: spatial_validation?.diagnostics?.estimated_segments ?? 0,
      skipped_segments: spatial_validation?.diagnostics?.skipped_segments ?? 0,
      skip_reason: skipReason
    }
  };

  // Keep default diagnostics lightweight and sanitized; tests can inject a spy/noop sink.
  console.warn('[route-planner][spatial-validation]', payload);
}

export async function runSpatialDiagnosticsBestEffort({
  routePlan,
  constraintsSnapshot,
  mapEnrichment,
  spatialValidation,
  spatialDiagnosticsSink,
  timeoutMs = SPATIAL_DIAGNOSTICS_MAX_MS,
  maxSpatialEnrichmentSegments = MAX_SPATIAL_ENRICHMENT_SEGMENTS,
  now = () => Date.now()
}) {
  if (
    typeof mapEnrichment !== 'function'
    || typeof spatialValidation !== 'function'
    || typeof spatialDiagnosticsSink !== 'function'
  ) {
    return;
  }

  const clonedRoutePlan = clonePublicPlan(routePlan);
  const startedAt = now();
  const deadlineAt = startedAt + timeoutMs;
  let timedOut = false;
  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve('timeout');
    }, timeoutMs);
  });

  const diagnosticsPromise = (async () => {
    let mapEnrichmentResult = null;
    try {
      mapEnrichmentResult = await mapEnrichment({
        publicPlan: clonedRoutePlan,
        constraintsSnapshot,
        maxSegments: maxSpatialEnrichmentSegments,
        deadlineAt,
        now
      });
    } catch {
      mapEnrichmentResult = createUnavailableMapEnrichmentResult();
    }

    let spatialValidationResult = null;
    try {
      spatialValidationResult = await spatialValidation({
        publicPlan: clonedRoutePlan,
        constraintsSnapshot,
        mapEnrichmentResult
      });
    } catch {
      spatialValidationResult = createUnavailableSpatialValidationResult(
        SPATIAL_SKIP_REASONS.SPATIAL_VALIDATION_FAILED
      );
    }

    if (timedOut || typeof spatialDiagnosticsSink !== 'function') {
      return;
    }

    try {
      await spatialDiagnosticsSink({
        route_fingerprint: routePlan?.plan_context?.fingerprint || null,
        planning_status: routePlan?.planning_status || null,
        spatial_validation: spatialValidationResult
      });
    } catch {
      // Spatial diagnostics are best-effort only.
    }
  })().catch(() => undefined);

  try {
    const raceResult = await Promise.race([diagnosticsPromise, timeoutPromise]);
    if (raceResult === 'timeout' && spatialDiagnosticsSink === defaultSpatialDiagnosticsSink) {
      try {
        await defaultSpatialDiagnosticsSink({
          route_fingerprint: routePlan?.plan_context?.fingerprint || null,
          planning_status: routePlan?.planning_status || null,
          spatial_validation: createUnavailableSpatialValidationResult(
            SPATIAL_SKIP_REASONS.SPATIAL_DIAGNOSTICS_TIMEOUT
          )
        });
      } catch {
        // Spatial diagnostics are best-effort only.
      }
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function buildGeneratedPlan({
  constraintsSnapshot,
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy
}) {
  const primaryRetrieval = await retrieve({
    constraintsSnapshot,
    mode: 'primary'
  });
  const primaryBasis = buildInternalBasis({
    retrievalResult: primaryRetrieval,
    capacityTarget: getCapacityTarget(constraintsSnapshot),
    degraded: false
  });
  const retrievalWarnings = getLockedBusinessWarnings(primaryRetrieval);
  if (retrievalWarnings.length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: getLockedRetrievalFailureStatus(retrievalWarnings),
      warnings: retrievalWarnings,
      internalBasis: primaryBasis
    });
  }

  const primarySchedule = scheduleRoute({
    constraintsSnapshot,
    internalBasis: primaryBasis,
    mode: 'generate'
  });

  primaryBasis.capacity_target = primarySchedule.capacity_target;
  primaryBasis.capacity_achieved = primarySchedule.capacity_achieved;

  let selectedBasis = primaryBasis;
  let selectedSchedule = primarySchedule;

  if (getLockedBusinessWarnings(primarySchedule).length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: CANDIDATE_STATUS.READY,
      warnings: getLockedBusinessWarnings(primarySchedule),
      internalBasis: primaryBasis
    });
  }

  if (!primarySchedule.feasible || primarySchedule.candidate_status !== CANDIDATE_STATUS.READY) {
    const repaired = await repairPolicy({
      constraintsSnapshot,
      mode: 'generate',
      retrieve
    });
    const repairedRetrievalWarnings = getLockedBusinessWarnings(repaired.retrievalResult);
    const repairedScheduleWarnings = getLockedBusinessWarnings(repaired.scheduleResult);

    if (repairedRetrievalWarnings.length) {
      return buildGenerateFailedPlan({
        constraintsSnapshot,
        candidateStatus: getLockedRetrievalFailureStatus(repairedRetrievalWarnings),
        warnings: repairedRetrievalWarnings,
        internalBasis: repaired.internalBasis
      });
    }

    if (repairedScheduleWarnings.length) {
      return buildGenerateFailedPlan({
        constraintsSnapshot,
        candidateStatus: CANDIDATE_STATUS.READY,
        warnings: repairedScheduleWarnings,
        internalBasis: repaired.internalBasis
      });
    }

    if (repaired.scheduleResult.feasible && repaired.scheduleResult.capacity_achieved >= primarySchedule.capacity_achieved) {
      selectedBasis = repaired.internalBasis;
      selectedSchedule = repaired.scheduleResult;
    }
  }

  if (!selectedSchedule.feasible) {
    return buildGenerateFallback({
      constraintsSnapshot,
      internalBasis: selectedBasis
    });
  }

  const selectedWarnings = getLockedBusinessWarnings(selectedSchedule);
  if (selectedWarnings.length) {
    return buildGenerateFailedPlan({
      constraintsSnapshot,
      candidateStatus: CANDIDATE_STATUS.READY,
      warnings: selectedWarnings,
      internalBasis: selectedBasis
    });
  }

  const publicPlan = assemblePublicRoutePlan({
    constraintsSnapshot,
    scheduleResult: selectedSchedule,
    planningStatus: PLANNING_STATUS.GENERATED,
    internalBasis: selectedBasis
  });
  const planContext = createPlanContext({
    version: 1,
    parentFingerprint: null,
    constraintsSnapshot,
    lastAction: null,
    lastActionResult: null
  });

  return attachFingerprint(publicPlan, planContext);
}

/**
 * @param {{
 *   validatePayload?: (payload?: GeneratePayload) => GenerateValidationResult,
 *   retrieve?: typeof retrieveRouteCandidates,
 *   repairPolicy?: typeof runRepairPolicy,
 *   mapEnrichment?: ((args: { publicPlan: PublicRoutePlan, constraintsSnapshot: ConstraintsSnapshot, maxSegments?: number }) => Promise<unknown>) | null,
 *   spatialValidation?: ((args: { publicPlan: PublicRoutePlan, constraintsSnapshot: ConstraintsSnapshot, mapEnrichmentResult: unknown }) => Promise<unknown> | unknown) | null,
 *   spatialDiagnosticsSink?: ((input: { route_fingerprint: string | null, planning_status: string | null, spatial_validation: unknown }) => Promise<void> | void) | null,
 *   spatialDiagnosticsTimeoutMs?: number,
 *   maxSpatialEnrichmentSegments?: number,
 *   now?: () => number
 * }} [dependencies]
 */
export function createGenerateRoutePlanEntry({
  validatePayload = /** @type {(payload?: GeneratePayload) => GenerateValidationResult} */ (validateGeneratePayload),
  retrieve = retrieveRouteCandidates,
  repairPolicy = runRepairPolicy,
  mapEnrichment = enrichRoutePlanWithMap,
  spatialValidation = validateRouteSpatialReasonability,
  spatialDiagnosticsSink = defaultSpatialDiagnosticsSink,
  spatialDiagnosticsTimeoutMs = SPATIAL_DIAGNOSTICS_MAX_MS,
  maxSpatialEnrichmentSegments = MAX_SPATIAL_ENRICHMENT_SEGMENTS,
  now = () => Date.now()
} = {}) {
  /**
   * @param {GeneratePayload} [payload]
   * @param {{ requestMeta?: Partial<RequestMeta> }} [options]
   * @returns {Promise<EntryResult<PublicRoutePlan>>}
   */
  return async function generateRoutePlanEntry(payload = {}, { requestMeta = {} } = {}) {
    void requestMeta;

    const validated = validatePayload(payload);
    if (!validated.ok) {
      return validated;
    }

    const routePlan = await buildGeneratedPlan({
      constraintsSnapshot: validated.value.constraints_snapshot,
      retrieve,
      repairPolicy
    });

    assertPublicRoutePlanContract(routePlan);

    await runSpatialDiagnosticsBestEffort({
      routePlan,
      constraintsSnapshot: validated.value.constraints_snapshot,
      mapEnrichment,
      spatialValidation,
      spatialDiagnosticsSink,
      timeoutMs: spatialDiagnosticsTimeoutMs,
      maxSpatialEnrichmentSegments,
      now
    });

    return {
      ok: true,
      value: routePlan
    };
  };
}

export const generateRoutePlanEntry = createGenerateRoutePlanEntry();
