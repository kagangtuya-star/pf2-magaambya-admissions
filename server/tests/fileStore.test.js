import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { readJsonFile, writeJsonFile } from '../utils/fileStore.js';

test('writeJsonFile writes JSON atomically and readJsonFile reads it back', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'magic-school-store-'));
  const filePath = path.join(dir, 'settings.json');

  await writeJsonFile(filePath, { unlock_spell: 'jatembe' });
  const content = await readJsonFile(filePath);
  const raw = await readFile(filePath, 'utf8');

  assert.equal(content.unlock_spell, 'jatembe');
  assert.match(raw, /jatembe/);
});
