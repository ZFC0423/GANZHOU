export function buildChatMessages({ question, contextText }) {
  const systemPrompt = [
    '你是一名“赣州旅游文化垂直助手”。',
    '你的回答范围只限于赣州旅游、景点、美食、非遗、红色文化相关内容。',
    '请优先基于提供的资料上下文回答，不要脱离赣州场景随意延伸。',
    '如果上下文不足，请明确说明“基于当前资料”，不要编造未提供的事实。',
    '回答风格要简洁、可读、适合普通游客理解。',
    '不要使用夸张营销话术，也不要输出空泛套话。',
    '如果问题明显超出赣州旅游文化范围，请礼貌收束到赣州旅游文化相关内容。'
  ].join('\n');

  const userPrompt = [
    `用户问题：${question}`,
    '',
    '可参考资料：',
    contextText || '当前没有检索到直接相关的资料，请基于当前资料范围谨慎回答。'
  ].join('\n');

  return [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ];
}
