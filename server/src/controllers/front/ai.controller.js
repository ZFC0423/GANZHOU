import { randomUUID } from 'node:crypto';

import { sendError, sendSuccess } from '../../utils/response.js';
import { chatWithGanzhouAssistant, getRecommendQuestions } from '../../services/ai-chat.service.js';
import { generateGanzhouTripPlan } from '../../services/ai-trip.service.js';
import { routeIntent } from '../../services/ai/intent-router/index.js';
import { runKnowledgeGuideAgent } from '../../services/ai/knowledge-agent/index.js';
import { generateRoutePlan, generateRoutePlanNarrative, reviseRoutePlan } from '../../services/ai/route-planner-agent/index.js';
import { runDecisionDiscoveryAgent } from '../../services/ai/decision-discovery-agent/index.js';
import { createInvalidOutput } from '../../services/ai/decision-discovery-agent/fallback.js';
import { buildDiscoveryPayloadFromRouterResult } from '../../services/ai/decision-discovery-agent/router-adapter.js';
import { mergeTripContext } from '../../services/ai/trip-context-manager/index.js';

const OPTION_KEY_PATTERN = /^scenic:\d+$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target || {}, key);
}

export function normalizeOptionKeys(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  value.forEach((item) => {
    const key = normalizeText(item);

    if (!OPTION_KEY_PATTERN.test(key) || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(key);
  });

  return normalized;
}

function copyRouteConstraintValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return value;
}

function applySessionTripConstraints(baseConstraints, sessionContext) {
  const tripConstraints = isPlainObject(sessionContext?.trip_constraints)
    ? sessionContext.trip_constraints
    : {};
  const next = { ...baseConstraints };

  Object.entries(tripConstraints).forEach(([field, value]) => {
    if (value === undefined) {
      return;
    }

    next[field] = copyRouteConstraintValue(value);
  });

  return next;
}

function buildRoutePlannerPayload({
  body,
  lockedTargets,
  sessionContext,
  useSessionTripConstraints = false
}) {
  const routerResult = isPlainObject(body.routerResult) ? body.routerResult : {};
  const constraints = isPlainObject(routerResult.constraints) ? routerResult.constraints : {};
  const effectiveConstraints = useSessionTripConstraints
    ? applySessionTripConstraints(constraints, sessionContext)
    : constraints;

  return {
    routerResult: {
      ...routerResult,
      constraints: {
        ...effectiveConstraints,
        locked_targets: lockedTargets
      }
    }
  };
}

function normalizeClearFieldsForRouteGenerate(value) {
  return Array.isArray(value)
    ? value.map((field) => normalizeText(field)).filter(Boolean)
    : [];
}

function removeClearedRouteDeltaField(target, field) {
  if (field === 'time_budget') {
    delete target.time_budget;
    return;
  }

  if (field.startsWith('time_budget.')) {
    const child = field.split('.')[1];

    if (!isPlainObject(target.time_budget)) {
      return;
    }

    target.time_budget = { ...target.time_budget };
    delete target.time_budget[child];

    if (!Object.keys(target.time_budget).length) {
      delete target.time_budget;
    }
    return;
  }

  delete target[field];
}

function buildRouteDeltaConstraints({ rawConstraints, clearFields }) {
  const { locked_targets: _ignoredLockedTargets, ...routeDeltaConstraints } = rawConstraints;

  clearFields.forEach((field) => {
    removeClearedRouteDeltaField(routeDeltaConstraints, field);
  });

  return routeDeltaConstraints;
}

function shouldExposeIntentMeta(req) {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return req.headers['x-debug-intent'] === '1' || req.query?.debug === '1';
}

function stripIntentMeta(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const { _meta, ...publicResult } = result;
  return publicResult;
}

