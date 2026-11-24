import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from '../app.js';
import { EXAM_CONTENT_PATH, SUBMISSIONS_PATH } from '../constants.js';

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
  const content = JSON.parse(await readFile(EXAM_CONTENT_PATH, 'utf8'));
  const { server, baseUrl } = await startTestServer();
  const attemptToken = await createAttemptToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/public/exam`, {
    headers: { authorization: `Bearer ${attemptToken}` },
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.page1_riddles, content.page1_riddles.map(({ correct_key, ...question }) => question));
  assert.deepEqual(body.data.page2_exam, content.page2_exam);
});

test('POST /api/public/riddles/verify validates the answer', async (t) => {
  const content = JSON.parse(await readFile(EXAM_CONTENT_PATH, 'utf8'));
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());
  const attemptToken = await createAttemptToken(baseUrl);
  for (const question of content.page1_riddles) {
    const response = await fetch(`${baseUrl}/api/public/riddles/verify`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${attemptToken}`,
      },
      body: JSON.stringify({ question_id: question.id, answer_key: question.correct_key }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.correct, true);
    assert.equal(body.data.question_id, question.id);
    assert.equal(body.data.progress.total, content.page1_riddles.length);
  }
});

test('POST /api/public/submissions persists a submission', async () => {
  const original = await readFile(SUBMISSIONS_PATH, 'utf8');
  const content = JSON.parse(await readFile(EXAM_CONTENT_PATH, 'utf8'));
  const riddleAnswers = Object.fromEntries(content.page1_riddles.map(q => [q.id, q.correct_key]));
  const examAnswers = Object.fromEntries(content.page2_exam.flatMap(g => g.questions).map(q => [q.id, `答案：${q.id}`]));
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
      player_contact: '  QQ：123456789  ',
      riddle_answers: riddleAnswers,
      exam_answers: examAnswers,
    }),
  });
  const body = await response.json();
  const saved = JSON.parse(await readFile(SUBMISSIONS_PATH, 'utf8'));

  server.close();
  await writeFile(SUBMISSIONS_PATH, original, 'utf8');

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(saved.items.length > 0, true);
  assert.equal(body.data.player_contact, 'QQ：123456789');
  const submission = saved.items.find(item => item.id === body.data.submission_id);
  assert.equal(submission.player_contact, 'QQ：123456789');
  assert.deepEqual(submission.riddle_answers, riddleAnswers);
  assert.deepEqual(submission.exam_answers, examAnswers);
  assert.deepEqual(submission.content_snapshot, content.page2_exam);
  assert.deepEqual(submission.score_snapshot, {
    objective_total: content.page1_riddles.length,
    objective_correct: content.page1_riddles.length,
  });
});

test('POST /api/public/submissions rejects missing, malformed and oversized contact details', async (t) => {
  const original = await readFile(SUBMISSIONS_PATH, 'utf8');
  const content = JSON.parse(await readFile(EXAM_CONTENT_PATH, 'utf8'));
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());
  const attemptToken = await createAttemptToken(baseUrl);
  const submission = {
    player_name: 'Applicant',
    riddle_answers: Object.fromEntries(content.page1_riddles.map(q => [q.id, q.correct_key])),
    exam_answers: Object.fromEntries(content.page2_exam.flatMap(g => g.questions).map(q => [q.id, 'Answer'])),
  };
  for (const contact of [undefined, null, '', ' \n ', 12345, [], {}, 'x'.repeat(201)]) {
    const response = await fetch(`${baseUrl}/api/public/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${attemptToken}` },
      body: JSON.stringify({ ...submission, player_contact: contact }),
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'INVALID_CONTACT');
  }
  assert.equal(await readFile(SUBMISSIONS_PATH, 'utf8'), original);
});
