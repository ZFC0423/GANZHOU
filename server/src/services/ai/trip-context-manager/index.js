import { TRIP_CONTEXT_VERSION, createDefaultSessionContext } from './contracts.js';
import { isPlainObject, normalizeText } from './conflict-checker.js';
import { mergeConstraints } from './merge-constraints.js';
import { mergeEvents } from './merge-events.js';

function normalizePreviousSessionContext(value) {
  const defaults = createDefaultSessionContext();
  const source = isPlainObject(value) ? value : {};

  return {
    ...defaults,
    ...source,
    trip_constraints: isPlainObject(source.trip_constraints)
      ? source.trip_constraints
      : defaults.trip_constraints
  };
}

function normalizeMeta(value) {
  const source = isPlainObject(value) ? value : {};

  return {
    last_task_type: normalizeText(source.last_task_type) || null,
    last_agent: normalizeText(source.last_agent) || null,
    last_result_status: normalizeText(source.last_result_status) || null
  };
}

function hasMetaChange(previous, meta) {
  return previous.last_task_type !== meta.last_task_type ||
    previous.last_agent !== meta.last_agent ||
    previous.last_result_status !== meta.last_result_status;
}

export function mergeTripContext(payload = {}) {
  const previous = normalizePreviousSessionContext(payload.previous_session_context);
  const constraintsResult = mergeConstraints({
    previousTripConstraints: previous.trip_constraints,
    deltaConstraints: payload.delta_constraints,
    clearFields: payload.clear_fields
  });
  const eventsResult = mergeEvents(previous, payload.structured_events || {});
  const meta = normalizeMeta(payload.meta);
  const metaChanged = hasMetaChange(previous, meta);
  const sessionContext = {
    trip_constraints: constraintsResult.trip_constraints,
    selected_options: eventsResult.selected_options,
    rejected_options: eventsResult.rejected_options,
    locked_targets: eventsResult.locked_targets,
    last_task_type: meta.last_task_type,
    last_agent: meta.last_agent,
    last_result_status: meta.last_result_status
  };
  const warnings = [
    ...constraintsResult.warnings,
    ...eventsResult.warnings
  ];
  const changed = constraintsResult.changed || eventsResult.changed || metaChanged;

  return {
    context_version: TRIP_CONTEXT_VERSION,
    update_status: warnings.some((warning) => warning.code === 'invalid_payload') ? 'invalid' : changed ? 'updated' : 'unchanged',
    session_context: sessionContext,
    applied_delta: constraintsResult.applied_delta,
    cleared_fields: constraintsResult.cleared_fields,
    applied_events: eventsResult.applied_events,
    conflicts: [],
    warnings
  };
}
