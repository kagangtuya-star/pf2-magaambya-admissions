const LOCAL_FILM = '/media/promo/magaambya-promo.webm';

function webUrl(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} 必须填写完整的 HTTP 或 HTTPS 链接。`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /['";]/.test(url.hostname))
    throw new Error(`${name} 必须填写不含用户名和密码的 HTTP 或 HTTPS 链接。`);
  return url;
}

export function bilibiliPlayerUrl(value) {
  const url = webUrl(value.startsWith('//') ? `https:${value}` : value, 'FILM_BILIBILI_URL');
  const player = new URL('https://player.bilibili.com/player.html');
  if (url.hostname === 'player.bilibili.com' && url.pathname === '/player.html') {
    for (const key of ['bvid', 'aid', 'cid', 'p', 'autoplay', 'muted', 'danmaku', 't', 'poster']) {
      if (url.searchParams.has(key)) player.searchParams.set(key, url.searchParams.get(key));
    }
  } else if (['www.bilibili.com', 'bilibili.com', 'm.bilibili.com'].includes(url.hostname)) {
    const match = /^\/video\/(BV[\da-zA-Z]{10}|av\d+)\/?$/.exec(url.pathname);
    if (!match) throw new Error('FILM_BILIBILI_URL 必须填写视频页面或外链播放器链接。');
    player.searchParams.set(match[1].startsWith('BV') ? 'bvid' : 'aid', match[1].replace(/^av/, ''));
  } else {
    throw new Error('FILM_BILIBILI_URL 仅支持 bilibili.com 的视频页面或 player.bilibili.com 的外链播放器。');
  }
  if (!/^BV[\da-zA-Z]{10}$/.test(player.searchParams.get('bvid') || '') && !/^\d+$/.test(player.searchParams.get('aid') || ''))
    throw new Error('FILM_BILIBILI_URL 缺少有效的 BV 号或 av 号。');
  const page = url.searchParams.get('p') || url.searchParams.get('page') || '1';
  if (!/^[1-9]\d*$/.test(page)) throw new Error('哔哩哔哩视频分 P 编号必须为正整数。');
  player.searchParams.set('p', page);
  if (!player.searchParams.has('autoplay')) player.searchParams.set('autoplay', '1');
  return player.href;
}

export function getFilmConfig(env = process.env) {
  const mode = (env.FILM_MODE || 'local').trim();
  if (mode === 'local') {
    const src = (env.FILM_LOCAL_URL || LOCAL_FILM).trim();
    if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u001f]/.test(src))
      throw new Error('FILM_LOCAL_URL 必须填写以单个 / 开头的本站视频路径。');
    return { mode, src };
  }
  if (mode === 'direct') return { mode, src: webUrl((env.FILM_DIRECT_URL || '').trim(), 'FILM_DIRECT_URL').href };
  if (mode === 'bilibili') {
    const src = (env.FILM_BILIBILI_URL || '').trim();
    if (!src) throw new Error('FILM_MODE=bilibili 时必须填写 FILM_BILIBILI_URL，不能只填写 FILM_DIRECT_URL。');
    return { mode, src: bilibiliPlayerUrl(src) };
  }
  throw new Error('FILM_MODE 只能填写 local、direct 或 bilibili。');
}

export function resolveFilmConfig(env = process.env) {
  try { return getFilmConfig(env); }
  catch (error) { return { mode: 'unavailable', error: error.message }; }
}
