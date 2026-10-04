import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { getFilmConfig, bilibiliPlayerUrl, resolveFilmConfig } from '../services/filmService.js';
import { createServer } from '../app.js';

const bvid = 'BV1B7411m7LV';

test('Film defaults to the local WebM and accepts a custom local path', () => {
  assert.deepEqual(getFilmConfig({}), { mode: 'local', src: '/media/promo/magaambya-promo.webm' });
  assert.equal(getFilmConfig({ FILM_LOCAL_URL: '/media/film.webm?v=2' }).src, '/media/film.webm?v=2');
});

test('Direct film URLs retain signed queries and do not depend on a WebM extension', () => {
  const src = 'https://cdn.example.com/video.mp4?signature=a%26b&expires=123';
  assert.deepEqual(getFilmConfig({ FILM_MODE: 'direct', FILM_DIRECT_URL: src }), { mode: 'direct', src });
});

test('Bilibili video pages convert BV and av IDs and preserve the selected part', () => {
  const bv = new URL(bilibiliPlayerUrl(`https://www.bilibili.com/video/${bvid}/?p=3&share_source=copy`));
  assert.equal(bv.origin, 'https://player.bilibili.com');
  assert.equal(bv.pathname, '/player.html');
  assert.equal(bv.searchParams.get('bvid'), bvid);
  assert.equal(bv.searchParams.get('p'), '3');
  assert.equal(bv.searchParams.get('autoplay'), '1');
  assert.equal(bv.searchParams.has('share_source'), false);
  const av = new URL(bilibiliPlayerUrl('https://www.bilibili.com/video/av123/'));
  assert.equal(av.searchParams.get('aid'), '123');
});

test('Bilibili iframe links accept legacy page and retain playback options', () => {
  const src = bilibiliPlayerUrl(`//player.bilibili.com/player.html?bvid=${bvid}&cid=123&page=2&autoplay=0&danmaku=0`);
  const url = new URL(src);
  assert.equal(url.searchParams.get('p'), '2');
  assert.equal(url.searchParams.get('cid'), '123');
  assert.equal(url.searchParams.get('autoplay'), '0');
  assert.equal(url.searchParams.get('danmaku'), '0');
  assert.equal(url.searchParams.has('page'), false);
});

test('The supplied academy video URL converts to the matching embedded player', () => {
  assert.deepEqual(getFilmConfig({
    FILM_MODE: 'bilibili',
    FILM_BILIBILI_URL: 'https://www.bilibili.com/video/BV1nAHn67Emp/',
  }), {
    mode: 'bilibili',
    src: 'https://player.bilibili.com/player.html?bvid=BV1nAHn67Emp&p=1&autoplay=1',
  });
});

test('A Bilibili link in the direct field reports the missing Bilibili field', () => {
  const env = { FILM_MODE: 'bilibili', FILM_DIRECT_URL: 'https://www.bilibili.com/video/BV1nAHn67Emp/' };
  assert.throws(() => getFilmConfig(env), /必须填写 FILM_BILIBILI_URL/);
  assert.equal(resolveFilmConfig(env).mode, 'unavailable');
});

test('Invalid film modes, paths, protocols and iframe hosts are rejected', () => {
  for (const env of [
    { FILM_MODE: 'unknown' },
    { FILM_LOCAL_URL: '//example.com/video.webm' },
    { FILM_LOCAL_URL: '/\\example.com/video.webm' },
    { FILM_MODE: 'direct' },
    { FILM_MODE: 'direct', FILM_DIRECT_URL: 'javascript:alert(1)' },
    { FILM_MODE: 'direct', FILM_DIRECT_URL: 'https://user:password@example.com/video.webm' },
    { FILM_MODE: 'direct', FILM_DIRECT_URL: "https://example.com';frame-src/video.webm" },
    { FILM_MODE: 'bilibili', FILM_BILIBILI_URL: 'https://example.com/player.html?aid=1' },
    { FILM_MODE: 'bilibili', FILM_BILIBILI_URL: 'https://player.bilibili.com/player.html' },
    { FILM_MODE: 'bilibili', FILM_BILIBILI_URL: `https://www.bilibili.com/video/${bvid}/?p=0` },
  ]) assert.throws(() => getFilmConfig(env));
});

async function fixture(t, values) {
  const keys = ['FILM_MODE', 'FILM_LOCAL_URL', 'FILM_DIRECT_URL', 'FILM_BILIBILI_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  const server = createServer();
  t.after(() => server.close());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

for (const [mode, values] of [
  ['local', {}],
  ['direct', { FILM_MODE: 'direct', FILM_DIRECT_URL: 'https://cdn.example.com/film.webm?signature=123' }],
  ['bilibili', { FILM_MODE: 'bilibili', FILM_BILIBILI_URL: `https://www.bilibili.com/video/${bvid}/?p=2` }],
]) {
  test(`Public film configuration and CSP match the ${mode} player`, async t => {
    const origin = await fixture(t, values);
    const response = await fetch(`${origin}/api/public/site`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.data.film, getFilmConfig(values));
    assert.equal(body.data.admin_passphrase, undefined);
    const policy = response.headers.get('content-security-policy');
    assert.match(policy, /script-src 'self'/);
    assert.ok(policy.includes(mode === 'direct' ? "media-src 'self' https://cdn.example.com;" : "media-src 'self';"));
    assert.ok(policy.includes(mode === 'bilibili' ? "frame-src 'self' https://player.bilibili.com;" : "frame-src 'self';"));
    assert.ok(!policy.includes('signature='));
  });
}

test('Invalid optional film configuration keeps the site and public settings available', async t => {
  const warnings = [];
  t.mock.method(console, 'warn', message => warnings.push(message));
  const origin = await fixture(t, { FILM_MODE: 'bilibili', FILM_BILIBILI_URL: '' });
  assert.equal((await fetch(`${origin}/`)).status, 200);
  const response = await fetch(`${origin}/api/public/site`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.film.mode, 'unavailable');
  assert.equal(body.data.film.src, undefined);
  assert.match(body.data.film.error, /必须填写 FILM_BILIBILI_URL/);
  assert.ok(warnings.some(message => message.includes('FILM_BILIBILI_URL')));
  assert.ok(!response.headers.get('content-security-policy').includes('https://player.bilibili.com'));
});
