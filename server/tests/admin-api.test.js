import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from '../app.js';
import { SETTINGS_PATH, SUBMISSIONS_PATH } from '../constants.js';

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

async function createAdminToken(baseUrl) {
  const response = await fetch(`${baseUrl}/api/admin/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passphrase: 'change-me' }),
  });
  const body = await response.json();
  return body.data.admin_token;
}

async function seedSubmission(baseUrl) {
  const unlock = await fetch(`${baseUrl}/api/public/unlock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ spell: 'jatembe' }),
  });
  const unlockBody = await unlock.json();

  const response = await fetch(`${baseUrl}/api/public/submissions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${unlockBody.data.attempt_token}`,
    },
    body: JSON.stringify({
      player_name: 'Applicant',
      riddle_answers: { q1: 'B', q2: 'C', q3: 'A' },
      exam_answers: { e1: '答案一', e2: '答案二', e3: '答案三' },
    }),
  });

  return response.json();
}

test('POST /api/admin/session returns admin token', async () => {
  const { server, baseUrl } = await startTestServer();
  const response = await fetch(`${baseUrl}/api/admin/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passphrase: 'change-me' }),
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.ok(body.data.admin_token);
});

test('GET /api/admin/settings returns public configuration fields', async () => {
  const { server, baseUrl } = await startTestServer();
  const adminToken = await createAdminToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/admin/settings`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.data.unlock_spell, 'jatembe');
  assert.equal(body.data.admin_passphrase, undefined);
});

test('GET /api/admin/exam-content returns full content including correct_key', async () => {
  const { server, baseUrl } = await startTestServer();
  const adminToken = await createAdminToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/admin/exam-content`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const body = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.data.page1_riddles[0].correct_key, 'B');
});

test('PUT /api/admin/settings updates settings', async () => {
  const original = await readFile(SETTINGS_PATH, 'utf8');
  const { server, baseUrl } = await startTestServer();
  const adminToken = await createAdminToken(baseUrl);
  const response = await fetch(`${baseUrl}/api/admin/settings`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      unlock_spell: 'new-spell',
      submission_enabled: false,
      site_title: '新标题',
    }),
  });
  const body = await response.json();
  const saved = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'));

  server.close();
  await writeFile(SETTINGS_PATH, original, 'utf8');

  assert.equal(response.status, 200);
  assert.equal(body.data.unlock_spell, 'new-spell');
  assert.equal(saved.unlock_spell, 'new-spell');
});

test('GET /api/admin/submissions and GET /api/admin/submissions/:id expose saved entries', async () => {
  const original = await readFile(SUBMISSIONS_PATH, 'utf8');
  const { server, baseUrl } = await startTestServer();
  const adminToken = await createAdminToken(baseUrl);
  const created = await seedSubmission(baseUrl);

  const listResponse = await fetch(`${baseUrl}/api/admin/submissions`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const listBody = await listResponse.json();

  const detailResponse = await fetch(`${baseUrl}/api/admin/submissions/${created.data.submission_id}`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const detailBody = await detailResponse.json();

  server.close();
  await writeFile(SUBMISSIONS_PATH, original, 'utf8');

  assert.equal(listResponse.status, 200);
  assert.equal(listBody.data.items.length > 0, true);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.data.id, created.data.submission_id);
});

test('PATCH /api/admin/submissions/:id and GET /api/admin/stats work', async () => {
  const original = await readFile(SUBMISSIONS_PATH, 'utf8');
  const { server, baseUrl } = await startTestServer();
  const adminToken = await createAdminToken(baseUrl);
  const created = await seedSubmission(baseUrl);

  const patchResponse = await fetch(`${baseUrl}/api/admin/submissions/${created.data.submission_id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'reviewed',
      review_note: '内容完整',
    }),
  });
  const patchBody = await patchResponse.json();

  const statsResponse = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const statsBody = await statsResponse.json();

  server.close();
  await writeFile(SUBMISSIONS_PATH, original, 'utf8');

  assert.equal(patchResponse.status, 200);
  assert.equal(patchBody.data.status, 'reviewed');
  assert.equal(statsResponse.status, 200);
  assert.equal(statsBody.data.total_submissions >= 1, true);
});
