# server/src/services/ai/route-planner-agent/repair-policy.js

```js
// @ts-check

/** @typedef {import('./types.js').Action} Action */
/** @typedef {import('./types.js').ConstraintsSnapshot} ConstraintsSnapshot */
/** @typedef {import('./types.js').RevisionPublicPlan} RevisionPublicPlan */

import { buildInternalBasis } from './basis.js';
import { retrieveRouteCandidates } from './retrieve.js';
import { getCapacityTarget, scheduleRoute } from './schedule.js';

/**
 * @param {{
 *   constraintsSnapshot: ConstraintsSnapshot,
 *   mode: 'generate' | 'revise',
 *   previousPublicPlan?: RevisionPublicPlan | null,
 *   action?: Action | null,
 *   retrieve?: typeof retrieveRouteCandidates,
 *   scenicModel?: unknown,
 *   articleModel?: unknown
 * }} input
 */
export async function runRepairPolicy({
  constraintsSnapshot,
  mode,
  previousPublicPlan = null,
  action = null,
  retrieve = retrieveRouteCandidates,
  scenicModel,
  articleModel
}) {
  const retrievalResult = await retrieve({
    constraintsSnapshot,
    mode: 'expanded',
    scenicModel,
    articleModel
  });
  const internalBasis = buildInternalBasis({
    retrievalResult,
    capacityTarget: getCapacityTarget(constraintsSnapshot),
    degraded: true,
    diagnostics: ['primary_schedule_repaired_with_expanded_candidates']
  });
  const scheduleResult = scheduleRoute({
    constraintsSnapshot,
    internalBasis,
    mode,
    previousPublicPlan,
    action
  });

  internalBasis.capacity_target = scheduleResult.capacity_target;
  internalBasis.capacity_achieved = scheduleResult.capacity_achieved;

  return {
    retrievalResult,
    internalBasis,
    scheduleResult
  };
}
```

