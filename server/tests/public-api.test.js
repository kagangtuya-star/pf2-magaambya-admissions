import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from '../app.js';
import { SUBMISSIONS_PATH } from '../constants.js';

async function startTestServer() {
  const server = createServer();
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function createAttemptToken(baseUrl) {
  const response = await fetch(`${baseUrl}/api/public/unlock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ spell: 'jatembe' }),
  });
  const body = await response.json();
  return body.data.attempt_token;
}

test('POST /api/public/unlock returns attempt token for valid spell', async () => {
  const { server, baseUrl } = await startTestServer();
  const response = await fetch(`${baseUrl}/api/public/unlock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ spell: 'jatembe' }),
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.attempt_token);
});

test('GET /api/public/exam hides correct_key from clients', async () => {
  const { server, baseUrl } = await startTestServer();
  const attemptToken = await createAttemptToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/public/exam`, {
    headers: { authorization: `Bearer ${attemptToken}` },
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.page1_riddles[0].correct_key, undefined);
});

test('POST /api/public/riddles/verify validates the answer', async () => {
  const { server, baseUrl } = await startTestServer();
  const attemptToken = await createAttemptToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/public/riddles/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${attemptToken}`,
    },
    body: JSON.stringify({ question_id: 'q1', answer_key: 'B' }),
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.correct, true);
});

test('POST /api/public/submissions persists a submission', async () => {
  const original = await readFile(SUBMISSIONS_PATH, 'utf8');
  const { server, baseUrl } = await startTestServer();
  const attemptToken = await createAttemptToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/public/submissions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${attemptToken}`,
    },
    body: JSON.stringify({
      player_name: 'Applicant',
      riddle_answers: { q1: 'B', q2: 'C', q3: 'A' },
      exam_answers: { e1: '答案一', e2: '答案二', e3: '答案三' },
    }),
  });
  const body = await response.json();
  const saved = JSON.parse(await readFile(SUBMISSIONS_PATH, 'utf8'));

  server.close();
  await writeFile(SUBMISSIONS_PATH, original, 'utf8');

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(saved.items.length > 0, true);
});
