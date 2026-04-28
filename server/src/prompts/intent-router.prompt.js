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
