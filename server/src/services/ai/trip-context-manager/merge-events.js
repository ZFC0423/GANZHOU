import { WARNING_CODES, createWarning } from './contracts.js';
import { normalizeOptionKeys } from './conflict-checker.js';

function dedupe(items) {
  return Array.from(new Set(items));
}

function mergeAppendList({
  previous,
  add,
  remove,
  clear,
  addField,
  removeField,
  warnings
}) {
  const additions = normalizeOptionKeys(add, addField, warnings);
  const removals = normalizeOptionKeys(remove, removeField, warnings);
  const addSet = new Set(additions);

  removals
    .filter((optionKey) => addSet.has(optionKey))
    .forEach((optionKey) => {
      warnings.push(createWarning({
        code: WARNING_CODES.EVENT_REMOVE_AND_ADD_SAME_OPTION,
        field: addField,
        option_key: optionKey
      }));
    });

  const base = clear ? [] : previous.filter((optionKey) => !removals.includes(optionKey));
  return dedupe([...base, ...additions]);
}

export function mergeEvents(previousSessionContext, structuredEvents = {}) {
  const warnings = [];
  const previousSelected = normalizeOptionKeys(previousSessionContext?.selected_options, 'selected_options', warnings);
  const previousRejected = normalizeOptionKeys(previousSessionContext?.rejected_options, 'rejected_options', warnings);
  const previousLocked = normalizeOptionKeys(previousSessionContext?.locked_targets, 'locked_targets', warnings);

  const selectedOptions = mergeAppendList({
    previous: previousSelected,
    add: structuredEvents.selected_options,
    remove: structuredEvents.unselected_options,
    clear: structuredEvents.clear_selected_options === true,
    addField: 'selected_options',
    removeField: 'unselected_options',
    warnings
  });
  const rejectedOptions = mergeAppendList({
    previous: previousRejected,
    add: structuredEvents.rejected_options,
    remove: structuredEvents.unrejected_options,
    clear: structuredEvents.clear_rejected_options === true,
    addField: 'rejected_options',
    removeField: 'unrejected_options',
    warnings
  });
  const lockedTargets = structuredEvents.clear_locked_targets === true
    ? []
    : Array.isArray(structuredEvents.locked_targets)
      ? normalizeOptionKeys(structuredEvents.locked_targets, 'locked_targets', warnings)
      : previousLocked;

  const appliedEvents = {
    selected_options: normalizeOptionKeys(structuredEvents.selected_options, 'selected_options', []),
    rejected_options: normalizeOptionKeys(structuredEvents.rejected_options, 'rejected_options', []),
    unselected_options: normalizeOptionKeys(structuredEvents.unselected_options, 'unselected_options', []),
    unrejected_options: normalizeOptionKeys(structuredEvents.unrejected_options, 'unrejected_options', []),
    locked_targets: Array.isArray(structuredEvents.locked_targets)
      ? normalizeOptionKeys(structuredEvents.locked_targets, 'locked_targets', [])
      : [],
    clear_selected_options: structuredEvents.clear_selected_options === true,
    clear_rejected_options: structuredEvents.clear_rejected_options === true,
    clear_locked_targets: structuredEvents.clear_locked_targets === true
  };

  return {
    selected_options: selectedOptions,
    rejected_options: rejectedOptions,
    locked_targets: lockedTargets,
    applied_events: appliedEvents,
    warnings,
    changed: Boolean(
      appliedEvents.selected_options.length ||
      appliedEvents.rejected_options.length ||
      appliedEvents.unselected_options.length ||
      appliedEvents.unrejected_options.length ||
      appliedEvents.locked_targets.length ||
      appliedEvents.clear_selected_options ||
      appliedEvents.clear_rejected_options ||
      appliedEvents.clear_locked_targets
    )
  };
}