function getClientIp(req) {
  const headers = req.headers || {};
  const forwarded = headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

export function buildRequestMeta(req, { createTraceId = randomUUID } = {}) {
  const headers = req.headers || {};
  const rawTraceId = typeof headers['x-trace-id'] === 'string' ? headers['x-trace-id'].trim() : '';

  return {
    trace_id: rawTraceId || createTraceId(),
    ip: getClientIp(req),
    user_agent: typeof headers['user-agent'] === 'string' ? headers['user-agent'] : ''
  };
}

export function createRoutePlanHandlers({
  generateRoutePlanService = generateRoutePlan,
  generateRoutePlanNarrativeService = generateRoutePlanNarrative,
  reviseRoutePlanService = reviseRoutePlan,
  mergeTripContextService = mergeTripContext,
  createTraceId = randomUUID
} = {}) {
  return {
    async routePlanGenerate(req, res, next) {
      try {
        const body = req.body || {};
        const hasStructuredEvents = hasOwn(body, 'structured_events');
        const finalLockedTargets = hasStructuredEvents
          ? normalizeOptionKeys(body.structured_events?.locked_targets || [])
          : normalizeOptionKeys(body.routerResult?.constraints?.locked_targets || []);
        const rawRouteConstraints = isPlainObject(body.routerResult?.constraints)
          ? body.routerResult.constraints
          : {};
        const routeClearFields = normalizeClearFieldsForRouteGenerate(body.routerResult?.clear_fields);
        const routeDeltaConstraints = buildRouteDeltaConstraints({
          rawConstraints: rawRouteConstraints,
          clearFields: routeClearFields
        });
        const initialContext = mergeTripContextService({
          previous_session_context: body.previous_session_context || {},
          delta_constraints: routeDeltaConstraints,
          clear_fields: routeClearFields,
          structured_events: {
            locked_targets: finalLockedTargets
          },
          meta: {
            last_task_type: 'plan_route',
            last_agent: 'route_planner',
            last_result_status: null
          }
        });
        const result = await generateRoutePlanService(buildRoutePlannerPayload({
          body,
          lockedTargets: finalLockedTargets,
          sessionContext: initialContext.session_context,
          useSessionTripConstraints: isPlainObject(body.previous_session_context)
        }), {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        const finalContext = mergeTripContextService({
          previous_session_context: initialContext.session_context,
          delta_constraints: {},
          clear_fields: [],
          structured_events: {},
          meta: {
            last_task_type: 'plan_route',
            last_agent: 'route_planner',
            last_result_status: result.value?.planning_status || null
          }
        });

        sendSuccess(res, {
          ...result.value,
          session_context: finalContext.session_context
        });
      } catch (error) {
        next(error);
      }
    },
    async routePlanNarrative(req, res, next) {
      const abortController = new AbortController();
      const requestMeta = buildRequestMeta(req, { createTraceId });

      const abortIfClientDisconnected = () => {
        if (!res.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
      const onRequestClosed = () => {
        if (req.aborted || (res.destroyed && !res.writableEnded)) {
          abortIfClientDisconnected();
        }
      };
      const onResponseClosed = () => {
        if (!res.writableEnded) {
          abortIfClientDisconnected();
        }
      };

      if (typeof req.on === 'function') {
        req.on('aborted', abortIfClientDisconnected);
        req.on('close', onRequestClosed);
      }

      if (typeof res.on === 'function') {
        res.on('close', onResponseClosed);
      }

      try {
        const result = await generateRoutePlanNarrativeService(req.body || {}, {
          requestMeta,
          signal: abortController.signal
        });

        if (result.aborted || abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        const data = {
          narrative: result.value.narrative
        };

        if (shouldExposeIntentMeta(req)) {
          data._meta = {
            generation: result.value.generation_meta
          };
        }

        sendSuccess(res, data);
      } catch (error) {
        if (abortController.signal.aborted || res.writableEnded || res.headersSent) {
          return;
        }

        next(error);
      } finally {
        if (typeof req.off === 'function') {
          req.off('aborted', abortIfClientDisconnected);
          req.off('close', onRequestClosed);
        }

        if (typeof res.off === 'function') {
          res.off('close', onResponseClosed);
        }
      }
    },
    async routePlanRevise(req, res, next) {
      try {
        const result = await reviseRoutePlanService(req.body || {}, {
          requestMeta: buildRequestMeta(req, { createTraceId })
        });

        if (!result.ok) {
          sendError(res, result.error.message, result.error.httpStatus || 400);
          return;
        }

        sendSuccess(res, result.value);
      } catch (error) {
        next(error);
      }
    }
  };
}

const routePlanHandlers = createRoutePlanHandlers();
export const routePlanGenerate = routePlanHandlers.routePlanGenerate;
export const routePlanNarrative = routePlanHandlers.routePlanNarrative;
export const routePlanRevise = routePlanHandlers.routePlanRevise;

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

export async function tripPlan(req, res, next) {
  try {
    const result = await generateGanzhouTripPlan(req);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function intent(req, res, next) {
  try {
    const result = await routeIntent(req.body || {});
    sendSuccess(res, shouldExposeIntentMeta(req) ? result : stripIntentMeta(result));
  } catch (error) {
    next(error);
  }
}

export async function knowledge(req, res, next) {
  try {
    const result = await runKnowledgeGuideAgent(req.body || {}, {
      requestMeta: {
        ip: req.ip || req.socket?.remoteAddress || ''
      }
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function discovery(req, res, next) {
  try {
    const result = await runDecisionDiscoveryAgent(req.body || {}, {
      requestMeta: buildRequestMeta(req)
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export function createDiscoveryQueryHandler({
  routeIntentService = routeIntent,
  runDecisionDiscoveryAgentService = runDecisionDiscoveryAgent,
  mergeTripContextService = mergeTripContext
} = {}) {
  return async function discoveryQueryHandler(req, res, next) {
    try {
      const body = req.body || {};
      const routerResult = await routeIntentService({
        input: body.user_query,
        priorState: body.priorState ?? null
      });

      if (routerResult.clarification_needed || routerResult.next_agent === 'safe_clarify') {
        sendSuccess(res, stripIntentMeta(routerResult));
        return;
      }

      if (routerResult.next_agent !== 'decision_discovery') {
        sendSuccess(res, createInvalidOutput({
          taskType: 'discover_options',
          reasonCode: 'unsupported_next_agent'
        }));
        return;
      }

      const contextResult = mergeTripContextService({
        previous_session_context: body.previous_session_context || {},
        delta_constraints: routerResult.constraints || {},
        clear_fields: routerResult.clear_fields || [],
        structured_events: {},
        meta: {
          last_task_type: routerResult.task_type || null,
          last_agent: 'decision_discovery',
          last_result_status: null
        }
      });
      const routerResultWithSessionContext = {
        ...routerResult,
        constraints: {
          ...(isPlainObject(routerResult.constraints) ? routerResult.constraints : {}),
          ...contextResult.session_context.trip_constraints
        }
      };
      const discoveryPayload = buildDiscoveryPayloadFromRouterResult(routerResultWithSessionContext, {
        previous_public_result: body.previous_public_result,
        decision_context: body.decision_context,
        action: body.action
      });
      const result = await runDecisionDiscoveryAgentService(discoveryPayload, {
        requestMeta: buildRequestMeta(req)
      });
      const finalContext = mergeTripContextService({
        previous_session_context: contextResult.session_context,
        delta_constraints: {},
        clear_fields: [],
        structured_events: {},
        meta: {
          last_task_type: routerResult.task_type || null,
          last_agent: 'decision_discovery',
          last_result_status: result?.result_status || null
        }
      });

      sendSuccess(res, {
        ...result,
        session_context: finalContext.session_context
      });
    } catch (error) {
      next(error);
    }
  };
}

export const discoveryQuery = createDiscoveryQueryHandler();
