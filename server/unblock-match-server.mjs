import http from 'http';

const PORT = 38763;

// FOLLOW_SOURCE_ORDER not set — uses Promise.any (race all sources, fastest wins)

// Initialize global state required by the unblock server's match function
global.source = (process.env.UNBLOCK_SOURCES || 'bodian,kugou,migu,qq,bilibili').split(',').filter(Boolean);
global.proxy = process.env.UNBLOCK_PROXY_URL ? new URL(process.env.UNBLOCK_PROXY_URL) : null;
global.cnrelay = process.env.UNBLOCK_CNRELAY || null;

/**
 * @param {number} id - Netease song ID
 * @param {string[]} sources - Source priority list
 * @returns {Promise<{url:string|null, source:string|null, br:number, size:number, errors:string[]}>}
 */
async function matchSong(id, sources) {
  const errors = [];
  try {
    const match = await import('@unblockneteasemusic/server');
    const effectiveSources = sources?.length ? sources : global.source || ['kugou', 'kuwo', 'migu', 'qq'];
    console.log(`[unblock-match] matching song ${id} with sources:`, effectiveSources);
    const result = await match.default(id, effectiveSources);
    if (result?.url) {
      console.log(`[unblock-match] matched: ${result.source} br:${result.br} size:${result.size}`);
    } else {
      console.log(`[unblock-match] no match found for song ${id}`);
    }
    return {
      url: result?.url || null,
      source: result?.source || null,
      br: result?.br || 0,
      size: result?.size || 0,
      errors,
    };
  } catch (e) {
    console.error(`[unblock-match] match error for song ${id}:`, e.message);
    errors.push(e.message);
    return { url: null, source: null, br: 0, size: 0, errors };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/match' && req.method === 'GET') {
    const id = Number(url.searchParams.get('id') || 0);
    const sourcesParam = url.searchParams.get('sources') || 'bodian,kugou,migu,qq,bilibili';
    const sources = sourcesParam.split(',').filter(Boolean);

    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing id parameter' }));
      return;
    }

    const result = await matchSong(id, sources);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sources: global.source }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[unblock-match] server running on http://127.0.0.1:${PORT}`);
  console.log(`[unblock-match] default sources: ${global.source.join(',')}`);
  // 预初始化：加载匹配模块 + 预热 DNS，避免首次匹配延迟
  try {
    const preload = await import('@unblockneteasemusic/server');
    console.log('[unblock-match] preload: module ready');
    if (typeof preload.default === 'function') {
      await preload.default(186016, global.source).catch(() => {});
      console.log('[unblock-match] preload: warmup done');
    }
  } catch (e) {
    console.log('[unblock-match] preload skipped:', e.message);
  }
});
