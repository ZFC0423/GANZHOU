import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import app from '../src/app.js';

function makeRequest({ port, path = '/api/front/ai/discovery/query', body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            json: JSON.parse(data)
          });
        });
      }
    );

    request.on('error', reject);
    request.write(JSON.stringify(body));
    request.end();
  });
}

async function withServer(run) {
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();

  try {
    await run(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('discovery query returns router safe clarify without entering Discovery', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我选一个'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.next_agent, 'safe_clarify');
    assert.equal(response.json.data.clarification_needed, true);
    assert.equal(Object.hasOwn(response.json.data, 'ranked_options'), false);
  });
});

test('discovery query routes natural language discovery into Discovery contract', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '帮我推荐几个适合带老人去的景点'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(['ready', 'limited', 'empty', 'invalid'].includes(response.json.data.result_status));
    assert.ok(Array.isArray(response.json.data.ranked_options));
    assert.ok(response.json.data.decision_context);
  });
});

test('discovery query returns invalid Discovery-style response for unsupported next_agent', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      body: {
        user_query: '介绍郁孤台历史'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.result_status, 'invalid');
    assert.equal(response.json.data.warnings[0].code, 'unsupported_next_agent');
    assert.equal(response.json.data.task_type, 'discover_options');
  });
});

test('direct discovery endpoint remains available after discovery query integration', async () => {
  await withServer(async (port) => {
    const response = await makeRequest({
      port,
      path: '/api/front/ai/discovery',
      body: {
        task_type: 'discover_options',
        constraints: {
          option_limit: 2
        }
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.code, 200);
    assert.equal(response.json.data.task_type, 'discover_options');
    assert.ok(Array.isArray(response.json.data.ranked_options));
  });
});
