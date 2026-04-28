import test from 'node:test';
import assert from 'node:assert/strict';

import { assertMessagesContract } from '../src/services/ai/intent-router/extract.js';
import { buildIntentRouterMessages } from '../src/prompts/intent-router.prompt.js';

test('message protocol assertion: last message must be user', () => {
  assert.throws(
    () => {
      assertMessagesContract([
        { role: 'system', content: 'router system prompt' }
      ]);
    },
    (error) => {
      assert.equal(error.code, 'schema_violation');
      assert.match(error.message, /must end with a user message/i);
      return true;
    }
  );
});

test('message protocol assertion: assistant prefill must be blocked locally', () => {
  assert.throws(
    () => {
      assertMessagesContract([
        { role: 'system', content: 'router system prompt' },
        { role: 'user', content: '帮我安排周末路线' },
        { role: 'assistant', content: '{\"task_type\":\"plan_route\"}' }
      ]);
    },
    (error) => {
      assert.equal(error.code, 'schema_violation');
      assert.match(error.message, /assistant prefill/i);
      return true;
    }
  );
});

test('message protocol assertion: historical assistant messages remain allowed', () => {
  assert.doesNotThrow(() => {
    assertMessagesContract([
      { role: 'system', content: 'router system prompt' },
      { role: 'user', content: '先讲讲郁孤台' },
      { role: 'assistant', content: '这是历史回答' },
      { role: 'user', content: '再帮我排一个周末路线' }
    ]);
  });
});

test('intent router prompt documents clear_fields allowlist and examples', () => {
  const messages = buildIntentRouterMessages({
    input: 'anything',
    priorState: null
  });
  const systemPrompt = messages[0].content;

  assert.match(systemPrompt, /clear_fields/);
  assert.match(systemPrompt, /time_budget\.days/);
  assert.match(systemPrompt, /time_budget\.date_text/);
  assert.match(systemPrompt, /什么节奏都行，随便。/);
  assert.match(systemPrompt, /"pace_preference"/);
  assert.match(systemPrompt, /不带老人了。/);
  assert.match(systemPrompt, /"companions"/);
  assert.match(systemPrompt, /不考虑美食了。/);
  assert.match(systemPrompt, /"theme_preferences"/);
  assert.match(systemPrompt, /交通方式随便，不自驾也行。/);
  assert.match(systemPrompt, /"travel_mode"/);
  assert.match(systemPrompt, /不用限制区域了。/);
  assert.match(systemPrompt, /"destination_scope"/);
});
