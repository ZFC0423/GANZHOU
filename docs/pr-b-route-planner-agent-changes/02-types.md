# server/src/services/ai/route-planner-agent/types.js

```js
// @ts-check

export {};

/**
 * Shared structure types for route-planner-agent.
 * Runtime constants and enums remain in contracts.js.
 */

/** @typedef {typeof import('./contracts.js').ACTION_TYPES[number]} ActionType */
/** @typedef {typeof import('./contracts.js').TRAVEL_MODES[number]} TravelMode */
/** @typedef {typeof import('./contracts.js').PACE_PREFERENCES[number]} PacePreference */
/** @typedef {typeof import('./contracts.js').CANDIDATE_STATUS[keyof typeof import('./contracts.js').CANDIDATE_STATUS]} CandidateStatus */
/** @typedef {typeof import('./contracts.js').PLANNING_STATUS[keyof typeof import('./contracts.js').PLANNING_STATUS]} PlanningStatus */

/**
 * @typedef {{
 *   target_region_key?: string
 * }} FocusSameRegionPayload
 */

/**
 * @typedef {{
 *   type: ActionType,
 *   payload: FocusSameRegionPayload | Record<string, never>
 * }} Action
 */

/**
 * @typedef {{
 *   days: number
 * }} TimeBudget
 */

/**
 * @typedef {{
 *   time_budget: TimeBudget,
 *   travel_mode: TravelMode,
 *   pace_preference: PacePreference,
 *   theme_preferences: string[],
 *   companions: string[],
 *   hard_avoidances: string[],
 *   physical_constraints: string[],
 *   route_origin: string | null,
 *   destination_scope: string | null,
 *   family_friendly_only: boolean,
 *   same_region_only: boolean,
 *   focused_region_key: string | null,
 *   avoid_far_spots: boolean
 * }} ConstraintsSnapshot
 */

/**
 * @typedef {{
 *   trace_id: string,
 *   ip: string,
 *   user_agent: string
 * }} RequestMeta
 */

/**
 * @typedef {{
 *   duration_days: number,
 *   travel_mode: TravelMode,
 *   pace_preference: PacePreference,
 *   theme_preferences: string[]
 * }} RoutePositioning
 */

/**
 * @typedef {{
 *   total_days: number,
 *   total_items: number
 * }} RouteSummary
 */

/**
 * @typedef {{
 *   item_key: string,
 *   title: string,
 *   region_key: string,
 *   family_friendly: boolean
 * }} RouteItem
 */

/**
 * @typedef {{
 *   day_index: number,
 *   region_key: string,
 *   items: RouteItem[]
 * }} RouteDay
 */

/**
 * @typedef {{
 *   type: ActionType,
 *   label: string
 * }} AdjustmentOption
 */

/**
 * @typedef {{
 *   item_key: string,
 *   source_type: 'scenic' | 'article',
 *   title: string,
 *   region_key: string | null,
 *   matched_by: string[],
 *   score_rank: number
 * }} PublicBasisItem
 */

/**
 * @typedef {{
 *   source: string,
 *   items: PublicBasisItem[]
 * }} RouteBasis
 */

/**
 * @typedef {{
 *   status: 'applied' | 'rejected',
 *   reason_code: string | null,
 *   message: string,
 *   diagnostics: string[]
 * }} LastActionResult
 */

/**
 * @typedef {{
 *   version: number,
 *   fingerprint: string,
 *   parent_fingerprint: string | null,
 *   source: string,
 *   constraints_snapshot: ConstraintsSnapshot,
 *   last_action: Action | null,
 *   last_action_result: LastActionResult | null
 * }} PlanContext
 */

/**
 * @typedef {{
 *   task_type: 'plan_route',
 *   candidate_status: CandidateStatus,
 *   planning_status: PlanningStatus,
 *   route_positioning: RoutePositioning,
 *   summary: RouteSummary,
 *   days: RouteDay[],
 *   route_highlights: string[],
 *   adjustment_options: AdjustmentOption[],
 *   basis: RouteBasis,
 *   plan_context: PlanContext
 * }} PublicRoutePlan
 */

/** @typedef {Omit<PublicRoutePlan, 'plan_context'>} RevisionPublicPlan */

/**
 * @typedef {{
 *   item_key: string,
 *   source_type: 'scenic' | 'article',
 *   source_id: number,
 *   title: string,
 *   region_key: string | null,
 *   family_friendly: boolean,
 *   tags: string[],
 *   category_code: string,
 *   route_label: string,
 *   walking_intensity: string,
 *   recommend_flag: number,
 *   hot_score: number,
 *   matched_by: string[],
 *   score: number,
 *   direct_hit: boolean,
 *   is_route_item: boolean,
 *   record: unknown
 * }} CandidateRecord
 */

/**
 * @typedef {{
 *   mode: 'primary' | 'expanded',
 *   candidates: CandidateRecord[],
 *   scenic_candidates: CandidateRecord[],
 *   article_candidates: CandidateRecord[],
 *   diagnostics: string[]
 * }} RetrievalResult
 */

/**
 * @typedef {{
 *   source: string,
 *   retrieval_mode: 'primary' | 'expanded',
 *   candidates: CandidateRecord[],
 *   route_candidates: CandidateRecord[],
 *   public_items: PublicBasisItem[],
 *   diagnostics: string[],
 *   degraded: boolean,
 *   capacity_target: number,
 *   capacity_achieved: number
 * }} InternalBasis
 */

/**
 * @typedef {{
 *   item_key: string,
 *   title: string,
 *   region_key: string,
 *   family_friendly: boolean,
 *   original_day_index: number,
 *   original_item_index: number,
 *   recommend_flag: number,
 *   hot_score: number,
 *   internal_score: number,
 *   theme_match: number,
 *   layer: 'locked' | 'preferred' | 'replaceable'
 * }} Anchor
 */

/**
 * @typedef {{
 *   feasible: boolean,
 *   reason_code: string | null,
 *   days: RouteDay[],
 *   candidate_status: CandidateStatus,
 *   capacity_target: number,
 *   capacity_achieved: number,
 *   diagnostics: string[],
 *   degraded: boolean
 * }} ScheduleResult
 */

/**
 * @typedef {{
 *   task_type?: string | null,
 *   task_confidence?: number | null,
 *   clarification_needed?: boolean,
 *   clarification_reason?: string | null,
 *   missing_required_fields?: string[],
 *   clarification_questions?: string[],
 *   next_agent?: string | null,
 *   constraints?: {
 *     user_query?: string | null,
 *     time_budget?: { days?: number | null } | null,
 *     travel_mode?: TravelMode | null,
 *     pace_preference?: PacePreference | null,
 *     theme_preferences?: string[] | null,
 *     companions?: string[] | null,
 *     hard_avoidances?: string[] | null,
 *     physical_constraints?: string[] | null,
 *     route_origin?: string | null,
 *     destination_scope?: string | null
 *   } | null
 * }} RouterResultInput
 */

/**
 * @typedef {{
 *   routerResult?: RouterResultInput
 * }} GeneratePayload
 */

/**
 * @typedef {{
 *   previous_public_plan?: RevisionPublicPlan,
 *   previous_plan_context?: PlanContext,
 *   action?: Action
 * }} RevisePayload
 */
```

