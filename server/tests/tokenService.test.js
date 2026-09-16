import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signAdminToken,
  signAttemptToken,
  verifyToken,
} from '../services/tokenService.js';

test('signAdminToken returns a verifiable admin token', () => {
  const token = signAdminToken({ ttlSeconds: 60 });
  const payload = verifyToken(token);

  assert.equal(payload.role, 'admin');
  assert.ok(payload.exp > payload.iat);
});

test('signAttemptToken returns a verifiable attempt token', () => {
  const token = signAttemptToken({ attemptId: 'att_1', ttlSeconds: 60 });
  const payload = verifyToken(token);

  assert.equal(payload.role, 'public');
  assert.equal(payload.attempt_id, 'att_1');
});
