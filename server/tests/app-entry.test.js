import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldStartServer } from '../app.js';

test('shouldStartServer supports unix style paths', () => {
  assert.equal(shouldStartServer('/workspace/project/server/app.js'), true);
  assert.equal(shouldStartServer('server/app.js'), true);
});

test('shouldStartServer supports windows style paths', () => {
  assert.equal(shouldStartServer('E:\\Code\\js\\magic school-system\\server\\app.js'), true);
});

test('shouldStartServer rejects other entry files', () => {
  assert.equal(shouldStartServer('/workspace/project/server/router.js'), false);
  assert.equal(shouldStartServer(''), false);
});
