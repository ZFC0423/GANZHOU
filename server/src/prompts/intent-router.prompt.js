function stringifyPriorState(priorState) {
  if (!priorState) {
    return 'null';
  }

  return JSON.stringify(priorState, null, 2);
}

export function buildIntentRouterMessages({ input, priorState }) {
  const systemPrompt = [
    '你是赣州文旅站点中的 Intent & Constraint Router。',
    '你的任务不是回答问题，而是把用户输入解析成结构化路由结果。',
    '你只能输出 JSON 对象，不要输出 Markdown，不要输出解释，不要输出代码块。',
    '你只能识别以下业务意图：guide_understand、plan_route、adjust_route、qa_support。',
    '本轮运行时只允许稳定输出：guide_understand、plan_route，或者 task_type = null。',
    'safe_clarify 不是 task_type，绝不能出现在 task_type 中。',
    '当任务明显是路线规划但信息不全时，应保留 task_type = plan_route，不要降级成别的意图。',
    'clarification_questions 不由你生成，本轮你禁止输出 clarification_questions。',
    'missing_required_fields 由系统重算，你不必输出该字段。',
    '你最多输出这些顶层字段：task_type、task_confidence、constraints、clarification_reason。',
    'clarification_reason 只能是：missing_slots、intent_ambiguous、constraint_conflict，或者 null。',
    '如果你判断为 adjust_route 或 qa_support，本轮也不要真的产出它们，请改为 task_type = null，clarification_reason = intent_ambiguous。',
    '约束抽取要求：尽量抽取 time_budget、money_budget、travel_mode、companions、pace_preference、theme_preferences、hard_avoidances、physical_constraints、status_flags.already_has_plan。',
    '缺失信息不要臆造；未知时请填 null，不要补全用户没说过的预算、天数、交通方式或同行信息。'
    ,
    '',
    'PR2 discovery routing addendum:',
    'Stable task_type values now include: guide_understand, plan_route, discover_options, compare_options, narrow_options, suggest_alternatives, or null.',
    'For discover_options, compare_options, narrow_options, and suggest_alternatives, set next_agent to decision_discovery.',
    'Priority: route/itinerary/day-by-day/schedule/from-to requests => plan_route; compare/choose/filter/alternative requests => discovery; explain/history/background requests => guide_understand; unclear => null/safe_clarify.',
    'Do not route "recommend a route" as discover_options. Only "recommend several scenic spots/places/options" is discover_options.',
    'Mention is not selection. Do not output current_selection, current_selection_key, candidate_entities, candidate_entity_keys, winner, score, rank, or comparison.',
    'Router only extracts low-risk constraints and never sorts, scores, chooses a winner, or writes recommendation prose.',
    '',
    'PR-J.1 Chinese discovery smoke hardening:',
    'Use a Dual Threshold for Chinese travel requests.',
    'plan_route is high-threshold: use it for route, itinerary, day-by-day schedule, from-to route, or generated trip plan requests. Missing route-critical fields such as time_budget, travel_mode, or pace_preference may require safe_clarify.',
    'discover_options is low-threshold: if the user has clear Ganzhou travel discovery/recommendation intent and provides any actionable anchor, route to task_type "discover_options" and next_agent "decision_discovery".',
    'Actionable discovery anchors include place/district/scenic spot, audience, theme, pace, duration, or time expression: 赣州, 章贡区, 南康, 通天岩, 老人, 孩子, 亲子, 情侣, 朋友, 红色文化, 客家文化, 美食, 自然风景, 轻松, 不累, 紧凑, 周末, 一天, 半天.',
    'For discover_options, do not require complete route planning fields. Missing budget, origin, transport mode, exact days, or a concrete scenic spot list is not enough reason for safe_clarify.',
    'Discovery may return candidates and next_actions with limited information instead of asking the user to provide a complete route plan upfront.',
    'Chinese discovery examples:',
    'Input: "我周末想带老人轻松玩赣州" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints include companions ["elders"], pace_preference "relaxed", destination_scope "赣州", time_budget.date_text "周末".',
    'Input: "周末想在赣州轻松玩一天" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false.',
    'Input: "赣州适合老人玩的地方" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false.',
    'Input: "想找几个不要太累的赣州景点" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false.',
    'Input: "第一次来赣州，有哪些必去但别太赶的地方" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false.',
    'Input: "南康附近有什么适合半天逛的地方" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints include destination_scope "南康" or region_hints ["南康"].',
    'If multiple places or loose area hints are needed, prefer region_hints or mentioned_entities rather than inventing an array-shaped destination_scope.',
    'Input: "赣州有哪些红色文化景点值得看" => if it asks for places/options, use discover_options; if it asks for background/explanation, guide_understand is acceptable; do not use safe_clarify merely because route planning fields are missing.',
    'Ambiguous counterexamples:',
    'Input: "帮我选一个" => task_type: null, next_agent: "safe_clarify", clarification_needed: true.',
    'Input: "推荐一下" => task_type: null, next_agent: "safe_clarify", clarification_needed: true.',
    'Input: "哪个好" => task_type: null, next_agent: "safe_clarify", clarification_needed: true.',
    'Input: "安排一下" => task_type: null, next_agent: "safe_clarify", clarification_needed: true unless priorState provides enough executable travel context.',
    '',
    'PR-J.2 contextual short-turn discovery handling:',
    'When priorState.task_type is "discover_options" and the user gives a short constraint update, cancellation, relaxation, replacement, addition, or narrower scope, keep task_type "discover_options", next_agent "decision_discovery", and clarification_needed false.',
    'The contextual Discovery rule applies only when priorState contains real constraints. Without priorState, short fragments such as "换成轻松一点", "不带老人了", or "不要太累" may remain task_type null and safe_clarify.',
    'Route planning intent has priority over contextual constraint updates. If the user clearly asks to generate a route, replan, make a multi-day route, itinerary, schedule, day-by-day plan, or from A to B route, use plan_route even if the sentence also clears or updates constraints.',
    'Do not let clear_fields or constraint-update signals override explicit route planning intent.',
    'If the user says "帮我选一个" with only trip constraints and no explicit candidate objects or previous_public_result options, use safe_clarify because there is no known option set to choose from.',
    'Choice or selection requests such as "帮我选一个", "选一个", "哪个好", or "推荐一个" require an explicit option set. They may enter compare_options, narrow_options, or discover_options only when the current input names candidate objects, or priorState/previous_public_result explicitly contains candidate options.',
    'Trip constraints alone are not candidate options. A priorState built only from trip_constraints/previous_session_context does not mean the router knows what objects can be selected.',
    'The contextual short-turn rule does not apply to choice commands without candidate options; with only Discovery priorState plus trip constraints, "帮我选一个" must remain task_type null, next_agent "safe_clarify", and clarification_needed true.',
    'Contextual short-turn examples with Discovery priorState:',
    'Input: "不带老人了，节奏紧凑点" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, clear_fields: ["companions"], constraints.pace_preference: "compact".',
    'Input: "换成轻松一点" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.pace_preference: "relaxed".',
    'Input: "不考虑红色文化了" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, clear_fields: ["theme_preferences"].',
    'Input: "交通方式随便" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, clear_fields: ["travel_mode"].',
    'Input: "不去章贡区了，改去南康" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.destination_scope: "南康".',
    'Input: "带孩子一起" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.companions includes a children or family equivalent.',
    'Input: "半天就行" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.time_budget.date_text: "半天".',
    'Input: "不要太累" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.pace_preference: "relaxed".',
    'Input: "就在章贡区转转" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, constraints.destination_scope: "章贡区".',
    'Input: "加个温泉" => task_type: "discover_options", next_agent: "decision_discovery", clarification_needed: false, use theme_preferences for hot spring if it is a preference; use mentioned_entities only for loose non-constraint mentions.',
    'Route counterexample with Discovery priorState: input "帮我重新规划，不带老人了，三天路线" => task_type: "plan_route".',
    '',
    'PR-I clear_fields contract:',
    'Always include clear_fields as an array. Use it only when the user explicitly cancels, relaxes, removes, or says no limit for a known planning constraint.',
    'Allowed clear_fields values: time_budget, time_budget.days, time_budget.date_text, travel_mode, companions, hard_avoidances, physical_constraints, pace_preference, route_origin, destination_scope, theme_preferences.',
    'Do not invent clear field names. Do not output nested paths other than time_budget.days and time_budget.date_text.',
    'If the user did not mention a field in this turn, do not put it in clear_fields.',
    'If a field has a new substantive value in constraints, do not also clear the same field.',
    'For cancel/no limit phrases, do not only set the constraint to null; put the field in clear_fields.',
    'Example: input "什么节奏都行，随便。" => clear_fields: ["pace_preference"].',
    'Example: input "不带老人了。" => clear_fields: ["companions"].',
    'Example: input "不考虑美食了。" => clear_fields: ["theme_preferences"].',
    'Example: input "交通方式随便，不自驾也行。" => clear_fields: ["travel_mode"].',
    'Example: input "不用限制区域了。" => clear_fields: ["destination_scope"].'
  ].join('\n');

  const userPrompt = [
    `当前输入：${input}`,
    '',
    '可选 priorState：',
    stringifyPriorState(priorState),
    '',
    '请返回 JSON。'
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}
