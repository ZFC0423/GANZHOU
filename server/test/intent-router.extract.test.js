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

test('intent router prompt documents contextual short-turn discovery rules', () => {
  const messages = buildIntentRouterMessages({
    input: 'anything',
    priorState: {
      task_type: 'discover_options',
      constraints: {
        pace_preference: 'relaxed'
      }
    }
  });
  const systemPrompt = messages[0].content;

  assert.match(systemPrompt, /contextual short-turn discovery handling/);
  assert.match(systemPrompt, /priorState\.task_type is "discover_options"/);
  assert.match(systemPrompt, /keep task_type "discover_options"/);
  assert.match(systemPrompt, /Without priorState/);
  assert.match(systemPrompt, /Route planning intent has priority/);
  assert.match(systemPrompt, /Do not let clear_fields or constraint-update signals override explicit route planning intent/);
  assert.match(systemPrompt, /clear_fields: \["companions"\]/);
  assert.match(systemPrompt, /constraints\.pace_preference: "compact"/);
  assert.match(systemPrompt, /clear_fields: \["theme_preferences"\]/);
  assert.match(systemPrompt, /clear_fields: \["travel_mode"\]/);
  assert.match(systemPrompt, /constraints\.destination_scope: "南康"/);
  assert.match(systemPrompt, /constraints\.destination_scope: "章贡区"/);
  assert.match(systemPrompt, /constraints\.time_budget\.date_text: "半天"/);
  assert.match(systemPrompt, /use theme_preferences for hot spring/);
  assert.match(systemPrompt, /Route counterexample/);
  assert.match(systemPrompt, /"plan_route"/);
  assert.match(systemPrompt, /no explicit candidate objects or previous_public_result options/);
  assert.match(systemPrompt, /Choice or selection requests/);
  assert.match(systemPrompt, /require an explicit option set/);
  assert.match(systemPrompt, /Trip constraints alone are not candidate options/);
  assert.match(systemPrompt, /does not apply to choice commands without candidate options/);
  assert.match(systemPrompt, /"帮我选一个" must remain task_type null/);
});

test('intent router prompt documents chinese discovery dual threshold contract', () => {
  const messages = buildIntentRouterMessages({
    input: 'anything',
    priorState: null
  });
  const systemPrompt = messages[0].content;

  assert.match(systemPrompt, /Dual Threshold/);
  assert.match(systemPrompt, /plan_route is high-threshold/);
  assert.match(systemPrompt, /discover_options is low-threshold/);
  assert.match(systemPrompt, /do not require complete route planning fields/i);
  assert.match(systemPrompt, /Missing budget, origin, transport mode, exact days/);
  assert.match(systemPrompt, /我周末想带老人轻松玩赣州/);
  assert.match(systemPrompt, /周末想在赣州轻松玩一天/);
  assert.match(systemPrompt, /赣州适合老人玩的地方/);
  assert.match(systemPrompt, /想找几个不要太累的赣州景点/);
  assert.match(systemPrompt, /第一次来赣州，有哪些必去但别太赶的地方/);
  assert.match(systemPrompt, /南康附近有什么适合半天逛的地方/);
  assert.match(systemPrompt, /赣州有哪些红色文化景点值得看/);
  assert.match(systemPrompt, /do not use safe_clarify merely because route planning fields are missing/);
  assert.match(systemPrompt, /destination_scope "赣州"/);
  assert.match(systemPrompt, /prefer region_hints or mentioned_entities/);
  assert.match(systemPrompt, /rather than inventing an array-shaped destination_scope/);
  assert.match(systemPrompt, /帮我选一个/);
  assert.match(systemPrompt, /推荐一下/);
  assert.match(systemPrompt, /哪个好/);
  assert.match(systemPrompt, /安排一下/);
});
